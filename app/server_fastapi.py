"""
积木拖拽监控服务器 (FastAPI 版本)
监听前端拖拽事件
在终端输出被拖拽积木的名称
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import re
import subprocess
import uvicorn

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

# Pydantic 请求模型
class DragRequest(BaseModel):
    id: str
    type: str
    name: str

class DeleteRequest(BaseModel):
    id: str
    name: str

class ConnectRequest(BaseModel):
    from_: str = ''
    to: str = ''

class ExportRequest(BaseModel):
    code: str

class ExportYamlRequest(BaseModel):
    yaml: str


app = FastAPI(title="Block Builder API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post('/drag')
async def drag(req: DragRequest):
    block_id = req.id
    block_name = req.name
    block_type = req.type

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

    return {'status': 'ok'}


@app.post('/delete')
async def delete(req: DeleteRequest):
    block_id = req.id
    block_name = req.name

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

    return {'status': 'ok'}


@app.post('/run')
async def run(file: str = Query('sample.py')):
    validated = validate_file_param(file)
    if not validated or validated not in ALLOWED_FILES:
        raise HTTPException(status_code=400, detail='非法文件名')

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

        return {
            'status': 'ok',
            'stdout': result.stdout,
            'stderr': result.stderr,
            'returncode': result.returncode,
        }

    except subprocess.TimeoutExpired:
        print(f"{YELLOW}[运行]{RESET} 执行超时 (10秒)")
        raise HTTPException(status_code=408, detail='执行超时 (10秒)')
    except Exception as e:
        print(f"{YELLOW}[运行]{RESET} 执行失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/read-file')
async def read_file(file: str = Query('sample.py')):
    validated = validate_file_param(file)
    if not validated:
        raise HTTPException(status_code=400, detail='非法文件名')

    file_path = os.path.join(TMPSRC_DIR, validated)

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        return {'content': content, 'success': True}
    except FileNotFoundError:
        return {'content': f'# 文件不存在\n# 请创建 {file_path}', 'success': False}
    except Exception as e:
        return {'content': f'# 读取错误: {str(e)}', 'success': False}


@app.post('/connect')
async def connect(req: ConnectRequest):
    from_id = req.from_
    to_id = req.to
    print(f"{MAGENTA}[连接]{RESET} {GREEN}{from_id}{RESET} -> {GREEN}{to_id}{RESET}")
    return {'status': 'ok'}


@app.post('/export')
async def export_code(req: ExportRequest):
    code = req.code

    try:
        if not os.path.exists(TMPSRC_DIR):
            os.makedirs(TMPSRC_DIR)
        with open(os.path.join(TMPSRC_DIR, 'network.py'), 'w', encoding='utf-8') as f:
            f.write(code)

        print(f"{GREEN}[导出]{RESET} 代码已写入 TmpSrc/network.py")
        return {'status': 'ok', 'message': 'Code exported successfully'}
    except Exception as e:
        print(f"{YELLOW}[导出]{RESET} 失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/export-yaml')
async def export_yaml(req: ExportYamlRequest):
    yaml_content = req.yaml

    try:
        if not os.path.exists(TMPSRC_DIR):
            os.makedirs(TMPSRC_DIR)
        with open(os.path.join(TMPSRC_DIR, 'model.yaml'), 'w', encoding='utf-8') as f:
            f.write(yaml_content)

        print(f"{GREEN}[导出]{RESET} YAML 已写入 TmpSrc/model.yaml")
        return {'status': 'ok', 'message': 'YAML exported successfully'}
    except Exception as e:
        print(f"{YELLOW}[导出]{RESET} YAML 失败: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == '__main__':
    host = 'localhost'
    port = 8080

    print(f"{GREEN}服务器启动成功 (FastAPI){RESET}")
    print(f"{BLUE}地址:{RESET} http://{host}:{port}")
    print(f"{YELLOW}等待积木拖拽/删除/运行事件...{RESET}\n")

    uvicorn.run(app, host=host, port=port, log_level='warning')
