"""训练相关端点测试：/train, /train-status, /train-stop, /train-history"""

import os

import pytest

import server_fastapi


class TestTrainStatus:
    def test_status_idle_by_default(self, client):
        """默认状态应为 idle"""
        resp = client.get("/train-status")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "idle"
        assert data["log"] == ""

    def test_status_reads_log_file(self, client, setup_tmpsrc):
        """应能读取 train_log.txt 内容"""
        log_path = setup_tmpsrc / "train_log.txt"
        log_path.write_text("Epoch 1/10\n", encoding="utf-8")

        resp = client.get("/train-status")
        data = resp.json()
        assert "Epoch 1/10" in data["log"]


class TestTrainStop:
    def test_stop_when_idle(self, client):
        """空闲时停止应返回 200"""
        resp = client.post("/train-stop")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"


class TestTrainStart:
    def test_rejects_when_already_running(self, client, monkeypatch):
        """训练进行中时应返回 409"""
        monkeypatch.setattr(server_fastapi, "training_status", "running")

        resp = client.post("/train", json={"model": "yolov8n.yaml", "epochs": 1})
        assert resp.status_code == 409

    def test_custom_model_requires_yaml(self, client, setup_tmpsrc):
        """custom 模式但无 model.yaml 应返回 400"""
        resp = client.post("/train", json={"model": "custom", "epochs": 1})
        assert resp.status_code == 400

    def test_worker_missing(self, client, setup_tmpsrc):
        """无 _train_worker.py 应返回 500"""
        # 不创建 worker 文件
        resp = client.post("/train", json={"model": "yolov8n.yaml", "epochs": 1})
        assert resp.status_code == 500


class TestTrainHistory:
    def test_empty_history(self, client, synthetic_runs_dir):
        """无训练历史应返回空列表"""
        resp = client.get("/train-history")
        assert resp.status_code == 200
        data = resp.json()
        assert data["runs"] == []

    def test_history_with_synthetic_run(self, client, synthetic_runs_dir):
        """伪造训练目录应被正确解析"""
        run_dir = synthetic_runs_dir / "train_exp1"
        run_dir.mkdir()
        weights_dir = run_dir / "weights"
        weights_dir.mkdir()
        (weights_dir / "best.pt").write_bytes(b"fake")
        (run_dir / "args.yaml").write_text(
            "model: yolov8n.yaml\nepochs: 10\ndata: coco128.yaml\nimgsz: 128\n",
            encoding="utf-8",
        )

        resp = client.get("/train-history")
        data = resp.json()
        assert len(data["runs"]) == 1
        run = data["runs"][0]
        assert run["name"] == "train_exp1"
        assert run["has_weights"] is True
        assert run["model"] == "yolov8n.yaml"
        assert run["epochs"] == 10

    def test_history_without_weights(self, client, synthetic_runs_dir):
        """无 best.pt 的训练目录应标记 has_weights=False"""
        run_dir = synthetic_runs_dir / "train_no_weights"
        run_dir.mkdir()

        resp = client.get("/train-history")
        data = resp.json()
        assert len(data["runs"]) == 1
        assert data["runs"][0]["has_weights"] is False

    def test_history_multiple_runs(self, client, synthetic_runs_dir):
        """多个训练目录应都被返回"""
        for name in ["exp1", "exp2", "exp3"]:
            (synthetic_runs_dir / name).mkdir()

        resp = client.get("/train-history")
        data = resp.json()
        assert len(data["runs"]) == 3
