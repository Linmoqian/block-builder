"""推理端点测试：/inference"""


class TestInference:
    def test_inference_no_runs(self, client, tmp_path, monkeypatch):
        """无 runs 目录应返回 404"""
        monkeypatch.setattr("server_fastapi.RUNS_DIR", str(tmp_path / "nonexistent"))

        resp = client.post("/inference")
        assert resp.status_code == 404

    def test_inference_no_weights(self, client, synthetic_runs_dir):
        """有目录但无 best.pt 应返回 404"""
        (synthetic_runs_dir / "exp1").mkdir()

        resp = client.post("/inference")
        assert resp.status_code == 404
