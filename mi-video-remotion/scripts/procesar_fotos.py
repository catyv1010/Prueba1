"""Mejora fotos con IA y genera mapas de profundidad para el efecto 3D.

Uso: python procesar_fotos.py <carpeta_entrada> <carpeta_salida> <carpeta_modelos>

- Fotos pequeñas (lado mayor < 1500 px): se amplían x4 con Real-ESRGAN y se reducen a 2000 px.
- Todas: mapa de profundidad con Depth Anything V2 (blanco = cerca), guardado como <nombre>.depth.png
"""
import sys
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort

entrada, salida, modelos = map(Path, sys.argv[1:4])
salida.mkdir(parents=True, exist_ok=True)
opts = ort.SessionOptions()
opts.intra_op_num_threads = 4
esrgan = ort.InferenceSession(str(modelos / "real_esrgan_x4.onnx"), opts, providers=["CPUExecutionProvider"])
depth = ort.InferenceSession(str(modelos / "depth_anything_v2_vitb.onnx"), opts, providers=["CPUExecutionProvider"])


def ampliar(img: np.ndarray, tile: int = 192, pad: int = 12) -> np.ndarray:
    """Real-ESRGAN x4 por mosaicos para no agotar memoria."""
    h, w = img.shape[:2]
    x = img[:, :, ::-1].astype(np.float32) / 255.0  # BGR -> RGB
    out = np.zeros((h * 4, w * 4, 3), np.float32)
    for y0 in range(0, h, tile):
        for x0 in range(0, w, tile):
            y1, x1 = min(y0 + tile, h), min(x0 + tile, w)
            ya, xa = max(y0 - pad, 0), max(x0 - pad, 0)
            yb, xb = min(y1 + pad, h), min(x1 + pad, w)
            t = x[ya:yb, xa:xb].transpose(2, 0, 1)[None]
            r = esrgan.run(None, {"input": t})[0][0].transpose(1, 2, 0)
            out[y0 * 4:y1 * 4, x0 * 4:x1 * 4] = r[(y0 - ya) * 4:(y0 - ya + y1 - y0) * 4, (x0 - xa) * 4:(x0 - xa + x1 - x0) * 4]
    return (np.clip(out, 0, 1)[:, :, ::-1] * 255).round().astype(np.uint8)


def profundidad(img: np.ndarray) -> np.ndarray:
    h, w = img.shape[:2]
    x = cv2.resize(img[:, :, ::-1], (518, 518), interpolation=cv2.INTER_CUBIC).astype(np.float32) / 255.0
    x = (x - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]
    d = depth.run(None, {"l_x_": x.transpose(2, 0, 1)[None].astype(np.float32)})[0][0]
    d = cv2.resize(d, (w, h), interpolation=cv2.INTER_CUBIC)
    lo, hi = np.percentile(d, 1), np.percentile(d, 99)
    d = np.clip((d - lo) / (hi - lo + 1e-6), 0, 1)
    # suavizado que respeta bordes para evitar "desgarros" en el paralaje
    d8 = (d * 255).astype(np.uint8)
    d8 = cv2.bilateralFilter(d8, 9, 40, 9)
    d8 = cv2.GaussianBlur(d8, (0, 0), max(w, h) / 300)
    return d8


solo_profundidad = "--solo-profundidad" in sys.argv
for p in sorted(entrada.glob("*.jpg")):
    if solo_profundidad:
        img = cv2.imread(str(salida / p.name))
        cv2.imwrite(str(salida / (p.stem + ".depth.png")), profundidad(img))
        print(p.name, flush=True)
        continue
    img = cv2.imread(str(p))
    h, w = img.shape[:2]
    nota = ""
    if max(h, w) < 1500:
        img = ampliar(img)
        s = 2000 / max(img.shape[:2])
        if s < 1:
            img = cv2.resize(img, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
        nota = f" ampliada {w}x{h} -> {img.shape[1]}x{img.shape[0]}"
    cv2.imwrite(str(salida / p.name), img, [cv2.IMWRITE_JPEG_QUALITY, 93])
    cv2.imwrite(str(salida / (p.stem + ".depth.png")), profundidad(img))
    print(f"{p.name}{nota}", flush=True)
