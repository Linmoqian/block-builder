"""共享 pytest fixtures"""

import os

import pytest
from fastapi.testclient import TestClient

import server_fastapi


@pytest.fixture(autouse=True)
def setup_tmpsrc(tmp_path, monkeypatch):
    """每个测试前重定向文件目录到临时目录，清空全局状态"""
    monkeypatch.setattr("server_fastapi.TMPSRC_DIR", str(tmp_path))
    monkeypatch.setattr(
        "server_fastapi.TRAIN_LOG_PATH",
        os.path.join(str(tmp_path), "train_log.txt"),
    )
    monkeypatch.setattr(
        "server_fastapi.INFERENCE_LOG_PATH",
        os.path.join(str(tmp_path), "inference_log.txt"),
    )

    sample = tmp_path / "sample.py"
    sample.write_text("# test\n", encoding="utf-8")

    server_fastapi.block_print_map.clear()
    server_fastapi.training_status = "idle"
    server_fastapi.training_process = None

    yield tmp_path

    server_fastapi.block_print_map.clear()
    server_fastapi.training_status = "idle"
    server_fastapi.training_process = None


@pytest.fixture()
def client():
    return TestClient(server_fastapi.app)


@pytest.fixture()
def sample_pytorch_code():
    """最小可运行 PyTorch 模型"""
    return """import torch
import torch.nn as nn

class CustomModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.conv1 = nn.Conv2d(3, 16, 3, padding=1)
        self.bn1 = nn.BatchNorm2d(16)

    def forward(self, x):
        x = self.conv1(x)
        x = self.bn1(x)
        return x
"""


@pytest.fixture()
def sample_yaml_content():
    return """backbone:
  - [-1, 1, Conv, [32, 3, 2]]

head:
  - [-1, 1, Detect, [80]]
"""


@pytest.fixture()
def synthetic_runs_dir(tmp_path, monkeypatch):
    """伪造 runs/detect 目录结构"""
    runs = tmp_path / "runs" / "detect"
    runs.mkdir(parents=True)
    monkeypatch.setattr("server_fastapi.RUNS_DIR", str(tmp_path / "runs"))
    return runs


def pytest_configure(config):
    config.addinivalue_line("markers", "slow: 耗时 >5s，需要真实训练或长时间 subprocess")
    config.addinivalue_line("markers", "integration: 需要 ultralytics + 数据集")
