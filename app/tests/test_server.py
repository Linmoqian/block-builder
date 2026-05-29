"""FastAPI 后端 API 端点测试"""

from server_fastapi import ALLOWED_FILES, block_print_map


class TestReadFile:
    def test_read_default_file(self, client, setup_tmpsrc):
        """读取默认文件 sample.py"""
        resp = client.get("/read-file")
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert "# test" in data["content"]

    def test_read_illegal_filename(self, client):
        """非法文件名应返回 400"""
        resp = client.get("/read-file", params={"file": "../etc/passwd"})
        assert resp.status_code == 400

    def test_read_illegal_extension(self, client):
        """非法扩展名应返回 400"""
        resp = client.get("/read-file", params={"file": "evil.exe"})
        assert resp.status_code == 400

    def test_read_nonexistent_file(self, client, setup_tmpsrc):
        """不存在的文件应返回 success=False"""
        resp = client.get("/read-file", params={"file": "nonexist.py"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is False


class TestDrag:
    def test_drag_add_block(self, client, setup_tmpsrc):
        """添加积木应返回 200 + status ok"""
        resp = client.post("/drag", json={
            "id": "block-1",
            "type": "square",
            "name": "正方形",
        })
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

        content = (setup_tmpsrc / "sample.py").read_text(encoding="utf-8")
        assert 'print("我是正方形")' in content

    def test_drag_duplicate_block_updates(self, client, setup_tmpsrc):
        """重复拖入同一积木应更新而非报错"""
        client.post("/drag", json={
            "id": "block-1",
            "type": "square",
            "name": "正方形",
        })
        resp = client.post("/drag", json={
            "id": "block-1",
            "type": "circle",
            "name": "圆形",
        })
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

        lines = (setup_tmpsrc / "sample.py").read_text(encoding="utf-8").strip().split("\n")
        assert any("我是圆形" in line for line in lines)

    def test_drag_unknown_type(self, client, setup_tmpsrc):
        """未知积木类型应返回 200，写入注释行"""
        resp = client.post("/drag", json={
            "id": "block-x",
            "type": "unknown-shape",
            "name": "神秘积木",
        })
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

        content = (setup_tmpsrc / "sample.py").read_text(encoding="utf-8")
        assert "未知积木" in content


class TestDelete:
    def test_delete_existing_block(self, client, setup_tmpsrc):
        """删除存在的积木应返回 200"""
        client.post("/drag", json={
            "id": "block-1",
            "type": "square",
            "name": "正方形",
        })
        resp = client.post("/delete", json={"id": "block-1", "name": "正方形"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

        assert "block-1" not in block_print_map

    def test_delete_nonexistent_block(self, client):
        """删除不存在的积木应返回 200"""
        resp = client.post("/delete", json={"id": "ghost", "name": "幽灵"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"


class TestRun:
    def test_run_illegal_filename(self, client):
        """运行非法文件名应返回 400"""
        resp = client.post("/run", params={"file": "../../etc/passwd"})
        assert resp.status_code == 400

    def test_run_not_allowed_file(self, client):
        """运行不在白名单中的合法文件名应返回 400"""
        resp = client.post("/run", params={"file": "hacked.py"})
        assert resp.status_code == 400

    def test_run_existing_file(self, client, setup_tmpsrc):
        """运行存在的 .py 文件应返回 stdout/stderr/returncode"""
        sample = setup_tmpsrc / "sample.py"
        sample.write_text('print("hello from test")\n', encoding="utf-8")

        resp = client.post("/run", params={"file": "sample.py"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert "hello from test" in data["stdout"]
        assert isinstance(data["returncode"], int)

    def test_run_network_file_not_found(self, client, setup_tmpsrc):
        """运行 network.py 但文件不存在时，subprocess 应失败"""
        resp = client.post("/run", params={"file": "network.py"})
        assert resp.status_code == 200
        data = resp.json()
        # subprocess 会执行但 python 找不到文件，returncode != 0
        assert data["returncode"] != 0


class TestExport:
    def test_export_code(self, client, setup_tmpsrc):
        """导出代码应返回 200 并创建 network.py"""
        code = "import torch\nprint('exported')\n"
        resp = client.post("/export", json={"code": code})
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

        exported = setup_tmpsrc / "network.py"
        assert exported.exists()
        assert exported.read_text(encoding="utf-8") == code


class TestExportYaml:
    def test_export_yaml(self, client, setup_tmpsrc):
        """导出 YAML 应返回 200 并创建 model.yaml"""
        yaml_content = "backbone:\n  - [-1, 1, Conv, [64, 3, 2]]\n"
        resp = client.post("/export-yaml", json={"yaml": yaml_content})
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

        exported = setup_tmpsrc / "model.yaml"
        assert exported.exists()
        assert exported.read_text(encoding="utf-8") == yaml_content


class TestConnect:
    def test_connect(self, client):
        """连线应返回 200 + status ok"""
        resp = client.post("/connect", json={"from_": "block-1", "to": "block-2"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"


class TestUnknownRoutes:
    def test_get_unknown(self, client):
        """GET 未知路径应返回 404"""
        resp = client.get("/nonexistent")
        assert resp.status_code == 404

    def test_post_unknown(self, client):
        """POST 未知路径应返回 404"""
        resp = client.post("/nonexistent", json={})
        assert resp.status_code == 404
