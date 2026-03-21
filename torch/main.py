import torch
import torch.nn as nn
import torch.nn.functional as F


def CNN():
    """卷积神经网络：图像分类 (输入 1x28x28, 输出 10类)"""
    return nn.Sequential(
        nn.Conv2d(1, 16, 3, padding=1),   # 1x28x28 -> 16x28x28
        nn.ReLU(),
        nn.MaxPool2d(2),                   # 16x28x28 -> 16x14x14
        nn.Conv2d(16, 32, 3, padding=1),  # 16x14x14 -> 32x14x14
        nn.ReLU(),
        nn.MaxPool2d(2),                   # 32x14x14 -> 32x7x7
        nn.Flatten(),
        nn.Linear(32 * 7 * 7, 10)
    )


def RNN():
    """循环神经网络：序列分类 (输入 32x16, 输出 10类)"""
    return nn.Sequential(
        nn.RNN(16, 32, batch_first=True),  # (output, hidden)
        Lambda(lambda x: x[1].squeeze(0)), # 取最后隐藏态
        nn.Linear(32, 10)
    )


def GNN():
    """图神经网络：节点分类 (输入节点特征 16维, 输出 10类)"""
    return nn.ModuleDict({
        'conv1': GraphConv(16, 32),
        'conv2': GraphConv(32, 10)
    })


def transformer():
    """Transformer 编码器：序列分类 (输入 32x16, 输出 10类)"""
    return nn.Sequential(
        TransformerEncoder(16, 2),  # 2层编码器
        Lambda(lambda x: x.mean(dim=1)),  # 全局平均池化
        nn.Linear(16, 10)
    )


def attention():
    """自注意力机制 (输入 32x16, 输出 32x16)"""
    return ScaledDotProductAttention(16)


# ===== 辅助组件 =====

class Lambda(nn.Module):
    """包装任意函数为 nn.Module"""
    def __init__(self, func):
        super().__init__()
        self.func = func
    def forward(self, x):
        return self.func(x)


class GraphConv(nn.Module):
    """简单图卷积层"""
    def __init__(self, in_dim, out_dim):
        super().__init__()
        self.linear = nn.Linear(in_dim, out_dim)

    def forward(self, x, adj=None):
        # x: [N, in_dim], adj: [N, N] 邻接矩阵
        x = self.linear(x)
        if adj is not None:
            x = torch.matmul(adj, x)
        return F.relu(x)


class TransformerEncoder(nn.Module):
    """简单 Transformer 编码器"""
    def __init__(self, d_model, n_layers):
        super().__init__()
        self.layers = nn.ModuleList([
            nn.TransformerEncoderLayer(d_model, nhead=2, dim_feedforward=64, batch_first=True)
            for _ in range(n_layers)
        ])

    def forward(self, x):
        for layer in self.layers:
            x = layer(x)
        return x


class ScaledDotProductAttention(nn.Module):
    """缩放点积注意力"""
    def __init__(self, d_k):
        super().__init__()
        self.scale = d_k ** 0.5

    def forward(self, q, k=None, v=None):
        # 自注意力：q = k = v
        k = q if k is None else k
        v = q if v is None else v
        scores = torch.matmul(q, k.transpose(-2, -1)) / self.scale
        attn = F.softmax(scores, dim=-1)
        return torch.matmul(attn, v)

if __name__ == "__main__":
    model= CNN()
    print(model)