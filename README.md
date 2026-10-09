# Prueba1 — Videos hermosos con código

## Herramientas
- **Manim** (Python): animaciones matemáticas/técnicas. Instalado en `.venv`.
- **Remotion** (React): proyecto en `mi-video-remotion/` → `npm install && npm run dev`.
- **ffmpeg**: edición y conversión.

## Instalación
```bash
sudo apt-get install -y libpango1.0-dev libcairo2-dev pkg-config ffmpeg
python3 -m venv .venv && .venv/bin/pip install manim
cd mi-video-remotion && npm install
```

## Repos de referencia (opcional, se clonan en `repos/`, ignorado por git)
```bash
mkdir -p repos && cd repos
for r in remotion-dev/remotion motion-canvas/motion-canvas ManimCommunity/manim 3b1b/manim theatre-js/theatre; do
  git clone --depth 1 https://github.com/$r.git $(echo $r | tr / -)
done
```

## Ejemplo
```bash
.venv/bin/manim -qh ejemplos/hola_manim.py Hola
```
