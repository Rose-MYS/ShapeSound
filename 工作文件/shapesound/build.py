"""把拆开的源文件合并成一个单文件网页。

源文件（平时改这些）：本文件夹下的 index.html、style.css、js/*.js
成品（给人用的）：../../最终成品/形声.html —— 一个文件，双击就能打开，可以直接发给别人

用法：在本文件夹里运行  python build.py
"""
import re
from pathlib import Path

SRC = Path(__file__).resolve().parent
OUT = SRC.parent.parent / '最终成品' / '形声.html'


def read(rel):
    return (SRC / rel).read_text(encoding='utf-8')


def build():
    html = read('index.html')

    # <link rel="stylesheet" href="xxx.css">  →  <style>…</style>
    def css(m):
        return '<style>\n' + read(m.group(1)).rstrip() + '\n</style>'
    html, n_css = re.subn(r'<link rel="stylesheet" href="([^"]+)">', css, html)

    # <script src="js/xxx.js"></script>  →  <script>…</script>（每个文件一个 <script>，和拆开时的行为完全一样）
    def js(m):
        code = read(m.group(1)).rstrip()
        if '</script' in code.lower():
            raise SystemExit(f'{m.group(1)} 里出现了 </script，合并后会截断页面，请改写那一行')
        return f'<script>\n/* ===== {m.group(1)} ===== */\n{code}\n</script>'
    html, n_js = re.subn(r'<script src="([^"]+)"></script>', js, html)

    stamp = '<!-- 本文件由 工作文件/shapesound/build.py 自动生成，请不要直接修改；改源文件后重新运行 build.py -->\n'
    html = html.replace('<!DOCTYPE html>\n', '<!DOCTYPE html>\n' + stamp, 1)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html, encoding='utf-8', newline='\n')
    print(f'已生成 {OUT}（{n_css} 个样式、{n_js} 个脚本，{OUT.stat().st_size // 1024} KB）')


if __name__ == '__main__':
    build()
