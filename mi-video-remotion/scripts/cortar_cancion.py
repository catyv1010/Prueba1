"""Recorta la canción: desde la primera palabra (16.6 s) hasta el fin de frase (94.9 s) y la une con el cierre de piano (190.45 s - final)."""
import sys
import numpy as np

SR = 44100
x = np.fromfile(sys.argv[1], dtype=np.float32).reshape(-1, 2)
seg = lambda a, b: x[int(a * SR):int(b * SR)].copy()

a = seg(16.6, 94.9)
b = seg(190.45, len(x) / SR)
fin, fout = int(0.04 * SR), int(0.35 * SR)
a[:fin] *= np.linspace(0, 1, fin)[:, None]
a[-fout:] *= np.linspace(1, 0, fout)[:, None]
fb = int(0.3 * SR)
b[:fb] *= np.linspace(0, 1, fb)[:, None]

start_b = int(78.0 * SR)
out = np.zeros((max(len(a), start_b + len(b)), 2), dtype=np.float32)
out[:len(a)] += a
out[start_b:start_b + len(b)] += b
out.tofile(sys.argv[2])
print("duración", len(out) / SR)
