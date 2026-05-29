"""共享 pytest fixtures"""

import os
import subprocess
import sys

import pytest
from fastapi.testclient import TestClient

import server_fastapi


def _torch_available() -> bool:
    """检查 subprocess 能否导入真正的 torch（排除本地 app/torch/ 干扰）"""
    result = subprocess.run(
        [sys.executable, "-c", "import torch; print(torch.__version__)"],
        capture_output=True, text=True, timeout=10,
    )
    return result.returncode == 0 and bool(result.stdout.strip())


# 缓存结果，避免每个测试都跑一次 subprocess
_torch_available_cache: bool | None = None


def torch_available() -> bool:
    global _torch_available_cache
    if _torch_available_cache is None:
        _torch_available_cache = _torch_available()
    return _torch_available_cache


def pytest_collection_modifyitems(config, items):
    """自动跳过需要 torch 但环境没有 torch 的测试"""
    if torch_available():
        return

    skip = pytest.mark.skip(reason="PyTorch 未安装，运行 conda install pytorch 安装")
    for item in items:
        if item.get_closest_marker("requires_torch"):
            item.add_marker(skip)


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
    config.addinivalue_line("markers", "requires_torch: 需要 PyTorch subprocess 可用")
