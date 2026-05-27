import torch
import torch.nn as nn
import torch.nn.functional as F


def data_loader():
    """模拟数据加载器：生成随机图像数据"""
    for _ in range(10):  # 10个batch
        yield torch.randn(32, 1, 28, 28), torch.randint(0, 10, (32,))


def CNN():
    """单层卷积神经网络：图像分类 (输入 1x28x28, 输出 10类)"""
    return nn.Sequential(
        nn.Conv2d(1, 16, 3, padding=1),   # 1x28x28 -> 16x28x28
        nn.ReLU(),
        nn.MaxPool2d(4),                   # 16x28x28 -> 16x7x7
        nn.Flatten(),
        nn.Linear(16 * 7 * 7, 10)
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

def train():
    """训练单层CNN"""
    model = CNN()
    optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
    criterion = nn.CrossEntropyLoss()

    print("\033[36m开始训练单层CNN...\033[0m")

    for epoch in range(5):
        total_loss = 0
        correct = 0
        total = 0

        for batch_idx, (data, target) in enumerate(data_loader()):
            optimizer.zero_grad()
            output = model(data)
            loss = criterion(output, target)
            loss.backward()
            optimizer.step()

            total_loss += loss.item()
            pred = output.argmax(dim=1)
            correct += (pred == target).sum().item()
            total += target.size(0)

        acc = 100 * correct / total
        print(f"Epoch {epoch+1}/5 | Loss: {total_loss:.4f} | Acc: {acc:.1f}%")

    print("\033[32m训练完成\033[0m")
    return model


if __name__ == "__main__":
    train()