"""アプリのアイコンを、アプリの中のしるしから起こす。

    python scripts/build_icon.py

**`client/components/LanternMark.jsx` と同じ計算式で描く。**
しるしとアイコンが別々に作られていると、片方だけ直したときにずれる。
形の定義はあちらが原本で、こちらは同じ式を写している。

    中心の丸   r      = size * 0.18
    光条       inner  = size * 0.30 から outer = size * 0.46
    太さ       stroke = size * 0.07（先は丸）
    本数       8本（45度ごと）

## iOS の角丸を描かない

iOS は自分で角丸に切り抜く。角丸を描いた画像を渡すと**二重に丸まり**、
四隅に地の色が残る。**正方形のまま、白で全面**を渡す。

## 余白

しるしを画面いっぱいにすると、45度の光条が角で切れる。
canvas の 62% に収めて、外周に余白を残す。
"""

import math
import os
import sys

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "client", "assets")

AMBER = (251, 176, 59)          # #FBB03B。`tailwind.config.js` の灯り色
WHITE = (255, 255, 255)

# しるしが canvas に占める割合。**角で光条が切れない大きさ**
MARK_RATIO = 0.62


def draw_mark(draw, canvas, color, ratio=MARK_RATIO):
    """`LanternMark.jsx` と同じ形を描く。"""
    size = canvas * ratio
    c = canvas / 2
    r = size * 0.18
    inner = size * 0.30
    outer = size * 0.46
    stroke = size * 0.07
    half = stroke / 2

    draw.ellipse([c - r, c - r, c + r, c + r], fill=color)

    for deg in range(0, 360, 45):
        rad = math.radians(deg)
        x1, y1 = c + math.cos(rad) * inner, c + math.sin(rad) * inner
        x2, y2 = c + math.cos(rad) * outer, c + math.sin(rad) * outer
        draw.line([x1, y1, x2, y2], fill=color, width=int(round(stroke)))
        # **先を丸くする。** Pillow の line に丸い端が無いので、
        # 両端に円を置く（`strokeLinecap="round"` と同じ見た目）
        for x, y in ((x1, y1), (x2, y2)):
            draw.ellipse([x - half, y - half, x + half, y + half], fill=color)


def render(path, canvas, bg, color, ratio=MARK_RATIO, mode="RGB"):
    """4倍で描いてから縮める（**縁を滑らかにする**）。"""
    scale = 4
    big = canvas * scale
    im = Image.new("RGBA", (big, big), (0, 0, 0, 0) if bg is None else bg + (255,))
    draw_mark(ImageDraw.Draw(im), big, color + (255,), ratio)
    im = im.resize((canvas, canvas), Image.LANCZOS)
    if mode == "RGB":
        flat = Image.new("RGB", (canvas, canvas), bg or WHITE)
        flat.paste(im, mask=im.split()[3])
        im = flat
    im.save(path)
    return path


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    out = []

    # iOS と既定。**白で全面・角丸なし・透明なし**
    out.append(render(os.path.join(ASSETS, "icon.png"), 1024, WHITE, AMBER))

    # Web の favicon
    out.append(render(os.path.join(ASSETS, "favicon.png"), 256, WHITE, AMBER))

    # Android の前景。**透明の上に置き、安全域に収める。**
    # 外側 1/3 は端末の形（丸・角丸・しずく）で切られるので、
    # しるしを 0.62 → 0.42 に縮める
    out.append(render(os.path.join(ASSETS, "android-icon-foreground.png"),
                      1024, None, AMBER, ratio=0.42, mode="RGBA"))

    # Android の単色。**白のしるしを透明の上に。** 端末が色を付ける
    out.append(render(os.path.join(ASSETS, "android-icon-monochrome.png"),
                      1024, None, WHITE, ratio=0.42, mode="RGBA"))

    for p in out:
        print(f"生成: {os.path.relpath(p, ROOT)}")


if __name__ == "__main__":
    main()
