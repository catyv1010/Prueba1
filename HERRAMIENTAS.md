# Herramientas para videos espectaculares

Todo lo que está en `repos/` (clonado con `--depth 1`, ignorado por git) y en `modelos/`.

## Motores de video por código
| Repo | Para qué |
|---|---|
| `remotion-dev/remotion` | **El motor principal.** Videos con React; lo usamos para todos los videos. |
| `remotion-dev/template-three`, `pmndrs/react-three-fiber` | Escenas 3D reales dentro de Remotion (`@remotion/three`). |
| `remotion-dev/github-unwrapped` | Proyecto de referencia de Remotion a gran escala (ideas de animación). |
| `redotvideo/revideo` | Alternativa estilo Remotion con API de render. |
| `motion-canvas/motion-canvas` | Animaciones vectoriales con editor visual. |
| `ManimCommunity/manim`, `3b1b/manim` | Animaciones matemáticas/técnicas (3Blue1Brown). |
| `theatre-js/theatre` | Línea de tiempo visual para animar (también 3D). |
| `mifi/editly`, `tnfe/FFCreator` | Montaje rápido de videos/slideshows con ffmpeg. |
| `pixijs/pixijs`, `motiondivision/motion`, `airbnb/lottie-web` | Partículas 2D rápidas, animación web y animaciones Lottie. |
| `gl-transitions/gl-transitions` | Catálogo de transiciones con shaders (MIT) para adaptar. |

## IA para fotos
| Repo / modelo | Para qué |
|---|---|
| `DepthAnything/Depth-Anything-V2` + `fabio-sim/Depth-Anything-ONNX` → `modelos/depth_anything_v2_vitb.onnx` | Mapa de profundidad de cada foto → **efecto 3D** (`src/cumple/Foto3D.tsx`). |
| `akatz-ai/DepthFlow`, `BrokenSource/DepthFlow`, `sniklaus/3d-ken-burns` | Referencias del efecto 3D Ken Burns / paralaje. |
| `xinntao/Real-ESRGAN` → `modelos/real_esrgan_x4.onnx` | Ampliar x4 fotos pequeñas o antiguas. |
| `TencentARC/GFPGAN`, `facefusion/facefusion` | Restauración de rostros (FaceFusion trae los modelos en ONNX). |
| `danielgatis/rembg` | Quitar el fondo de una foto (recortes de personas). |

## Descargar modelos
```bash
mkdir -p modelos && cd modelos
curl -LO https://github.com/fabio-sim/Depth-Anything-ONNX/releases/download/v2.0.0/depth_anything_v2_vitb.onnx
curl -LO https://github.com/facefusion/facefusion-assets/releases/download/models-3.0.0/real_esrgan_x4.onnx
cd .. && .venv/bin/pip install onnxruntime opencv-python-headless
```

## Receta de un video 3D
1. Fotos en `mi-video-remotion/public/<carpeta>/`.
2. `../.venv/bin/python -I scripts/procesar_fotos.py public/<carpeta> public/<carpeta>-3d ../modelos`
3. Usar `<Foto3D src=... />` en la composición.
4. Render con WebGL: `npx remotion render <Id> out/video.mp4 --gl=angle`
