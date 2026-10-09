import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";

/*
 * Foto con efecto 3D (paralaje por profundidad), al estilo DepthFlow / 3D Ken Burns.
 * Usa la foto y su mapa de profundidad (<nombre>.depth.png, blanco = cerca) generado por
 * scripts/procesar_fotos.py con Depth Anything V2.
 */

const VERT = `
attribute vec2 pos;
varying vec2 vUv;
void main() {
  vUv = pos * 0.5 + 0.5;
  vUv.y = 1.0 - vUv.y;
  gl_Position = vec4(pos, 0.0, 1.0);
}`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D img;
uniform sampler2D depth;
uniform vec2 coverScale;   // fracción de la imagen visible (encaje tipo "cover")
uniform vec2 coverOffset;  // desplazamiento del recorte (object-position)
uniform vec2 offset;       // movimiento lateral de la cámara
uniform float dolly;       // avance de la cámara hacia la escena
uniform float zoom;        // zoom general
uniform vec2 center;       // punto hacia donde avanza la cámara
uniform float focus;       // profundidad que queda fija

vec2 toImg(vec2 uv) { return coverOffset + uv * coverScale; }

void main() {
  vec2 uv = center + (vUv - center) / zoom;
  vec2 q = uv;
  // iteración de punto fijo: busca qué punto de la foto se ve en este píxel
  for (int i = 0; i < 24; i++) {
    float d = texture2D(depth, clamp(toImg(q), 0.001, 0.999)).r - focus;
    vec2 objetivo = center + (uv - center) / (1.0 + dolly * d) - offset * d;
    q = mix(q, objetivo, 0.6); // amortiguado: converge sin saltar entre bordes
  }
  vec2 t = clamp(toImg(q), 0.001, 0.999);
  gl_FragColor = vec4(texture2D(img, t).rgb, 1.0);
}`;

const cargar = (src: string) =>
  new Promise<HTMLImageElement>((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = src;
  });

type Props = {
  src: string; // ruta dentro de public/, ej. "luis3/06-ingeniero.jpg"
  width: number;
  height: number;
  progreso: number; // 0..1 a lo largo de la escena
  centro?: [number, number]; // 0..1, hacia dónde avanza la cámara (la cara)
  posicion?: [number, number]; // object-position 0..1 para el recorte
  intensidad?: number;
  direccion?: number; // -1 o 1: sentido del movimiento lateral
  pulso?: number;
};

export const Foto3D: React.FC<Props> = ({ src, width, height, progreso, centro = [0.5, 0.45], posicion = [0.5, 0.5], intensidad = 1, direccion = 1, pulso = 0 }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const [imgs, setImgs] = useState<[HTMLImageElement, HTMLImageElement] | null>(null);
  const [handle] = useState(() => delayRender(`Cargando ${src}`));
  const listo = useRef(false);
  const glRef = useRef<{ gl: WebGLRenderingContext; prog: WebGLProgram; aspect: number } | null>(null);

  useEffect(() => {
    const depthSrc = src.replace(/\.jpg$/, ".depth.png");
    Promise.all([cargar(staticFile(src)), cargar(staticFile(depthSrc))])
      .then((r) => setImgs(r as [HTMLImageElement, HTMLImageElement]))
      .catch((e) => {
        console.error(e);
        listo.current = true;
        continueRender(handle);
      });
  }, [src, handle]);

  // Inicializa WebGL una sola vez cuando las imágenes están listas
  useLayoutEffect(() => {
    if (!imgs || !ref.current || glRef.current) return;
    const gl = ref.current.getContext("webgl", { preserveDrawingBuffer: true, antialias: false })!;
    const sh = (type: number, code: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, code);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    imgs.forEach((im, i) => {
      const tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, im);
    });
    gl.uniform1i(gl.getUniformLocation(prog, "img"), 0);
    gl.uniform1i(gl.getUniformLocation(prog, "depth"), 1);
    glRef.current = { gl, prog, aspect: imgs[0].naturalWidth / imgs[0].naturalHeight };
  }, [imgs]);

  // Dibuja el fotograma actual
  useLayoutEffect(() => {
    const ctx = glRef.current;
    if (!ctx) return;
    const { gl, prog, aspect } = ctx;
    const u = (n: string) => gl.getUniformLocation(prog, n);
    const boxAspect = width / height;
    const sx = aspect > boxAspect ? boxAspect / aspect : 1;
    const sy = aspect > boxAspect ? 1 : aspect / boxAspect;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.uniform2f(u("coverScale"), sx, sy);
    gl.uniform2f(u("coverOffset"), (1 - sx) * posicion[0], (1 - sy) * posicion[1]);
    const t = progreso;
    const ang = (t - 0.5) * Math.PI * 0.9;
    gl.uniform2f(u("offset"), 0.018 * intensidad * Math.sin(ang) * direccion, -0.008 * intensidad * Math.cos(ang * 0.7));
    gl.uniform1f(u("dolly"), (0.03 + 0.14 * t) * intensidad);
    gl.uniform1f(u("zoom"), 1.06 + 0.06 * t + pulso * 0.015);
    gl.uniform2f(u("center"), centro[0], centro[1]);
    gl.uniform1f(u("focus"), 0.35);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (!listo.current) {
      listo.current = true;
      continueRender(handle);
    }
  });

  return <canvas ref={ref} width={width} height={height} style={{ width, height, display: "block" }} />;
};
