export const C2F_CLASS = `class C2f(nn.Module):
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
        return self.cv2(torch.cat(y, 1))`;

export const SPPF_CLASS = `class SPPF(nn.Module):
    def __init__(self, c1, c2, k=5):
        super().__init__()
        c_ = c1 // 2
        self.cv1 = nn.Conv2d(c1, c_, 1)
        self.cv2 = nn.Conv2d(c_ * 4, c2, 1)
        self.pool = nn.MaxPool2d(k, 1, k // 2)

    def forward(self, x):
        y = [self.cv1(x)]
        y.extend(self.pool(y[-1]) for _ in range(3))
        return self.cv2(torch.cat(y, 1))`;

export const CBAM_CLASS = `class CBAM(nn.Module):
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
        return x * spatial`;
