"""PyTorch 辅助类模板验证：通过 /validate-model 验证每个模块可实例化"""

import pytest

HEADER = "import torch\nimport torch.nn as nn\n\n"


def _wrap(helper_classes: str, model_body: str) -> str:
    """拼接辅助类 + CustomModel 为完整的可验证代码"""
    return HEADER + helper_classes + "\n\nclass CustomModel(nn.Module):\n" + model_body


C2F_CLASS = """class C2f(nn.Module):
    def __init__(self, c1, c2, n=1):
        super().__init__()
        self.cv1 = nn.Conv2d(c1, c2, 1)
        self.cv2 = nn.Conv2d(c2 * (n + 2), c2, 1)
        self.bottlenecks = nn.ModuleList([
            nn.Sequential(nn.Conv2d(c2 // 2, c2 // 2, 3, padding=1), nn.BatchNorm2d(c2 // 2), nn.SiLU())
            for _ in range(n)
        ])

    def forward(self, x):
        y = list(self.cv1(x).chunk(2, 1))
        for b in self.bottlenecks:
            y.append(b(y[-1]))
        return self.cv2(torch.cat(y, 1))"""

SPPF_CLASS = """class SPPF(nn.Module):
    def __init__(self, c1, c2, k=5):
        super().__init__()
        c_ = c1 // 2
        self.cv1 = nn.Conv2d(c1, c_, 1)
        self.cv2 = nn.Conv2d(c_ * 4, c2, 1)
        self.pool = nn.MaxPool2d(k, 1, k // 2)

    def forward(self, x):
        y = [self.cv1(x)]
        y.extend(self.pool(y[-1]) for _ in range(3))
        return self.cv2(torch.cat(y, 1))"""

CBAM_CLASS = """class CBAM(nn.Module):
    def __init__(self, c, reduction=16):
        super().__init__()
        self.avg_pool = nn.AdaptiveAvgPool2d(1)
        self.max_pool = nn.AdaptiveMaxPool2d(1)
        self.fc = nn.Sequential(nn.Linear(c, c // reduction), nn.ReLU(), nn.Linear(c // reduction, c))
        self.conv = nn.Conv2d(2, 1, 7, padding=3)

    def forward(self, x):
        b, c, _, _ = x.size()
        avg_out = self.fc(self.avg_pool(x).view(b, c))
        max_out = self.fc(self.max_pool(x).view(b, c))
        att = torch.sigmoid(avg_out + max_out).view(b, c, 1, 1)
        x = x * att
        avg_out = torch.mean(x, 1, keepdim=True)
        max_out, _ = torch.max(x, 1, keepdim=True)
        spatial = torch.sigmoid(self.conv(torch.cat([avg_out, max_out], 1)))
        return x * spatial"""

C3K2_CLASS = """class C3k2(nn.Module):
    def __init__(self, c1, c2, n=1, c3k=False, e=0.5):
        super().__init__()
        c_ = max(1, int(c2 * e))
        self.cv1 = nn.Conv2d(c1, 2 * c_, 1)
        self.cv2 = nn.Conv2d((2 + n) * c_, c2, 1)
        if c3k:
            self.m = nn.ModuleList([
                nn.Sequential(nn.Conv2d(c_, c_, 3, padding=1, bias=False), nn.BatchNorm2d(c_), nn.SiLU(),
                              nn.Conv2d(c_, c_, 3, padding=1, bias=False), nn.BatchNorm2d(c_), nn.SiLU())
                for _ in range(n)
            ])
        else:
            self.m = nn.ModuleList([
                nn.Sequential(nn.Conv2d(c_, c_, 3, padding=1, bias=False), nn.BatchNorm2d(c_), nn.SiLU())
                for _ in range(n)
            ])

    def forward(self, x):
        y = list(self.cv1(x).chunk(2, 1))
        for m in self.m:
            y.append(m(y[-1]))
        return self.cv2(torch.cat(y, 1))"""

C2PSA_CLASSES = """class PSABlock(nn.Module):
    def __init__(self, c, e=0.5):
        super().__init__()
        c_ = max(1, int(c * e))
        self.cv1 = nn.Conv2d(c, c_, 1, bias=False)
        self.cv2 = nn.Conv2d(c, c_, 1, bias=False)
        self.cv3 = nn.Conv2d(c_, c_, 1, bias=False)
        self.cv4 = nn.Conv2d(2 * c_, c, 1)

    def forward(self, x):
        q = self.cv1(x)
        k = self.cv2(x)
        v = self.cv3(k)
        att = torch.softmax(q.flatten(2) @ k.flatten(2).transpose(-2, -1) / (q.size(1) ** 0.5), dim=-1)
        y = self.cv4(torch.cat([v * att @ v.flatten(2).transpose(-2, -1).view_as(v), v], dim=1))
        return x + y


class C2PSA(nn.Module):
    def __init__(self, c1, c2, n=1, e=0.5):
        super().__init__()
        assert c1 == c2
        c_ = max(1, int(c1 * e))
        self.cv1 = nn.Conv2d(c1, 2 * c_, 1, bias=False)
        self.cv2 = nn.Conv2d(2 * c_, c1, 1)
        self.m = nn.Sequential(*[PSABlock(c_, e=0.5) for _ in range(n)])

    def forward(self, x):
        a, b = self.cv1(x).split((int(x.size(1) * 0.5 // 1), int(x.size(1) * 0.5 // 1)), dim=1)
        b = self.m(b)
        return self.cv2(torch.cat((a, b), 1))"""

