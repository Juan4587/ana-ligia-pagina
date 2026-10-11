from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent))
from check_palette import contrast

pairs = [
    ("#FFFFFF", "#1C5060", "blanco sobre verde azulado (hero)"),
    ("#D9E2E5", "#1C5060", "texto ~white/85 sobre hero"),
    ("#88B991", "#1C5060", "verde claro sobre hero"),
    ("#E3AB46", "#1C5060", "dorado sobre hero"),
    ("#FFFFFF", "#15172D", "blanco sobre marino"),
]
for a, b, label in pairs:
    cr = contrast(a, b)
    print(f"{label}: {cr:.2f} AA={'OK' if cr >= 4.5 else 'FAIL'}")
