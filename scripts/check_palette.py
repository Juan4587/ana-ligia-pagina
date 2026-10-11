#!/usr/bin/env python3
"""Contraste WCAG + conteo de uso de tokens de color."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"


def rel_lum(hex_color: str) -> float:
    h = hex_color.lstrip("#")
    rgb = [int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)]
    def ch(c: float) -> float:
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (ch(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a: str, b: str) -> float:
    la, lb = rel_lum(a), rel_lum(b)
    if la < lb:
        la, lb = lb, la
    return (la + 0.05) / (lb + 0.05)


print("=== Contraste WCAG (texto blanco #FFFFFF) ===")
colors = {
    "actual primary #003893": "#003893",
    "actual primary-dark #002266": "#002266",
    "actual primary-light #1a5cb8": "#1a5cb8",
    "Marino #15172D": "#15172D",
    "Verde azulado #1C5060": "#1C5060",
    "Verde medio #348275": "#348275",
    "Verde claro #88B991": "#88B991",
    "Dorado #E3AB46": "#E3AB46",
    "actual dorado #D4A017": "#D4A017",
}
for name, hexv in colors.items():
    cr = contrast(hexv, "#FFFFFF")
    aa_large = "OK" if cr >= 3 else "FAIL"
    aa_normal = "OK" if cr >= 4.5 else "FAIL"
    print(f"  {name}: {cr:.2f}  AA-large={aa_large}  AA-normal={aa_normal}")

print("\n=== Texto oscuro #15172D sobre fondos ===")
for name, hexv in [("verde claro", "#88B991"), ("dorado", "#E3AB46"), ("blanco", "#FFFFFF")]:
    cr = contrast("#15172D", hexv)
    print(f"  marino sobre {name}: {cr:.2f}  AA-normal={'OK' if cr>=4.5 else 'FAIL'}")

print("\n=== Uso de tokens en archivos src ===")
patterns = {
    "primary*": re.compile(r"\bprimary(-dark|-light|-lighter)?\b"),
    "ant-blue*": re.compile(r"\bant-blue(-dark|-light)?\b"),
    "ant-gold": re.compile(r"\bant-gold\b"),
    "accent*": re.compile(r"\baccent(-light|-gold|-dark)?\b"),
    "hex #003893": re.compile(r"#003893", re.I),
    "hex #D4A017": re.compile(r"#D4A017", re.I),
}
file_hits: dict[str, set[str]] = {k: set() for k in patterns}
token_files: dict[str, int] = {}
for p in sorted(SRC.rglob("*")):
    if p.suffix not in {".tsx", ".ts", ".css"}:
        continue
    text = p.read_text(encoding="utf-8", errors="ignore")
    for name, rx in patterns.items():
        n = len(rx.findall(text))
        if n:
            file_hits[name].add(str(p.relative_to(ROOT)))
            token_files[name] = token_files.get(name, 0) + n

for name in patterns:
    files = sorted(file_hits[name])
    print(f"\n{name}: {token_files.get(name, 0)} ocurrencias en {len(files)} archivo(s)")
    for f in files:
        print(f"  - {f}")

# Archivos que usan cualquier token primary/ant-blue (candidatos a migrar)
union = set()
for k in ("primary*", "ant-blue*", "hex #003893"):
    union |= file_hits[k]
print(f"\nArchivos con primary/ant-blue/#003893: {len(union)}")
for f in sorted(union):
    print(f"  - {f}")

union_gold = set(file_hits["ant-gold"]) | set(file_hits["accent*"]) | set(file_hits["hex #D4A017"])
print(f"\nArchivos con dorado actual: {len(union_gold)}")
for f in sorted(union_gold):
    print(f"  - {f}")