DETECT_CLASS = """class Detect(nn.Module):
    def __init__(self, nc, ch=(), reg_max=16):
        super().__init__()
        self.nc = nc
        self.reg_max = reg_max
        self.nl = len(ch)
        c2 = max(16, min(ch) // 4, reg_max * 4) if ch else 16
        c3 = max(min(ch) if ch else 64, min(nc, 100))
        self.cv2 = nn.ModuleList([
            nn.Sequential(nn.Conv2d(c, c2, 3, padding=1), nn.BatchNorm2d(c2), nn.SiLU(),
                          nn.Conv2d(c2, c2, 3, padding=1), nn.BatchNorm2d(c2), nn.SiLU(),
                          nn.Conv2d(c2, 4 * reg_max, 1))
            for c in ch
        ])
        self.cv3 = nn.ModuleList([
            nn.Sequential(nn.Conv2d(c, c, 3, groups=c, padding=1), nn.Conv2d(c, c3, 1),
                          nn.Conv2d(c3, c3, 3, groups=c3, padding=1), nn.Conv2d(c3, c3, 1),
                          nn.Conv2d(c3, nc, 1))
            for c in ch
        ])
        self.dfl = nn.Conv2d(reg_max, 1, 1, bias=False) if reg_max > 1 else nn.Identity()

    def forward(self, x):
        for i in range(self.nl):
            x[i] = torch.cat([self.cv2[i](x[i]), self.cv3[i](x[i])], 1)
        return x"""


class TestGraphCodegen:
    """验证 PyTorch 辅助类模板可被 Python 解析且 __init__ 可执行。
    forward pass 的 channel/shape 兼容性取决于完整模型拓扑，
    不在此处验证。"""

    def _validate_init(self, client, helper_classes: str, init_body: str):
        """验证辅助类 + 包含该类的 CustomModel 可以实例化（不跑 forward）"""
        code = HEADER + helper_classes + f"""

class CustomModel(nn.Module):
    def __init__(self):
        super().__init__()
        {init_body}

    def forward(self, x):
        return x
"""
        resp = client.post("/validate-model", json={"code": code})
        data = resp.json()
        assert data["valid"] is True, f"Init failed: {data.get('error')}"

    def test_c2f_module(self, client):
        self._validate_init(client, C2F_CLASS, "self.c2f = C2f(16, 32, n=1)")

    def test_sppf_module(self, client):
        self._validate_init(client, SPPF_CLASS, "self.sppf = SPPF(32, 64, k=5)")

    def test_cbam_module(self, client):
        self._validate_init(client, CBAM_CLASS, "self.cbam = CBAM(32, reduction=16)")

    def test_c3k2_module(self, client):
        self._validate_init(client, C3K2_CLASS, "self.c3k2 = C3k2(16, 32, n=1, c3k=False)")

    def test_c2psa_module(self, client):
        self._validate_init(client, C2PSA_CLASSES, "self.c2psa = C2PSA(32, 32, n=1)")

    def test_detect_module(self, client):
        self._validate_init(client, DETECT_CLASS, "self.detect = Detect(nc=80, ch=(32, 64, 128), reg_max=16)")

    def test_sppf_forward_works(self, client):
        """SPPF 模板 forward 在正确通道数下可运行"""
        code = _wrap(SPPF_CLASS, """    def __init__(self):
        super().__init__()
        self.stem = nn.Conv2d(3, 32, 1)
        self.sppf = SPPF(32, 64, k=5)

    def forward(self, x):
        return self.sppf(self.stem(x))""")
        resp = client.post("/validate-model", json={"code": code})
        assert resp.json()["valid"] is True

    def test_cbam_forward_works(self, client):
        """CBAM 模板 forward 在正确通道数下可运行"""
        code = _wrap(CBAM_CLASS, """    def __init__(self):
        super().__init__()
        self.stem = nn.Conv2d(3, 32, 1)
        self.cbam = CBAM(32, reduction=16)

    def forward(self, x):
        return self.cbam(self.stem(x))""")
        resp = client.post("/validate-model", json={"code": code})
        assert resp.json()["valid"] is True

    def test_c3k2_forward_works(self, client):
        """C3k2 模板 forward 在正确通道数下可运行"""
        code = _wrap(C3K2_CLASS, """    def __init__(self):
        super().__init__()
        self.stem = nn.Conv2d(3, 16, 1)
        self.c3k2 = C3k2(16, 32, n=1, c3k=False)

    def forward(self, x):
        return self.c3k2(self.stem(x))""")
        resp = client.post("/validate-model", json={"code": code})
        assert resp.json()["valid"] is True
