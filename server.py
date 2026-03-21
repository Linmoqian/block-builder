"""
积木拖拽监控服务器
监听前端拖拽事件，在终端输出被拖拽积木的名称
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import sys

# 终端颜色代码
GREEN = '\033[92m'
YELLOW = '\033[93m'
CYAN = '\033[96m'
BLUE = '\033[94m'
RESET = '\033[0m'


class DragHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """处理 CORS 预检请求"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        """处理拖拽事件"""
        if self.path == '/drag':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))

            block_name = data.get('name', '未知')
            block_type = data.get('type', '未知')

            # 输出积木名称到终端
            print(f"{CYAN}[拖拽]{RESET} {GREEN}{block_name}{RESET} ({BLUE}{block_type}{RESET})")

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(b'{"status": "ok"}')
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        """静默默认日志"""
        pass


def main():
    host = 'localhost'
    port = 8080

    server = HTTPServer((host, port), DragHandler)

    print(f"{GREEN}服务器启动成功{RESET}")
    print(f"{BLUE}地址:{RESET} http://{host}:{port}")
    print(f"{YELLOW}等待积木拖拽事件...{RESET}\n")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print(f"\n{YELLOW}服务器已停止{RESET}")
        server.shutdown()


if __name__ == '__main__':
    main()
