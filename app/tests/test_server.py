"""FastAPI 后端 API 端点测试"""

import os
import shutil

import pytest
from fastapi.testclient import TestClient

from server_fastapi import ALLOWED_FILES, TMPSRC_DIR, app, block_print_map

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_tmpsrc(tmp_path, monkeypatch):
    """每个测试用例前创建干净的 TmpSrc 目录和 sample.py"""
    # 把 TMPSRC_DIR 重定向到临时目录，避免污染项目文件
    monkeypatch.setattr("server_fastapi.TMPSRC_DIR", str(tmp_path))

    sample = tmp_path / "sample.py"
    sample.write_text("# test\n", encoding="utf-8")

    # 清空全局积木映射
    block_print_map.clear()

    yield tmp_path

    # 清理
    block_print_map.clear()


# ── GET /read-file ──────────────────────────────────────────────


class TestReadFile:
    def test_read_default_file(self, setup_tmpsrc):
        """读取默认文件 sample.py"""
        resp = client.get("/read-file")
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert "# test" in data["content"]

    def test_read_illegal_filename(self):
        """非法文件名应返回 400"""
        resp = client.get("/read-file", params={"file": "../etc/passwd"})
        assert resp.status_code == 400

    def test_read_illegal_extension(self):
        """非法扩展名应返回 400"""
        resp = client.get("/read-file", params={"file": "evil.exe"})
        assert resp.status_code == 400

    def test_read_nonexistent_file(self, setup_tmpsrc):
        """不存在的文件应返回 success=False"""
        resp = client.get("/read-file", params={"file": "nonexist.py"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is False


# ── POST /drag ──────────────────────────────────────────────────


class TestDrag:
    def test_drag_add_block(self, setup_tmpsrc):
        """添加积木应返回 200 + status ok"""
        resp = client.post("/drag", json={
            "id": "block-1",
            "type": "square",
            "name": "正方形",
        })
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

        # 验证 sample.py 被追加了内容
        content = (setup_tmpsrc / "sample.py").read_text(encoding="utf-8")
        assert 'print("我是正方形")' in content

    def test_drag_duplicate_block_updates(self, setup_tmpsrc):
        """重复拖入同一积木应更新而非报错"""
        # 第一次拖入
        client.post("/drag", json={
            "id": "block-1",
            "type": "square",
            "name": "正方形",
        })
        # 第二次拖入同 ID
        resp = client.post("/drag", json={
            "id": "block-1",
            "type": "circle",
            "name": "圆形",
        })
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

        lines = (setup_tmpsrc / "sample.py").read_text(encoding="utf-8").strip().split("\n")
        # 原来的 square 行被替换为 circle 行，总共 2 行（# test + circle）
        assert any("我是圆形" in line for line in lines)


# ── POST /delete ────────────────────────────────────────────────


class TestDelete:
    def test_delete_existing_block(self, setup_tmpsrc):
        """删除存在的积木应返回 200"""
        client.post("/drag", json={
            "id": "block-1",
            "type": "square",
            "name": "正方形",
        })
        resp = client.post("/delete", json={"id": "block-1", "name": "正方形"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

        # 积木映射中应不再存在
        assert "block-1" not in block_print_map

    def test_delete_nonexistent_block(self):
        """删除不存在的积木应返回 200（不报错）"""
        resp = client.post("/delete", json={"id": "ghost", "name": "幽灵"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"


# ── POST /run ───────────────────────────────────────────────────


class TestRun:
    def test_run_illegal_filename(self):
        """运行非法文件名应返回 400"""
        resp = client.post("/run", params={"file": "../../etc/passwd"})
        assert resp.status_code == 400

    def test_run_not_allowed_file(self):
        """运行不在白名单中的合法文件名应返回 400"""
        resp = client.post("/run", params={"file": "hacked.py"})
        assert resp.status_code == 400

    def test_run_existing_file(self, setup_tmpsrc):
        """运行存在的 .py 文件应返回 stdout/stderr/returncode"""
        # 写入一个简单的脚本
        sample = setup_tmpsrc / "sample.py"
        sample.write_text('print("hello from test")\n', encoding="utf-8")

        resp = client.post("/run", params={"file": "sample.py"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert "hello from test" in data["stdout"]
        assert isinstance(data["returncode"], int)


# ── POST /export ────────────────────────────────────────────────


class TestExport:
    def test_export_code(self, setup_tmpsrc):
        """导出代码应返回 200 并创建 network.py"""
        code = "import torch\nprint('exported')\n"
        resp = client.post("/export", json={"code": code})
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

        exported = setup_tmpsrc / "network.py"
        assert exported.exists()
        assert exported.read_text(encoding="utf-8") == code


# ── POST /export-yaml ──────────────────────────────────────────


class TestExportYaml:
    def test_export_yaml(self, setup_tmpsrc):
        """导出 YAML 应返回 200 并创建 model.yaml"""
        yaml_content = "backbone:\n  - [-1, 1, Conv, [64, 3, 2]]\n"
        resp = client.post("/export-yaml", json={"yaml": yaml_content})
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

        exported = setup_tmpsrc / "model.yaml"
        assert exported.exists()
        assert exported.read_text(encoding="utf-8") == yaml_content


# ── POST /connect ───────────────────────────────────────────────


class TestConnect:
    def test_connect(self):
        """连线应返回 200 + status ok"""
        resp = client.post("/connect", json={"from_": "block-1", "to": "block-2"})
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"


# ── 未知路径 ────────────────────────────────────────────────────


class TestUnknownRoutes:
    def test_get_unknown(self):
        """GET 未知路径应返回 404"""
        resp = client.get("/nonexistent")
        assert resp.status_code == 404

    def test_post_unknown(self):
        """POST 未知路径应返回 404"""
        resp = client.post("/nonexistent", json={})
        assert resp.status_code == 404
