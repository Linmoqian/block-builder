"""端到端流水线测试：export → read-back → validate → run"""


class TestPipeline:
    def test_export_then_read_back(self, client, setup_tmpsrc):
        """导出代码后应能通过 read-file 读回"""
        code = "import torch\nprint('pipeline test')\n"
        client.post("/export", json={"code": code})

        resp = client.get("/read-file", params={"file": "network.py"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["content"] == code

    def test_yaml_export_then_read_back(self, client, setup_tmpsrc):
        """导出 YAML 后应能通过 read-file 读回"""
        yaml_content = "backbone:\n  - [-1, 1, Conv, [64, 3, 2]]\n"
        client.post("/export-yaml", json={"yaml": yaml_content})

        resp = client.get("/read-file", params={"file": "model.yaml"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["content"] == yaml_content

    def test_export_validate_run(self, client, setup_tmpsrc):
        """完整流水线：导出代码 → 验证模型 → 运行文件"""
        code = """import torch
import torch.nn as nn

class CustomModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.conv = nn.Conv2d(3, 8, 1)

    def forward(self, x):
        return self.conv(x)
"""
        # 1. Export
        resp = client.post("/export", json={"code": code})
        assert resp.json()["status"] == "ok"

        # 2. Validate
        resp = client.post("/validate-model", json={"code": code})
        data = resp.json()
        assert data["valid"] is True
        assert isinstance(data["param_count"], int)
        assert data["param_count"] > 0

        # 3. Run the exported file
        resp = client.post("/run", params={"file": "network.py"})
        assert resp.status_code == 200
        run_data = resp.json()
        assert run_data["status"] == "ok"
        assert run_data["returncode"] == 0

    def test_invalid_model_fails_validation(self, client):
        """通道数不匹配的模型应验证失败"""
        code = """import torch
import torch.nn as nn

class CustomModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.conv1 = nn.Conv2d(3, 16, 3, padding=1)
        self.conv2 = nn.Conv2d(8, 32, 3, padding=1)  # 输入 8 通道，但 conv1 输出 16

    def forward(self, x):
        x = self.conv1(x)
        return self.conv2(x)
"""
        resp = client.post("/validate-model", json={"code": code})
        data = resp.json()
        assert data["valid"] is False
        assert data["error"] is not None

    def test_yaml_export_overwrites_previous(self, client, setup_tmpsrc):
        """多次导出应覆盖而非追加"""
        client.post("/export-yaml", json={"yaml": "old: data\n"})
        client.post("/export-yaml", json={"yaml": "new: data\n"})

        resp = client.get("/read-file", params={"file": "model.yaml"})
        content = resp.json()["content"]
        assert "new:" in content
        assert "old:" not in content
