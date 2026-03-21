"""
积木拖拽监控服务器
监听前端拖拽事件
在终端输出被拖拽积木的名称
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import subprocess

# 终端颜色代码
GREEN = '\033[92m'
YELLOW = '\033[93m'
CYAN = '\033[96m'
BLUE = '\033[94m'
MAGENTA = '\033[95m'
RESET = '\033[0m'

# 全局字典：记录每个积木 ID 对应的 print 语句行号
block_print_map = {}

# 积木类型到 print 语句的映射
PRINT_MAP = {
    'square': 'print("我是正方形")',
    'rect-h': 'print("我是长方形(横)")',
    'rect-v': 'print("我是长方形(纵)")',
    'circle': 'print("我是圆形")',
    'triangle': 'print("我是三角形")',
    'l-shape': 'print("我是L型")',
    't-shape': 'print("我是T型")',
}


class DragHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        """处理 GET 请求"""
        if self.path == '/read-file':
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
        """处理 POST 请求"""
        if self.path == '/drag':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))

            block_id = data.get('id', 'unknown')
            block_name = data.get('name', '未知')
            block_type = data.get('type', '未知')

            # 输出积木名称到终端
            print(f"{CYAN}[拖拽]{RESET} {GREEN}{block_name}{RESET} ({BLUE}{block_type}{RESET})")

            # 写入对应的 print 语句
            print_statement = PRINT_MAP.get(block_type, f'# 未知积木: {block_name}')

            # 如果积木已存在，先删除旧行
            if block_id in block_print_map:
                old_line_num = block_print_map[block_id]
                with open('TmpSrc/sample.py', 'r', encoding='utf-8') as f:
                    lines = f.readlines()

                if 0 <= old_line_num < len(lines):
                    del lines[old_line_num]
                    with open('TmpSrc/sample.py', 'w', encoding='utf-8') as f:
                        f.writelines(lines)

                    # 更新其他积木的行号
                    for bid in list(block_print_map.keys()):
                        if block_print_map[bid] > old_line_num:
                            block_print_map[bid] -= 1

            # 添加新行
            with open('TmpSrc/sample.py', 'r', encoding='utf-8') as f:
                lines = f.readlines()
            line_num = len(lines)

            with open('TmpSrc/sample.py', 'a', encoding='utf-8') as f:
                f.write(print_statement + '\n')

            block_print_map[block_id] = line_num

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(b'{"status": "ok"}')

        elif self.path == '/delete':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))

            block_id = data.get('id', 'unknown')
            block_name = data.get('name', '未知')

            # 输出删除信息到终端
            print(f"{YELLOW}[删除]{RESET} {GREEN}{block_name}{RESET}")

            # 删除对应的 print 语句
            if block_id in block_print_map:
                line_num = block_print_map[block_id]
                with open('TmpSrc/sample.py', 'r', encoding='utf-8') as f:
                    lines = f.readlines()

                if 0 <= line_num < len(lines):
                    del lines[line_num]
                    with open('TmpSrc/sample.py', 'w', encoding='utf-8') as f:
                        f.writelines(lines)

                    # 更新其他积木的行号
                    for bid in list(block_print_map.keys()):
                        if block_print_map[bid] > line_num:
                            block_print_map[bid] -= 1

                del block_print_map[block_id]

            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(b'{"status": "ok"}')

        elif self.path == '/run':
            # 执行 sample.py 文件
            try:
                print(f"\n{GREEN}[运行]{RESET} 执行 TmpSrc/sample.py")
                print(f"{BLUE}{'─' * 9}{RESET}")

                result = subprocess.run(
                    ['python', 'TmpSrc/sample.py'],
                    capture_output=True,
                    text=True,
                    timeout=10
                )

                if result.stdout:
                    for line in result.stdout.strip().split('\n'):
                        print(f"  {line}")
                if result.stderr:
                    print(f"{YELLOW}{result.stderr.rstrip()}{RESET}")

                print(f"{BLUE}{'─' * 9}{RESET}")
                print(f"{GREEN}[完成]{RESET} 返回码: {result.returncode}\n")

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
                print(f"{YELLOW}[运行]{RESET} 执行超时 (10秒)")
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
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        """静默默认日志"""
        pass


host = 'localhost'
port = 8080

server = HTTPServer((host, port), DragHandler)

print(f"{GREEN}服务器启动成功{RESET}")
print(f"{BLUE}地址:{RESET} http://{host}:{port}")
print(f"{YELLOW}等待积木拖拽/删除/运行事件...{RESET}\n")

try:
    server.serve_forever()
except KeyboardInterrupt:
    print(f"\n{YELLOW}服务器已停止{RESET}")
    server.shutdown()
