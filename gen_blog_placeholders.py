#!/usr/bin/env python3
"""Genera placeholders de blog puramente visuales (sin texto en el píxel).

El título/categoría/autor viven en HTML; la imagen solo aporta color de marca
y geometría. Un emblema pequeño y centrado sobrevive a cualquier recorte
object-cover (featured, grid, miniatura cuadrada del sidebar).
"""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw

PRIMARY = (0, 56, 147)
PRIMARY_DARK = (0, 34, 102)
PRIMARY_LIGHT = (26, 92, 184)
GOLD = (212, 175, 55)
WHITE = (255, 255, 255)
SOFT = (200, 214, 236)

W, H = 1200, 630
PUBLIC = Path(__file__).resolve().parent / "public"


def _diag_stripes(img: Image.Image, spacing: int, width: int, light: bool) -> Image.Image:
    """Diagonales de marca sobre el fondo — pura geometría."""
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    c1 = PRIMARY_LIGHT + (110,) if light else PRIMARY_DARK + (140,)
    c2 = PRIMARY_DARK + (90,) if light else PRIMARY_LIGHT + (70,)
    for i in range(-H, W + H, spacing):
        fill = c1 if (i // spacing) % 2 == 0 else c2
        d.polygon([(i, 0), (i + width, 0), (i + width - H, H), (i - H, H)], fill=fill)
    return Image.alpha_composite(img.convert("RGBA"), layer)


def _blocks(img: Image.Image, seed: int) -> Image.Image:
    """Bloques y diagonales suaves anclados al centro/medio (seguros al recortar)."""
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx, cy = W // 2, H // 2
    # Franja diagonal ancha detrás del emblema
    ang = math.radians(35 + (seed % 3) * 15)
    dx, dy = math.cos(ang), math.sin(ang)
    half = 90
    pts = [
        (cx - dx * 900 - dy * half, cy - dy * 900 + dx * half),
        (cx + dx * 900 - dy * half, cy + dy * 900 + dx * half),
        (cx + dx * 900 + dy * half, cy + dy * 900 - dx * half),
        (cx - dx * 900 + dy * half, cy - dy * 900 - dx * half),
    ]
    d.polygon(pts, fill=PRIMARY_DARK + (100,))
    # Bloques de acento simétricos alrededor del centro
    off = 200 + (seed % 4) * 40
    for sx in (-1, 1):
        for sy in (-1, 1):
            x0 = cx + sx * off - 70
            y0 = cy + sy * (off // 2) - 50
            d.rounded_rectangle([x0, y0, x0 + 140, y0 + 100], radius=18,
                                outline=GOLD + (160,), width=3)
    return Image.alpha_composite(img.convert("RGBA"), layer)


def _center_emblem(img: Image.Image, seed: int) -> Image.Image:
    """Emblema pequeño y estrictamente centrado (no depende de bordes)."""
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx, cy = W // 2, H // 2
    r_outer = 54
    # Anillo exterior
    d.ellipse([cx - r_outer, cy - r_outer, cx + r_outer, cy + r_outer],
              outline=GOLD + (230,), width=4)
    # Rombo interior
    r_in = 30
    d.polygon([(cx, cy - r_in), (cx + r_in, cy), (cx, cy + r_in), (cx - r_in, cy)],
              fill=WHITE + (40,), outline=WHITE + (220,), width=2)
    # Marca de punto / chevrón según variante
    if seed % 2 == 0:
        d.ellipse([cx - 8, cy - 8, cx + 8, cy + 8], fill=GOLD + (240,))
    else:
        d.polygon([(cx - 14, cy - 10), (cx + 14, cy), (cx - 14, cy + 10)],
                  fill=GOLD + (240,))
    # Halos tenues
    for k, alpha in ((78, 50), (100, 28)):
        d.ellipse([cx - k, cy - k, cx + k, cy + k], outline=WHITE + (alpha,), width=2)
    return Image.alpha_composite(img.convert("RGBA"), layer)


def _edge_accents(draw: ImageDraw.ImageDraw, seed: int) -> None:
    """Acentos de borde opcionales — se pueden recortar sin perder lectura."""
    # Solo barras finas de oro en un lateral (no texto)
    side = 0 if seed % 2 == 0 else 1
    x0 = 0 if side == 0 else W - 16
    draw.rectangle([x0, 0, x0 + 16, H], fill=GOLD)
    # Trincheta inferior discreta
    draw.rectangle([0, H - 8, W, H], fill=PRIMARY_DARK)


def make(path: Path, seed: int) -> None:
    img = Image.new("RGB", (W, H), PRIMARY)
    # Degradado vertical de marca
    top = Image.new("RGB", (W, H), PRIMARY_LIGHT)
    mask = Image.new("L", (1, H))
    for y in range(H):
        mask.putpixel((0, y), int(255 * (1 - y / H)))
    mask = mask.resize((W, H))
    img = Image.composite(top, img, mask)

    img = _diag_stripes(img, spacing=56 + (seed % 3) * 8, width=130, light=seed % 2 == 0)
    img = _blocks(img, seed)
    img = _center_emblem(img, seed)

    draw = ImageDraw.Draw(img)
    _edge_accents(draw, seed)

    # Viñeta sutil hacia el centro (mejora contraste del emblema)
    vig = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    vd = ImageDraw.Draw(vig)
    vd.ellipse([-W * 0.2, -H * 0.3, W * 1.2, H * 1.3], outline=(0, 0, 0, 40), width=80)
    img = Image.alpha_composite(img.convert("RGBA"), vig).convert("RGB")

    img.save(path, "JPEG", quality=88)
    print("ok", path.name)


def main() -> None:
    PUBLIC.mkdir(exist_ok=True)
    make(PUBLIC / "blog-placeholder.jpg", 0)
    for i in range(1, 9):
        make(PUBLIC / f"blog-{i}.jpg", i)


if __name__ == "__main__":
    main()
