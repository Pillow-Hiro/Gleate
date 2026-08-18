"""画面と応答に出る日本語だけを抜き出す。

    python scripts/collect_words.py

**コメントは落とす。** この居住区はコメントも日本語で書くので、
素直に grep すると設計メモが混ざって、利用者が読む言葉が埋もれる。

`.claude/agents/lantern-words.md`（言葉の点検役）が最初に走らせる道具。
2026-08-18 に、手作業で1度やった精査を繰り返せるようにするため作った。

**判定はしない。** 並べるところまでが仕事で、
禁止ワードに触れているかどうかは読む側が決める。
機械に判定させると、言い換え（「歩み」と「一歩」）を取り逃す。
"""

import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

JA = re.compile(r"[ぁ-んァ-ヶ一-龥]")

# 読まない場所。生成物・依存・検査・設計文書。
SKIP_DIRS = {"node_modules", ".git", "dist", "__pycache__", ".expo", "public", ".claude"}
SKIP_TOP = ("tests", "docs", "scripts")


def strip_js_comments(src):
    """`//` `/* */` `{/* */}` を落とす。**文字列の中は触らない。**"""
    out, i, n = [], 0, len(src)
    while i < n:
        c = src[i]
        if c in "\"'`":
            q, j = c, i + 1
            while j < n:
                if src[j] == "\\":
                    j += 2
                    continue
                if src[j] == q:
                    j += 1
                    break
                j += 1
            out.append(src[i:j])
            i = j
            continue
        for open_, close in (("{/*", "*/}"), ("/*", "*/"), ("//", "\n")):
            if src.startswith(open_, i):
                j = src.find(close, i)
                j = n if j < 0 else j + (0 if close == "\n" else len(close))
                out.append("\n" * src.count("\n", i, j))
                i = j
                break
        else:
            out.append(c)
            i += 1
    return "".join(out)


def strip_py_comments(src):
    """`#` と docstring を落とす。行数は保つ。"""
    lines, in_doc = [], False
    for line in src.splitlines():
        s = line.strip()
        if s.startswith('"""') or s.startswith("'''"):
            if s.count(s[:3]) >= 2 and len(s) > 3:
                lines.append("")
                continue
            in_doc = not in_doc
            lines.append("")
            continue
        if in_doc:
            lines.append("")
            continue
        lines.append(re.sub(r"(?<!['\"])#.*$", "", line))
    return "\n".join(lines)


def collect(path, stripper):
    src = stripper(io.open(path, encoding="utf-8").read())
    hits = []
    for m in re.finditer(r"""(?s)(['"`])((?:\.|(?!\1).)*)\1""", src):
        if JA.search(m.group(2)):
            hits.append((src.count("\n", 0, m.start()) + 1, m.group(2).strip()))
    # JSX の生テキスト（引用符に入っていない日本語）
    for m in re.finditer(r">([^<>{}]*[ぁ-んァ-ヶ一-龥][^<>{}]*)<", src):
        t = m.group(1).strip()
        if t:
            hits.append((src.count("\n", 0, m.start()) + 1, t))
    return hits


def targets():
    for base, dirs, files in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        rel = os.path.relpath(base, ROOT).replace("\\", "/")
        if rel.startswith(SKIP_TOP):
            continue
        for f in sorted(files):
            path = os.path.join(base, f)
            if f.endswith((".jsx", ".js")) and not f.endswith(".test.js"):
                if rel.startswith("client"):
                    yield path, strip_js_comments
            elif f.endswith(".py"):
                yield path, strip_py_comments


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    seen = set()
    for path, stripper in sorted(targets()):
        try:
            hits = collect(path, stripper)
        except Exception as e:  # 読めない1本で全体を止めない
            print(f"!! {path}: {e}")
            continue
        if not hits:
            continue
        print(f"\n### {os.path.relpath(path, ROOT).replace(os.sep, '/')}")
        for line, text in hits:
            key = (path, text)
            if key in seen:
                continue
            seen.add(key)
            print(f"{line}: {text}")


if __name__ == "__main__":
    main()
