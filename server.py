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
MAGENTA = '\033[95m'
RESET = '\033[0m'


class DragHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        """处理 GET 请求"""
        if self.path == '/read-file':
            # 读取 sample.py 文件内容
            try:
                with open('TmpSrc/sample.py', 'r', encoding='utf-8') as f:
                    content = f.read()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'content': content, 'success': True}).encode('utf-8'))
            except FileNotFoundError:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'content': '# 文件不存在\n# 请创建 TmpSrc/sample.py', 'success': False}).encode('utf-8'))
            except Exception as e:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'content': f'# 读取错误: {str(e)}', 'success': False}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

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

        elif self.path == '/connect':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))

            from_block = data.get('from', {})
            to_block = data.get('to', {})

            from_name = from_block.get('name', '未知')
            to_name = to_block.get('name', '未知')

            # 输出连接信息到终端
            print(f"{MAGENTA}[连接]{RESET} {GREEN}{from_name}{RESET} ⟷ {GREEN}{to_name}{RESET}")

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(b'{"status": "ok"}')

        elif self.path == '/run':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)

            # 执行 sample.py 文件
            import subprocess
            try:
                result = subprocess.run(
                    ['python', 'TmpSrc/sample.py'],
                    capture_output=True,
                    text=True,
                    timeout=10
                )

                # 输出到终端
                print(f"\n{GREEN}[运行]{RESET} 执行 TmpSrc/sample.py")
                print(f"{BLUE}{'─' * 40}{RESET}")
                if result.stdout:
                    print(result.stdout.rstrip())
                if result.stderr:
                    print(f"{YELLOW}{result.stderr.rstrip()}{RESET}")
                print(f"{BLUE}{'─' * 40}{RESET}\n")

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'status': 'ok',
                    'stdout': result.stdout,
                    'stderr': result.stderr,
                    'returncode': result.returncode
                }).encode('utf-8'))
            except subprocess.TimeoutExpired:
                print(f"{YELLOW}[运行]{RESET} 执行超时")
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'status': 'error',
                    'error': '执行超时 (10秒)'
                }).encode('utf-8'))
            except Exception as e:
                print(f"{YELLOW}[运行]{RESET} 执行失败: {str(e)}")
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'status': 'error',
                    'error': str(e)
                }).encode('utf-8'))

        elif self.path == '/read-file':
            # 读取 sample.py 文件内容
            try:
                with open('TmpSrc/sample.py', 'r', encoding='utf-8') as f:
                    content = f.read()
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'content': content, 'success': True}).encode('utf-8'))
            except FileNotFoundError:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'content': '# 文件不存在\n# 请创建 TmpSrc/sample.py', 'success': False}).encode('utf-8'))
            except Exception as e:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'content': f'# 读取错误: {str(e)}', 'success': False}).encode('utf-8'))

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
    print(f"{YELLOW}等待积木拖拽/连接事件...{RESET}\n")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print(f"\n{YELLOW}服务器已停止{RESET}")
        server.shutdown()


if __name__ == '__main__':
    main()
