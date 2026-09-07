"""アプリのアイコンを、アプリの中のしるしから起こす。

    python scripts/build_icon.py

**`client/components/LanternMark.jsx` と同じ計算式で描く。**
しるしとアイコンが別々に作られていると、片方だけ直したときにずれる。
形の定義はあちらが原本で、こちらは同じ式を写している。

    中心の丸   r      = size * 0.18
    光条       inner  = size * 0.30 から outer = size * 0.46
    太さ       stroke = size * 0.07（先は丸）
    本数       8本（45度ごと）

## 地は暗い。**光は暗さがあって初めて光になる**（2026-09-07）

それまでは白で全面だった。作者から Apple の明るさ調整の記号を
見せられ、**ホーム画面でシステムの操作に見える**と分かった。
形は自分で描いたもの（下の式）で複製ではないが、**似ていることは
それ自体が問題**——名前は Lantern なのに、灯りに見えない。

同カテゴリ174件を取り直して並べた（`PROGRESS.md` 2026-09-07）。

- 地が明るいもの 144 / 暗いもの 30
- **明るい地＋橙〜黄は 54 件**。いまの居場所は混んでいた
- 暗い地はほぼ瞑想アプリで、**どれも青紫。暖色の一点は空いていた**

**形は変えない。**アプリの中のしるしと揃えてある（2026-08-20）。
変えたのは3つだけ。

1. 地を墨（`#1C1C1E`）に
2. しるしの下に**にじみ**を敷く
3. 中心の丸だけ**白く抜く**——これが効く。平らな記号ではなく
   **光源に見える。**Apple の記号は平らなので、ここが分かれ目

にじみは控えめにした。強くすると地まで明るくなり、**暗さが失われる。**
暗くないと、光っていることに意味が出ない。

**白い地では光沢は出せない。**試した（G案）が、いまのものと
区別がつかなかった。

## iOS の角丸を描かない

iOS は自分で角丸に切り抜く。角丸を描いた画像を渡すと**二重に丸まり**、
四隅に地の色が残る。**正方形のまま、墨で全面**を渡す。

## 余白

しるしを画面いっぱいにすると、45度の光条が角で切れる。
canvas の 62% に収めて、外周に余白を残す。
"""

import math
import os
import sys

from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "client", "assets")

AMBER = (251, 176, 59)          # #FBB03B。`tailwind.config.js` の灯り色
WHITE = (255, 255, 255)
INK = (28, 28, 30)              # #1C1C1E。暗いテーマの地と同じ
CORE = (255, 238, 202)          # 芯の白。**ここだけ抜くと光源に見える**

# にじみ。**控えめに。**強くすると地まで明るくなり、暗さが失われる
HALO_STRENGTH = 0.30
HALO_RADIUS = 0.26

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


def draw_halo(im, canvas, strength=HALO_STRENGTH, radius=HALO_RADIUS):
    """しるしの下に敷く空気。**光源ではなく、まわりを描く。**

    ぼかした円を面いっぱいの琥珀と合成する。
    `strength` は濃さ、`radius` は canvas に対する半径。
    """
    if strength <= 0:
        return im
    mask = Image.new("L", (canvas, canvas), 0)
    d = ImageDraw.Draw(mask)
    r = canvas * radius
    c = canvas / 2
    d.ellipse([c - r, c - r, c + r, c + r], fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(r * 0.60))
    mask = mask.point(lambda v: int(v * strength))
    return Image.composite(Image.new("RGB", (canvas, canvas), AMBER), im, mask)


def draw_core(draw, canvas, ratio=MARK_RATIO):
    """中心の丸だけ白く抜く。**これが平らな記号との分かれ目。**

    大きさは中心の丸（`size * 0.18`）の半分ほど。
    大きくすると輪になり、灯りではなく的に見える。
    """
    c = canvas / 2
    r = canvas * ratio * 0.18 * 0.52
    draw.ellipse([c - r, c - r, c + r, c + r], fill=CORE)


