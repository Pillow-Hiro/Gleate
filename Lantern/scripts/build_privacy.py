"""PRIVACY.md から client/public/privacy.html を作る。

    python scripts/build_privacy.py

## なぜ生成するのか

同じ文面を2か所に置くと必ずずれる。このプロジェクトでは
PROJECT_MAP.md と MVP_SPEC.md が実際にずれた。
**PRIVACY.md を唯一の原本とし、HTML は生成物とする。**
`tests/test_docs.py` が両者の一致を検査する。

## なぜ public/ に置くのか

`client/public/` は `npx expo export --platform web` が
出力の直下へそのまま複製する（実測で確認済み）。
SPAのルーティングを通らないため、**ログインしていなくても開ける**。
アプリ内のルートにすると `_layout.jsx` の認証ガードが
`/login` へ振り替えてしまい、審査担当者が読めない。

Vercel は rewrites より先にファイルを探すため、
`vercel.json` の catch-all があっても静的ファイルが優先される
（`favicon.ico` や `_expo/static/...` が現に配信できている）。

## 変換の範囲

PRIVACY.md で使っている記法だけを扱う。
見出し・段落・表・箇条書き・強調・リンク・水平線。
知らない記法が来たら黙って崩さず、そのまま文字として出す。
"""

import html
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, "PRIVACY.md")
TARGET = os.path.join(ROOT, "client", "public", "privacy.html")

STYLE = """
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body {
  margin: 0 auto; padding: 2.5rem 1.25rem 5rem; max-width: 46rem;
  font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans",
    "Noto Sans JP", "Yu Gothic", sans-serif;
  line-height: 1.9; color: #2f2f2b; background: #faf8f3;
  -webkit-text-size-adjust: 100%;
}
h1 { font-size: 1.5rem; letter-spacing: .02em; margin: 0 0 .5rem; }
h2 { font-size: 1.1rem; margin: 2.5rem 0 .75rem; }
h3 { font-size: .95rem; margin: 1.75rem 0 .5rem; color: #4a4a44; }
p, li { font-size: .9rem; }
a { color: #3d5a45; }
hr { border: 0; border-top: 1px solid #e3ded2; margin: 2.5rem 0; }
strong { font-weight: 600; }
ul { padding-left: 1.25rem; }
li { margin: .35rem 0; }
.table-wrap { overflow-x: auto; margin: 1rem 0; }
table { border-collapse: collapse; width: 100%; font-size: .82rem; }
th, td { border: 1px solid #e3ded2; padding: .5rem .7rem; text-align: left;
         vertical-align: top; }
th { background: #f2eee4; font-weight: 600; }
@media (prefers-color-scheme: dark) {
  body { color: #ddd9d0; background: #1c1c1a; }
  h3 { color: #b9b5ab; }
  a { color: #9dc0a6; }
  hr, th, td { border-color: #3a3a36; }
  th { background: #26262300; background-color: #262623; }
}
"""

_INLINE = (
    (re.compile(r"\[([^\]]+)\]\(([^)]+)\)"), r'<a href="\2" rel="noreferrer">\1</a>'),
    (re.compile(r"\*\*([^*]+)\*\*"), r"<strong>\1</strong>"),
    (re.compile(r"`([^`]+)`"), r"<code>\1</code>"),
)


def inline(text):
    out = html.escape(text)
    for pattern, repl in _INLINE:
        out = pattern.sub(repl, out)
    return out


def _table(rows):
    head, body = rows[0], rows[2:]  # rows[1] は区切り行
    cells = "".join(f"<th>{inline(c)}</th>" for c in head)
    out = [f'<div class="table-wrap"><table><thead><tr>{cells}</tr></thead><tbody>']
    for row in body:
        out.append("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in row) + "</tr>")
    out.append("</tbody></table></div>")
    return "\n".join(out)


def _split_row(line):
    return [c.strip() for c in line.strip().strip("|").split("|")]


def to_html(md):
    blocks, table, items, para = [], [], [], []

    def flush():
        if table:
            blocks.append(_table(list(table)))
            table.clear()
        if items:
            lis = "".join(f"<li>{inline(i)}</li>" for i in items)
            blocks.append(f"<ul>{lis}</ul>")
            items.clear()
        if para:
            blocks.append(f"<p>{inline(' '.join(para))}</p>")
            para.clear()

    for raw in md.splitlines():
        line = raw.rstrip()

        if line.startswith("|") and line.endswith("|"):
            if para or items:
                flush()
            table.append(_split_row(line))
            continue
        if table:
            blocks.append(_table(list(table)))
            table.clear()

        if not line.strip():
            flush()
        elif line.startswith("### "):
            flush()
            blocks.append(f"<h3>{inline(line[4:])}</h3>")
        elif line.startswith("## "):
            flush()
            blocks.append(f"<h2>{inline(line[3:])}</h2>")
        elif line.startswith("# "):
            flush()
            blocks.append(f"<h1>{inline(line[2:])}</h1>")
        elif line.startswith("---"):
            flush()
            blocks.append("<hr>")
        elif line.startswith("- "):
            if para:
                flush()
            items.append(line[2:])
        else:
            if items:
                flush()
            para.append(line.strip())

    flush()
    return "\n".join(blocks)


def render(md):
    return (
        "<!doctype html>\n"
        '<html lang="ja">\n<head>\n'
        '<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        "<title>プライバシーポリシー — Lantern</title>\n"
        f"<style>{STYLE}</style>\n"
        "</head>\n<body>\n"
        f"{to_html(md)}\n"
        "</body>\n</html>\n"
    )


def build():
    md = io.open(SOURCE, encoding="utf-8").read()
    os.makedirs(os.path.dirname(TARGET), exist_ok=True)
    io.open(TARGET, "w", encoding="utf-8", newline="\n").write(render(md))
    return TARGET


if __name__ == "__main__":
    path = build()
    sys.stdout.reconfigure(encoding="utf-8")
    print(f"生成: {os.path.relpath(path, ROOT)}")
