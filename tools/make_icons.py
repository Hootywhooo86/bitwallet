"""Builds the Android launcher icons and splash screens from a 16x16 pixel glyph.
Run from the repo root: python3 tools/make_icons.py"""
import glob, os
from PIL import Image

GLYPH = [
    '................',
    '................',
    '..############..',
    '.#gggggggggggg#.',
    '.#gggggggggggg#.',
    '.#kkkkkkkkkkkk#.',
    '.#kkkkkkkkkkkk#.',
    '.#gggggggggggg#.',
    '.#gyyygggggggg#.',
    '.#gyyygggggggg#.',
    '.#ggggggggwgwg#.',
    '.#gggggggggggg#.',
    '..############..',
    '................',
    '................',
    '................',
]
COLOURS = {'#': (21, 128, 61, 255), 'g': (74, 222, 128, 255), 'k': (11, 11, 22, 255), 'y': (250, 204, 21, 255), 'w': (244, 241, 255, 255)}

RES = 'android/app/src/main/res'
BG = (11, 11, 22, 255)

def glyph(scale=1, pad=0, bg=None):
    size = 16 * scale + 2 * pad
    img = Image.new('RGBA', (size, size), bg or (0, 0, 0, 0))
    px = img.load()
    for y, row in enumerate(GLYPH):
        for x, ch in enumerate(row):
            c = COLOURS.get(ch)
            if not c: continue
            for dy in range(scale):
                for dx in range(scale):
                    px[pad + x * scale + dx, pad + y * scale + dy] = c
    return img

for dens, size in {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}.items():
    d = f'{RES}/mipmap-{dens}'
    os.makedirs(d, exist_ok=True)
    full = glyph(pad=4, bg=BG).resize((size, size), Image.NEAREST)
    full.save(f'{d}/ic_launcher.png'); full.save(f'{d}/ic_launcher_round.png')
    fg_size = size * 108 // 48  # adaptive icon foreground, glyph inside the safe zone
    fg = Image.new('RGBA', (fg_size, fg_size), (0, 0, 0, 0))
    g = glyph().resize((fg_size * 56 // 108,) * 2, Image.NEAREST)
    fg.paste(g, ((fg_size - g.width) // 2,) * 2, g)
    fg.save(f'{d}/ic_launcher_foreground.png')

for p in glob.glob(f'{RES}/drawable*/splash.png'):
    w, h = Image.open(p).size
    img = Image.new('RGB', (w, h), BG[:3])
    s = max(48, min(w, h) // 4 // 24 * 24)
    icon = glyph(pad=4, bg=BG).resize((s, s), Image.NEAREST)
    img.paste(icon, ((w - s) // 2, (h - s) // 2), icon)
    img.save(p)

bgxml = f'{RES}/values/ic_launcher_background.xml'
if os.path.exists(bgxml):
    open(bgxml, 'w').write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#0B0B16</color>\n</resources>\n')
print('icons ok')
