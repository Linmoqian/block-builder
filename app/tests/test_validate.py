"""POST /validate-model 端点测试"""

import pytest

pytestmark = pytest.mark.requires_torch


class TestValidateModel:
    def test_validate_valid_model(self, client, sample_pytorch_code):
        """有效 PyTorch 代码应返回 valid=True 和参数计数"""
        resp = client.post("/validate-model", json={"code": sample_pytorch_code})
        assert resp.status_code == 200
        data = resp.json()
        assert data["valid"] is True
        assert isinstance(data["param_count"], int)
        assert data["param_count"] > 0
        assert data["error"] is None

    def test_validate_detects_param_count(self, client):
        """已知模型参数量：Conv2d(3, 16, 3, padding=1) + BN(16)"""
        code = """import torch
import torch.nn as nn

class CustomModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.conv1 = nn.Conv2d(3, 16, 3, padding=1)
        self.bn1 = nn.BatchNorm2d(16)

    def forward(self, x):
        return self.bn1(self.conv1(x))
"""
        resp = client.post("/validate-model", json={"code": code})
        data = resp.json()
        assert data["valid"] is True
        # Conv2d: 3*16*3*3=432 weight + 16 bias = 448
        # BN: 16 weight + 16 bias = 32
        assert data["param_count"] == 480

    def test_validate_invalid_syntax(self, client):
        """语法错误应返回 valid=False"""
        resp = client.post("/validate-model", json={"code": "import torch\nthis is not valid python"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["valid"] is False

    def test_validate_runtime_error(self, client):
        """运行时错误应返回 valid=False"""
        code = """import torch
import torch.nn as nn

class CustomModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.conv = nn.Conv2d(999, 999, 999)

    def forward(self, x):
        return self.conv(x)
"""
        resp = client.post("/validate-model", json={"code": code})
        data = resp.json()
        assert data["valid"] is False
        assert data["error"] is not None

    def test_validate_strips_main_block(self, client):
        """已有 __main__ block 应被替换为验证 harness"""
        code = """import torch
import torch.nn as nn

class CustomModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.conv = nn.Conv2d(3, 8, 1)

    def forward(self, x):
        return self.conv(x)

if __name__ == "__main__":
    print("this should be stripped")
    raise RuntimeError("original main should not run")
"""
        resp = client.post("/validate-model", json={"code": code})
        data = resp.json()
        assert data["valid"] is True
        assert "VALIDATION_OK" in data["summary"]

    def test_validate_output_shape_reported(self, client, sample_pytorch_code):
        """有效模型应报告 output_shape"""
        resp = client.post("/validate-model", json={"code": sample_pytorch_code})
        data = resp.json()
        assert data["valid"] is True
        assert data["output_shape"] is not None
        assert "torch.Size" in data["output_shape"]

    @pytest.mark.slow
    def test_validate_timeout(self, client):
        """无限循环代码应触发超时"""
        code = """import torch
import torch.nn as nn

class CustomModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.conv = nn.Conv2d(3, 8, 1)

    def forward(self, x):
        while True:
            pass
        return x
"""
        resp = client.post("/validate-model", json={"code": code})
        data = resp.json()
        assert data["valid"] is False
