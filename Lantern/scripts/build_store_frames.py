# -*- coding: utf-8 -*-
"""App Store のスクリーンショットを枠に載せる。

    python scripts/build_store_frames.py

**素の画面だけだと店頭で何のアプリか伝わらない。** 帯に一言載せる。
出来上がりは `screenshots/store_framed/`（`.gitignore` 済み・28MB ある）。

意匠は 2026-08-22 に Stitch が出したものと同じ。地 #F9F9FB、
字 #1D1D1F、琥珀 #FBB03B。書体はアプリと同じ Noto Sans JP。

**枠に載せると縦横比を合わせる必要がなくなる**（枠が吸収する）。
素の画面をそのまま出そうとすると、iPhone 1206x2622 も
iPad 1640x2360 も App Store の枠と比が違い、切るか埋めるかになる。

寸法は `docs/APPSTORE.md` 第6節。**6.9 インチではなく 6.5 インチ。**
"""
import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont

# **どこから実行しても動くようにする**（`scripts/` から呼ぶため）
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS = os.path.join(ROOT, 'screenshots')
FONT = os.path.join(
    ROOT, 'client', 'node_modules', '@expo-google-fonts', 'noto-sans-jp',
    '700Bold', 'NotoSansJP_700Bold.ttf')
BG     = (249, 249, 251)
INK    = (29, 29, 31)
AMBER  = (251, 176, 59)

# 行の頭に来てはいけない字（禁則）
NO_HEAD = '、。」）？！'


def wrap(draw, text, font, max_w):
    lines, cur = [], ''
    for ch in text:
        trial = cur + ch
        if draw.textlength(trial, font=font) <= max_w or not cur:
            cur = trial
        else:
            # 次の行の頭が句読点になるなら、その字は今の行に残す
            if ch in NO_HEAD:
                cur = trial
            else:
                lines.append(cur)
                cur = ch
    if cur:
        lines.append(cur)
    return lines


def layout(draw, text, font, max_w):
    """1行で収まるならそのまま。収まらないなら**読点のうしろで割る。**

    字づめで折ると「…照ら／す。」のように語の途中で切れる。
    日本語は空白で切れないので、句読点を手がかりにする。
    **真ん中に近い読点**を選ぶと、2行の長さが揃う。
    """
    if draw.textlength(text, font=font) <= max_w:
        return [text]
    marks = [i + 1 for i, ch in enumerate(text[:-1]) if ch in '、。']
    if marks:
        mid = len(text) / 2
        for i in sorted(marks, key=lambda i: abs(i - mid)):
            a, b = text[:i], text[i:]
            if (draw.textlength(a, font=font) <= max_w
                    and draw.textlength(b, font=font) <= max_w):
                return [a, b]
    return wrap(draw, text, font, max_w)


def build(shot_path, caption, size, out_path, *, shot_w, shot_top,
          band, font_px, radius, rule_w=96, rule_h=6):
    W, H = size
    canvas = Image.new('RGBA', size, BG + (255,))
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.truetype(FONT, font_px)

    # --- 帯の文 ---
    lines = layout(draw, caption, font, int(W * 0.82))
    lh = int(font_px * 1.35)
    block_h = lh * len(lines)
    y = band[0] + (band[1] - band[0] - block_h) // 2
    for ln in lines:
        w = draw.textlength(ln, font=font)
        draw.text(((W - w) / 2, y), ln, font=font, fill=INK)
        y += lh

    # --- 琥珀の線 ---
    ry = band[1] + int(font_px * 0.35)
    draw.rounded_rectangle(
        [(W - rule_w) // 2, ry, (W + rule_w) // 2, ry + rule_h],
        radius=rule_h // 2, fill=AMBER)

    # --- 実物 ---
    shot = Image.open(os.path.join(SHOTS, shot_path)).convert('RGB')
    sw = shot_w
    sh = round(shot.size[1] * sw / shot.size[0])
    shot = shot.resize((sw, sh), Image.LANCZOS)
    x0, y0 = (W - sw) // 2, shot_top

    # 影。**下にだけ落とす**（浮かせすぎない）
    layer = Image.new('RGBA', size, (0, 0, 0, 0))
    ImageDraw.Draw(layer).rounded_rectangle(
        [x0, y0 + 24, x0 + sw, y0 + sh + 24], radius=radius, fill=INK + (26,))
    canvas = Image.alpha_composite(canvas, layer.filter(ImageFilter.GaussianBlur(30)))

    mask = Image.new('L', (sw, sh), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, sw - 1, sh - 1], radius=radius, fill=255)
    canvas.paste(shot, (x0, y0), mask)

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    canvas.convert('RGB').save(out_path, 'PNG')
    print(f'  {os.path.basename(out_path):14s} {W}x{H}  帯{len(lines)}行  写真{sw}x{sh}')


CAPTIONS = [
    ('out/20260822_163913000_iOS.png', '今日の灯りが、書きはじめを照らす。',   '1_home'),
    ('out/20260822_161802000_iOS.png', 'よかったこと、困ったこと、次にやること。', '2_write'),
    ('out/20260822_161750000_iOS.png', '書いたものは、すべて手元に残る。',     '3_records'),
    ('out/20260822_162216000_iOS.png', '創作の日々に、静かに伴走する。',       '4_login'),
]
PAD_SHOTS = [
    ('20260822_164837000_iOS.png', '今日の灯りが、書きはじめを照らす。',   '1_home'),
    ('20260822_164828000_iOS.png', 'よかったこと、困ったこと、次にやること。', '2_write'),
    ('20260822_164907000_iOS.png', '書いたものは、すべて手元に残る。',     '3_records'),
    ('20260822_182358000_iOS.png', '創作の日々に、静かに伴走する。',       '4_login'),
]

print('--- iPhone 6.5"  1284x2778 ---')
for src, cap, name in CAPTIONS:
    build(src, cap, (1284, 2778), f'store_framed/iphone_6.5/{name}.png',
          shot_w=1030, shot_top=480, band=(120, 400), font_px=68, radius=56)

for folder, size in [('ipad_12.9', (2048, 2732)), ('ipad_13', (2064, 2752))]:
    print(f'--- iPad {folder}  {size[0]}x{size[1]} ---')
    for src, cap, name in PAD_SHOTS:
        build(src, cap, size, f'store_framed/{folder}/{name}.png',
              shot_w=1500, shot_top=510, band=(130, 430), font_px=92, radius=48)