def render(path, canvas, bg, color, ratio=MARK_RATIO, mode="RGB",
           halo=0.0, core=False):
    """4倍で描いてから縮める（**縁を滑らかにする**）。

    `halo` はにじみの濃さ、`core` は芯を白く抜くかどうか。
    **どちらも暗い地でしか意味を持たない**（白の上では見えない）。
    """
    scale = 4
    big = canvas * scale

    if mode == "RGB":
        im = Image.new("RGB", (big, big), bg or WHITE)
        im = draw_halo(im, big, strength=halo)
        d = ImageDraw.Draw(im)
        draw_mark(d, big, color, ratio)
        if core:
            draw_core(d, big, ratio)
        im = im.resize((canvas, canvas), Image.LANCZOS)
    else:
        # 透明の上に。**にじみは半透明の琥珀として焼く。**
        #
        # 暗い地（`#1C1C1E`）の上に重ねると、RGB で描いたときと
        # **同じ絵になる**——どちらも同じ割合で琥珀を混ぜているため。
        # 起動画面がアイコンと揃うのはこのため（2026-09-07・作者の指示）。
        im = Image.new("RGBA", (big, big), (0, 0, 0, 0))
        if halo > 0:
            mask = Image.new("L", (big, big), 0)
            md = ImageDraw.Draw(mask)
            r = big * HALO_RADIUS
            c = big / 2
            md.ellipse([c - r, c - r, c + r, c + r], fill=255)
            mask = mask.filter(ImageFilter.GaussianBlur(r * 0.60))
            mask = mask.point(lambda v: int(v * halo))
            im = Image.merge("RGBA", (
                Image.new("L", (big, big), AMBER[0]),
                Image.new("L", (big, big), AMBER[1]),
                Image.new("L", (big, big), AMBER[2]),
                mask,
            ))
        d = ImageDraw.Draw(im)
        draw_mark(d, big, color + (255,), ratio)
        if core:
            draw_core(d, big, ratio)
        im = im.resize((canvas, canvas), Image.LANCZOS)

    im.save(path)
    return path


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    out = []

    # iOS と既定。**墨で全面・角丸なし・透明なし**
    out.append(render(os.path.join(ASSETS, "icon.png"), 1024, INK, AMBER,
                      halo=HALO_STRENGTH, core=True))

    # Web の favicon
    out.append(render(os.path.join(ASSETS, "favicon.png"), 256, INK, AMBER,
                      halo=HALO_STRENGTH, core=True))

    # Android の前景。**透明の上に置き、安全域に収める。**
    # 外側 1/3 は端末の形（丸・角丸・しずく）で切られるので、
    # しるしを 0.62 → 0.42 に縮める。
    # **にじみは背景の側が持つ**（下）——前景は端末に切られるため、
    # にじみを乗せると切り口で途切れる
    out.append(render(os.path.join(ASSETS, "android-icon-foreground.png"),
                      1024, None, AMBER, ratio=0.42, mode="RGBA", core=True))

    # Android の背景。**墨とにじみだけ。**しるしは前景が持つ
    bg = Image.new("RGB", (1024, 1024), INK)
    bg = draw_halo(bg, 1024, strength=HALO_STRENGTH, radius=HALO_RADIUS * 0.68)
    bg_path = os.path.join(ASSETS, "android-icon-background.png")
    bg.save(bg_path)
    out.append(bg_path)

    # Android の単色。**白のしるしを透明の上に。** 端末が色を付ける。
    # 芯は抜かない——単色なので、抜くと穴になる
    out.append(render(os.path.join(ASSETS, "android-icon-monochrome.png"),
                      1024, None, WHITE, ratio=0.42, mode="RGBA"))

    # 起動画面の絵。**アイコンと同じにする**（2026-09-07・作者の指示）。
    #
    # にじみを半透明で焼く。`app.json` の地を明暗とも `#1C1C1E` に
    # したので、**重ねるとアイコンと同じ絵になる。**
    # 明るい地に出していたときは、にじみを敷けなかった
    # ——光は暗さがあって初めて光になる。
    out.append(render(os.path.join(ASSETS, "splash-icon.png"),
                      1024, None, AMBER, ratio=0.52, mode="RGBA",
                      halo=HALO_STRENGTH, core=True))

    for p in out:
        print(f"生成: {os.path.relpath(p, ROOT)}")


if __name__ == "__main__":
    main()
