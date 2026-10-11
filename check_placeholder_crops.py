#!/usr/bin/env python3
"""Recorta el mismo placeholder en las 3 proporciones del sitio para revisión visual.

- featured:  ~700x400  (columna izquierda del featured)
- grid:      ~560x192  (cards h-48 de Artículos Recientes)
- thumb:     56x56     (miniatura cuadrada del sidebar) -> se exporta a 112x112
"""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "public" / "_crop_check"
CASES = [
    ("featured", 700, 400),
    ("grid", 560, 192),
    ("thumb", 112, 112),  # 2x del w-14 h-14 real
]


def cover_crop(img: Image.Image, cw: int, ch: int) -> Image.Image:
    iw, ih = img.size
    scale = max(cw / iw, ch / ih)
    sw, sh = int(round(iw * scale)), int(round(ih * scale))
    resized = img.resize((sw, sh), Image.LANCZOS)
    left = (sw - cw) // 2
    top = (sh - ch) // 2
    return resized.crop((left, top, left + cw, top + ch))


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    names = ["blog-placeholder.jpg"] + [f"blog-{i}.jpg" for i in range(1, 9)]
    # Lienzo: una fila por imagen, 3 recortes + etiqueta
    pad, label_h = 16, 28
    col_w = max(c[1] for c in CASES) + pad * 2
    row_h = 400 + label_h + pad  # alto máx featured
    cols = 3
    canvas = Image.new("RGB", (col_w * cols, row_h * len(names)), (245, 247, 250))
    draw = ImageDraw.Draw(canvas)

    for row, name in enumerate(names):
        src = Image.open(ROOT / "public" / name).convert("RGB")
        y0 = row * row_h
        draw.text((pad, y0 + 6), f"{name} — featured | grid | thumb", fill=(30, 41, 59))
        x = pad
        for label, cw, ch in CASES:
            crop = cover_crop(src, cw, ch)
            y = y0 + label_h
            # sombra
            draw.rectangle([x + 3, y + 3, x + cw + 3, y + ch + 3], fill=(200, 205, 215))
            canvas.paste(crop, (x, y))
            draw.rectangle([x, y, x + cw, y + ch], outline=(100, 116, 139), width=1)
            x += cw + pad

    out = OUT / "crops_all.jpg"
    canvas.save(out, "JPEG", quality=90)
    print("ok", out)

    # También una tira solo con blog-1 a tamaño completo para mirar el original
    orig = Image.open(ROOT / "public" / "blog-1.jpg")
    orig.save(OUT / "blog-1_full.jpg", "JPEG", quality=90)
    print("ok", OUT / "blog-1_full.jpg")


if __name__ == "__main__":
    main()
