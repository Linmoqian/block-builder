"""
积木拖拽监控服务器
监听前端拖拽事件
在终端输出被拖拽积木的名称
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import os
import re
import subprocess
from urllib.parse import urlparse, parse_qs

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TMPSRC_DIR = os.path.join(BASE_DIR, 'TmpSrc')

ALLOWED_FILES = {'sample.py', 'network.py', 'model.yaml'}


def validate_file_param(file_param: str) -> str | None:
    """校验文件名参数，防止路径遍历"""
    if not file_param or file_param != os.path.basename(file_param):
        return None
    if not re.match(r'^[a-zA-Z0-9_\-]+\.(py|yaml|yml)$', file_param):
        return None
    return file_param


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


def parse_query_file(path: str) -> str:
    """从 URL 路径中解析 file 查询参数"""
    file_param = 'sample.py'
    if '?' in path:
        try:
            query_params = parse_qs(urlparse(path).query)
            if 'file' in query_params:
                file_param = query_params['file'][0]
        except Exception:
            pass
    return file_param


class DragHandler(BaseHTTPRequestHandler):
    def send_json(self, code: int, data: dict):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def send_json_error(self, code: int, message: str):
        self.send_json(code, {'status': 'error', 'error': message})

    def do_GET(self):
        """处理 GET 请求"""
        if self.path.startswith('/read-file'):
            file_param = parse_query_file(self.path)

            validated = validate_file_param(file_param)
            if not validated:
                self.send_json_error(400, '非法文件名')
                return

            file_path = os.path.join(TMPSRC_DIR, validated)

            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                self.send_json(200, {'content': content, 'success': True})
            except FileNotFoundError:
                self.send_json(404, {'content': f'# 文件不存在\n# 请创建 {file_path}', 'success': False})
            except Exception as e:
                self.send_json(500, {'content': f'# 读取错误: {str(e)}', 'success': False})
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

            print(f"{CYAN}[拖拽]{RESET} {GREEN}{block_name}{RESET} ({BLUE}{block_type}{RESET})")

            print_statement = PRINT_MAP.get(block_type, f'# 未知积木: {block_name}')

            sample_path = os.path.join(TMPSRC_DIR, 'sample.py')

            if block_id in block_print_map:
                old_line_num = block_print_map[block_id]
                with open(sample_path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()

                if 0 <= old_line_num < len(lines):
                    del lines[old_line_num]
                    with open(sample_path, 'w', encoding='utf-8') as f:
                        f.writelines(lines)

                    for bid in list(block_print_map.keys()):
                        if block_print_map[bid] > old_line_num:
                            block_print_map[bid] -= 1

            with open(sample_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            line_num = len(lines)

            with open(sample_path, 'a', encoding='utf-8') as f:
                f.write(print_statement + '\n')

            block_print_map[block_id] = line_num

            self.send_json(200, {'status': 'ok'})

        elif self.path == '/delete':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))

            block_id = data.get('id', 'unknown')
            block_name = data.get('name', '未知')

            print(f"{YELLOW}[删除]{RESET} {GREEN}{block_name}{RESET}")

            sample_path = os.path.join(TMPSRC_DIR, 'sample.py')

            if block_id in block_print_map:
                line_num = block_print_map[block_id]
                with open(sample_path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()

                if 0 <= line_num < len(lines):
                    del lines[line_num]
                    with open(sample_path, 'w', encoding='utf-8') as f:
                        f.writelines(lines)

                    for bid in list(block_print_map.keys()):
                        if block_print_map[bid] > line_num:
                            block_print_map[bid] -= 1

                del block_print_map[block_id]

            self.send_json(200, {'status': 'ok'})

        elif self.path.startswith('/run'):
            file_param = parse_query_file(self.path)

            validated = validate_file_param(file_param)
            if not validated or validated not in ALLOWED_FILES:
                self.send_json_error(400, '非法文件名')
                return

            file_path = os.path.join(TMPSRC_DIR, validated)

            try:
                print(f"\n{GREEN}[运行]{RESET} 执行 {file_path}")
                print(f"{BLUE}{'─' * 9}{RESET}")

                result = subprocess.run(
                    ['python', file_path],
                    capture_output=True,
                    text=True,
                    timeout=10,
                    cwd=BASE_DIR,
                )

                if result.stdout:
                    for line in result.stdout.strip().split('\n'):
                        print(f"  {line}")
                if result.stderr:
                    print(f"{YELLOW}{result.stderr.rstrip()}{RESET}")

                print(f"{BLUE}{'─' * 9}{RESET}")
                print(f"{GREEN}[完成]{RESET} 返回码: {result.returncode}\n")

                self.send_json(200, {
                    'status': 'ok',
                    'stdout': result.stdout,
                    'stderr': result.stderr,
                    'returncode': result.returncode,
                })

            except subprocess.TimeoutExpired:
                print(f"{YELLOW}[运行]{RESET} 执行超时 (10秒)")
                self.send_json_error(408, '执行超时 (10秒)')
            except Exception as e:
                print(f"{YELLOW}[运行]{RESET} 执行失败: {str(e)}")
                self.send_json_error(500, str(e))

        elif self.path == '/connect':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))

            from_id = data.get('from', 'unknown')
            to_id = data.get('to', 'unknown')
            print(f"{MAGENTA}[连接]{RESET} {GREEN}{from_id}{RESET} -> {GREEN}{to_id}{RESET}")

            self.send_json(200, {'status': 'ok'})

        elif self.path == '/export':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))

            code = data.get('code', '')

            try:
                if not os.path.exists(TMPSRC_DIR):
                    os.makedirs(TMPSRC_DIR)
                with open(os.path.join(TMPSRC_DIR, 'network.py'), 'w', encoding='utf-8') as f:
                    f.write(code)

                print(f"{GREEN}[导出]{RESET} 代码已写入 TmpSrc/network.py")

                self.send_json(200, {'status': 'ok', 'message': 'Code exported successfully'})
            except Exception as e:
                print(f"{YELLOW}[导出]{RESET} 失败: {str(e)}")
                self.send_json_error(500, str(e))

        elif self.path == '/export-yaml':
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            data = json.loads(body.decode('utf-8'))

            yaml_content = data.get('yaml', '')

            try:
                if not os.path.exists(TMPSRC_DIR):
                    os.makedirs(TMPSRC_DIR)
                with open(os.path.join(TMPSRC_DIR, 'model.yaml'), 'w', encoding='utf-8') as f:
                    f.write(yaml_content)

                print(f"{GREEN}[导出]{RESET} YAML 已写入 TmpSrc/model.yaml")

                self.send_json(200, {'status': 'ok', 'message': 'YAML exported successfully'})
            except Exception as e:
                print(f"{YELLOW}[导出]{RESET} YAML 失败: {str(e)}")
                self.send_json_error(500, str(e))

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
