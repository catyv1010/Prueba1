import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  random,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import { serif, script, sans, goldText, GOLD } from "./Cumple";
import { Foto3D } from "./Foto3D";

/*
 * Línea de tiempo sincronizada con public/luis3/cancion.mp3
 * (canción recortada: empieza en la primera palabra y termina con el cierre de piano).
 * Versión 3: fotos mejoradas con Real-ESRGAN y efecto 3D con mapas de Depth Anything V2.
 * - La batería entra en DROP (22.87 s); el tempo es 143.5 BPM (BEAT = 0.418 s).
 * - Las fotos de la estrofa duran 9 tiempos; las del coro, 12 tiempos.
 * - Coro: 7 fotos, mosaico (24 tiempos), "Un gran esposo" y mensaje final.
 * - El cierre de piano empieza en FINAL (78 s).
 */
const FPS = 30;
const BEAT = 0.418;
const DROP = 22.87;
const FINAL = 78.0;
const FIN = 89.18;
export const DURACION_SUPER3 = Math.round(FIN * FPS);
const f = (s: number) => Math.round(s * FPS);

type Entrada = "suave" | "barrido" | "zoom" | "subida" | "destello";
type Foto = {
  src: string;
  aspect: number;
  origin: string;
  kicker: string;
  titulo: string;
  sub?: string;
  heroe?: boolean;
  entrada: Entrada;
  pos?: string;
  alto?: number; // alto en pantalla para fotos horizontales (recorta los lados)
};

const ESTROFA: Foto[] = [
  { src: "01-amigos-jovenes.jpg", aspect: 1080 / 1451, origin: "50% 30%", kicker: "Sus raíces", titulo: "Creció rodeado de amor", entrada: "suave" },
  { src: "02-familia.jpg", alto: 880, aspect: 1600 / 1191, origin: "60% 40%", kicker: "Su familia", titulo: "Su lugar favorito en el mundo", entrada: "suave" },
  { src: "03-bateria.jpg", aspect: 4 / 3, origin: "35% 30%", pos: "40% 50%", kicker: "Su pasión", titulo: "Con ritmo en el alma", entrada: "suave" },
  { src: "04-playa.jpg", aspect: 3 / 4, origin: "60% 35%", kicker: "Su mirada", titulo: "Soñador de horizontes", entrada: "suave" },
  { src: "05-sonrisa.jpg", aspect: 1, origin: "50% 35%", kicker: "Su esencia", titulo: "Una sonrisa que ilumina", entrada: "suave" },
];

const CORO: Foto[] = [
  { src: "06-ingeniero.jpg", aspect: 4 / 3, origin: "30% 35%", pos: "35% 50%", kicker: "Su vocación", titulo: "Un gran ingeniero", heroe: true, entrada: "destello" },
  { src: "07-espejo.jpg", aspect: 1, origin: "45% 25%", kicker: "Su mente", titulo: "Brillante e inteligente", entrada: "barrido" },
  { src: "08-amigos.jpg", alto: 800, aspect: 16 / 9, origin: "45% 40%", kicker: "Su gente", titulo: "Amigos para toda la vida", entrada: "zoom" },
  { src: "09-antes-ahora.jpg", aspect: 1, origin: "50% 50%", kicker: "Su historia", titulo: "El amor también se hereda", entrada: "subida" },
  { src: "10-ceremonia.jpg", aspect: 739 / 1600, origin: "45% 45%", pos: "50% 42%", kicker: "El gran día", titulo: "Prometió amar para siempre", entrada: "zoom" },
  { src: "11-palabras.jpg", aspect: 3 / 4, origin: "45% 30%", kicker: "Sus palabras", titulo: "Directo del corazón", entrada: "barrido" },
  { src: "12-abuela.jpg", aspect: 3 / 4, origin: "50% 35%", kicker: "Sus amores", titulo: "Con los que más ama", entrada: "subida" },
  { src: "13-esposos.jpg", aspect: 1156 / 867, origin: "55% 45%", pos: "45% 50%", kicker: "Su mayor orgullo", titulo: "Un gran esposo", sub: "con amor de sobra", heroe: true, entrada: "destello" },
];

// Escenas con duración en tiempos de la canción; se encadenan desde el inicio de la estrofa
type Escena = { tipo: "foto"; foto: Foto; tiempos: number } | { tipo: "mosaico" | "mensaje"; tiempos: number };
const ESPOSOS = CORO[CORO.length - 1];
const LISTA: Escena[] = [
  ...ESTROFA.map((foto) => ({ tipo: "foto" as const, foto, tiempos: 9 })),
  ...CORO.slice(0, -1).map((foto) => ({ tipo: "foto" as const, foto, tiempos: 12 })),
  { tipo: "mosaico", tiempos: 24 },
  { tipo: "foto", foto: ESPOSOS, tiempos: 12 },
  { tipo: "mensaje", tiempos: 12 },
];
const INTRO_FIN = DROP - ESTROFA.length * 9 * BEAT;
const ESCENAS = LISTA.map((e, i) => {
  const ini = INTRO_FIN + LISTA.slice(0, i).reduce((a, x) => a + x.tiempos, 0) * BEAT;
  const fin = i < LISTA.length - 1 ? ini + e.tiempos * BEAT : FINAL;
  return { ...e, ini, fin };
});
const INICIO_ESPOSOS = ESCENAS.find((e) => e.tipo === "foto" && e.foto === ESPOSOS)!.ini;
const TR = 12; // fotogramas de transición

/* ---------- utilidades visuales ---------- */
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Pulso que late cada 2 tiempos durante el coro
const pulso = (frame: number) => {
  const t = frame / FPS;
  if (t < DROP || t > FINAL) return 0;
  const periodo = BEAT * 2;
  const dt = (t - DROP) % periodo;
  return Math.exp(-dt / 0.12);
};

const Destellos: React.FC<{ n?: number; color?: string; velocidad?: number }> = ({ n = 45, color = "243,210,122", velocidad = 1 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {new Array(n).fill(0).map((_, i) => {
        const size = 4 + random(`ds${i}`) * 16;
        const x = random(`dx${i}`) * width + Math.sin(frame / 40 + i) * 20;
        const vy = (0.4 + random(`dv${i}`) * 1.4) * velocidad;
        const y = ((((random(`dy${i}`) * height - frame * vy) % height) + height) % height);
        const tw = 0.5 + 0.5 * Math.sin(frame / (6 + random(`dt${i}`) * 10) + i * 3);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: size,
              height: size,
              borderRadius: "50%",
              background: `radial-gradient(circle, rgba(${color},1) 0%, rgba(${color},0.4) 40%, rgba(${color},0) 70%)`,
              opacity: 0.2 + tw * 0.8,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const Vineta: React.FC = () => (
  <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,0.55) 100%)", pointerEvents: "none" }} />
);

// Destello de luz cálida que cruza la pantalla
const LuzCalida: React.FC<{ fuerza: number }> = ({ fuerza }) => {
  const frame = useCurrentFrame();
  const x = 30 + Math.sin(frame / 50) * 40;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at ${x}% 15%, rgba(255,170,90,${0.35 * fuerza}) 0%, rgba(255,120,60,${0.12 * fuerza}) 35%, rgba(0,0,0,0) 65%)`,
        mixBlendMode: "screen",
        pointerEvents: "none",
      }}
    />
  );
};

/* ---------- textos animados ---------- */
const TituloAnimado: React.FC<{ texto: string; delay: number; size: number; dorado?: boolean }> = ({ texto, delay, size, dorado }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const palabras = texto.split(" ");
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: `0 ${size * 0.25}px`, padding: "0 60px" }}>
      {palabras.map((p, i) => {
        const s = spring({ frame: frame - delay - i * 4, fps, config: { damping: 200 } });
        return (
          <span key={i} style={{ display: "inline-block", overflow: "hidden", paddingBottom: size * 0.15, marginBottom: -size * 0.1 }}>
            <span
              style={{
                display: "inline-block",
                fontFamily: serif,
                fontStyle: "italic",
                fontSize: size,
                lineHeight: 1.15,
                color: "white",
                transform: `translateY(${(1 - s) * 110}%)`,
                textShadow: dorado ? undefined : "0 6px 30px rgba(0,0,0,0.7)",
                ...(dorado ? goldText : {}),
              }}
            >
              {p}
            </span>
          </span>
        );
      })}
    </div>
  );
};

const Rotulo: React.FC<{ foto: Foto }> = ({ foto }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const k = spring({ frame: frame - 6, fps, config: { damping: 200 } });
  const linea = interpolate(frame, [8, 30], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const sub = spring({ frame: frame - 34, fps, config: { damping: 200 } });
  return (
    <div style={{ position: "absolute", bottom: foto.heroe ? 150 : 170, width: "100%", textAlign: "center" }}>
      <div
        style={{
          fontFamily: sans,
          fontSize: 28,
          letterSpacing: 4 + k * 10,
          textTransform: "uppercase",
          color: GOLD,
          opacity: k,
          marginBottom: 18,
        }}
      >
        {foto.kicker}
      </div>
      <div style={{ width: 160 * linea, height: 2, background: GOLD, margin: "0 auto 22px", opacity: 0.8 }} />
      <TituloAnimado texto={foto.titulo} delay={10} size={foto.heroe ? 118 : 74} dorado={foto.heroe} />
      {foto.sub && (
        <div
          style={{
            fontFamily: script,
            fontSize: 92,
            color: "white",
            marginTop: 6,
            opacity: sub,
            transform: `translateY(${(1 - sub) * 20}px)`,
            textShadow: "0 4px 24px rgba(0,0,0,0.6)",
          }}
        >
          {foto.sub}
        </div>
      )}
    </div>
  );
};

const porcentajes = (v: string): [number, number] => {
  const [a, b] = v.split(" ").map((x) => parseFloat(x) / 100);
  return [a, b];
};

/* ---------- escena de foto ---------- */
const EscenaFoto: React.FC<{ foto: Foto; dur: number; inicioGlobal: number; primera: boolean }> = ({ foto, dur, inicioGlobal, primera }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = pulso(inicioGlobal + frame);

  // Entrada (los primeros TR fotogramas se superponen con la escena anterior)
  const e = primera ? 1 : interpolate(frame, [0, TR], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  let contenedor: React.CSSProperties = {};
  switch (foto.entrada) {
    case "suave":
      contenedor = { opacity: e, filter: `blur(${(1 - e) * 18}px)`, transform: `scale(${1.06 - e * 0.06})` };
      break;
    case "barrido":
      contenedor = { transform: `translateX(${(1 - e) * 100}%)`, filter: `blur(${(1 - e) * 25}px)` };
      break;
    case "subida":
      contenedor = { transform: `translateY(${(1 - e) * 100}%)`, filter: `blur(${(1 - e) * 25}px)` };
      break;
    case "zoom":
      contenedor = { opacity: e, transform: `scale(${1.5 - e * 0.5})`, filter: `blur(${(1 - e) * 20}px)` };
      break;
    case "destello": {
      const golpe = spring({ frame: frame - TR, fps, config: { damping: 12, mass: 0.6 } });
      contenedor = { opacity: frame >= TR ? 1 : 0, transform: `scale(${1.25 - golpe * 0.25})` };
      break;
    }
  }

  const w = 1080;
  const h = foto.aspect > 1 ? (foto.alto ?? 1100) : Math.min(w / foto.aspect, 1480);
  const top = Math.max(20, (1500 - h) / 2);
  const zoom = interpolate(frame, [0, dur + TR], [1.04, 1.16]);

  return (
    <AbsoluteFill style={{ ...contenedor, backgroundColor: "#07060d" }}>
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <Img
          src={staticFile(`luis3/${foto.src}`)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "blur(45px) brightness(0.42) saturate(1.4)",
            transform: `scale(${1.35 + zoom * 0.05})`,
          }}
        />
      </AbsoluteFill>
      <div
        style={{
          position: "absolute",
          top,
          left: 0,
          width: w,
          height: h,
          overflow: "hidden",
          transform: `scale(${1 + p * 0.018})`,
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 7%, black 86%, transparent 100%)",
          maskImage: "linear-gradient(to bottom, transparent 0%, black 7%, black 86%, transparent 100%)",
        }}
      >
        <Foto3D
          src={`luis3/${foto.src}`}
          width={w}
          height={Math.round(h)}
          progreso={frame / (dur + TR)}
          centro={porcentajes(foto.origin)}
          posicion={porcentajes(foto.pos ?? "50% 50%")}
          direccion={parseInt(foto.src, 10) % 2 ? 1 : -1}
          intensidad={foto.heroe ? 1.25 : 1}
          pulso={p}
        />
      </div>
      <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(7,6,13,0) 55%, rgba(7,6,13,0.92) 88%)" }} />
      <LuzCalida fuerza={0.6 + p * 0.6} />
      {foto.heroe && <Destellos n={35} velocidad={1.5} />}
      <Vineta />
      <Rotulo foto={foto} />
    </AbsoluteFill>
  );
};

/* ---------- intro ---------- */
const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = (d: number) => spring({ frame: frame - d, fps, config: { damping: 200 } });
  const nombre = "Luis Fernando".split("");
  const empuje = interpolate(frame, [0, f(INTRO_FIN) + TR], [1.15, 1.0]);
  return (
    <AbsoluteFill style={{ backgroundColor: "#07060d" }}>
      <AbsoluteFill style={{ overflow: "hidden", opacity: interpolate(frame, [0, 30], [0, 1], clamp) }}>
        <Img
          src={staticFile("luis3/13-esposos.jpg")}
          style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(30px) brightness(0.3) saturate(1.3)", transform: `scale(${empuje * 1.2})` }}
        />
      </AbsoluteFill>
      <LuzCalida fuerza={0.8} />
      <Destellos n={60} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center", transform: `scale(${empuje})` }}>
        <div style={{ fontFamily: sans, fontSize: 32, letterSpacing: 16, color: "rgba(255,255,255,0.85)", opacity: a(3), textTransform: "uppercase" }}>
          Una canción para
        </div>
        <div style={{ fontFamily: script, fontSize: 196, lineHeight: 1.3, marginTop: 20 }}>
          {nombre.map((l, i) => {
            const s = a(12 + i * 3);
            return (
              <span key={i} style={{ display: "inline-block", whiteSpace: "pre", opacity: s, transform: `translateY(${(1 - s) * 50}px)`, filter: `blur(${(1 - s) * 10}px)`, ...goldText }}>
                {l}
              </span>
            );
          })}
        </div>
        <div style={{ fontFamily: serif, fontStyle: "italic", fontSize: 58, color: "white", opacity: a(70), marginTop: 10 }}>
          ¡Feliz cumpleaños!
        </div>
      </AbsoluteFill>
      <Vineta />
    </AbsoluteFill>
  );
};

/* ---------- final ---------- */
const Final: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const a = (d: number) => spring({ frame: frame - d, fps, config: { damping: 200 } });
  const entrada = interpolate(frame, [0, 24], [0, 1], clamp);
  const salida = interpolate(frame, [durationInFrames - 45, durationInFrames - 5], [1, 0], clamp);
  const nombre = "Luis Fernando".split("");
  const cualidades = ["Gran ingeniero", "Gran esposo", "Gran ser humano"];
  return (
    <AbsoluteFill style={{ backgroundColor: "#07060d", opacity: entrada }}>
      <AbsoluteFill style={{ opacity: salida }}>
        <AbsoluteFill style={{ overflow: "hidden" }}>
          <Img
            src={staticFile("luis3/13-esposos.jpg")}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "55% 50%",
              filter: "blur(14px) brightness(0.32) saturate(1.2)",
              transform: `scale(${interpolate(frame, [0, durationInFrames], [1.15, 1.3])})`,
            }}
          />
        </AbsoluteFill>
        <LuzCalida fuerza={0.9} />
        <Destellos n={70} velocidad={0.6} />
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
          <div style={{ fontFamily: serif, fontStyle: "italic", fontSize: 84, color: "white", opacity: a(10), transform: `translateY(${(1 - a(10)) * 30}px)` }}>
            ¡Feliz cumpleaños,
          </div>
          <div style={{ fontFamily: script, fontSize: 180, lineHeight: 1.3 }}>
            {nombre.map((l, i) => {
              const s = a(24 + i * 3);
              return (
                <span key={i} style={{ display: "inline-block", whiteSpace: "pre", opacity: s, transform: `translateY(${(1 - s) * 40}px) scale(${0.85 + s * 0.15})`, ...goldText }}>
                  {l}
                </span>
              );
            })}
            <span style={{ ...goldText, opacity: a(70) }}>!</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 30, alignItems: "center" }}>
            {cualidades.map((c, i) => (
              <div key={c} style={{ opacity: a(90 + i * 14), transform: `translateY(${(1 - a(90 + i * 14)) * 20}px)` }}>
                <span style={{ color: GOLD, fontSize: 30, marginRight: 22 }}>✦</span>
                <span style={{ fontFamily: sans, fontSize: 44, letterSpacing: 8, color: "white", textTransform: "uppercase" }}>{c}</span>
                <span style={{ color: GOLD, fontSize: 30, marginLeft: 22 }}>✦</span>
              </div>
            ))}
          </div>
          <div style={{ fontFamily: serif, fontStyle: "italic", fontSize: 50, color: "rgba(255,255,255,0.9)", marginTop: 60, maxWidth: 860, lineHeight: 1.35, opacity: a(150), transform: `translateY(${(1 - a(150)) * 20}px)` }}>
            Que este nuevo año te regale todo lo que sueñas.
          </div>
        </AbsoluteFill>
        <Vineta />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ---------- mosaico: las fotos aparecen una por tiempo y la cámara entra en la de los esposos ---------- */
const MOSAICO = [
  "01-amigos-jovenes.jpg", "06-ingeniero.jpg", "03-bateria.jpg",
  "02-familia.jpg", "13-esposos.jpg", "07-espejo.jpg",
  "04-playa.jpg", "10-ceremonia.jpg", "08-amigos.jpg",
  "09-antes-ahora.jpg", "11-palabras.jpg", "12-abuela.jpg",
];
const ORDEN_APARICION = [0, 5, 10, 3, 8, 1, 6, 11, 2, 9, 7, 4]; // la de los esposos aparece última
const CENTRO = 4;

const Mosaico: React.FC<{ inicioGlobal: number }> = ({ inicioGlobal }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (frame - TR) / fps; // segundos desde el inicio real de la escena
  const p = pulso(inicioGlobal + frame);
  const entrada = interpolate(frame, [0, TR], [0, 1], clamp);
  const zoomP = interpolate(t, [20 * BEAT, 24 * BEAT], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
  const cw = 1080 / 3;
  const ch = 1920 / 4;
  const cx = cw * 1.5;
  const cy = ch * 1.5;
  const titulo = spring({ frame: frame - TR - f(12 * BEAT), fps, config: { damping: 200 } });
  const tituloSale = interpolate(t, [18.5 * BEAT, 20 * BEAT], [1, 0], clamp);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0b0814", opacity: entrada }}>
      <AbsoluteFill
        style={{
          transformOrigin: `${cx}px ${cy}px`,
          transform: `translate(0px, ${(960 - cy) * zoomP}px) scale(${(1 + p * 0.012) * (1 + 2 * zoomP)})`,
        }}
      >
        {MOSAICO.map((src, i) => {
          const orden = ORDEN_APARICION.indexOf(i);
          const s = spring({ frame: frame - TR - f(orden * BEAT), fps, config: { damping: 14, mass: 0.7 } });
          const giro = (random(`g${i}`) - 0.5) * 16;
          const col = i % 3;
          const fila = Math.floor(i / 3);
          const esCentro = i === CENTRO;
          return (
            <div
              key={src}
              style={{
                position: "absolute",
                left: col * cw + 6,
                top: fila * ch + 6,
                width: cw - 12,
                height: ch - 12,
                borderRadius: 14,
                overflow: "hidden",
                opacity: Math.min(1, s * 1.4),
                transform: `scale(${0.4 + s * 0.6}) rotate(${giro * (1 - s)}deg)`,
                boxShadow: esCentro ? `0 0 ${40 + p * 40}px rgba(243,210,122,0.7)` : "0 20px 40px rgba(0,0,0,0.5)",
                outline: esCentro ? `3px solid ${GOLD}` : undefined,
                filter: zoomP > 0 && !esCentro ? `brightness(${1 - zoomP * 0.7})` : undefined,
              }}
            >
              <Img
                src={staticFile(`luis3/${src}`)}
                style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${1.15 - s * 0.1})` }}
              />
            </div>
          );
        })}
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          opacity: titulo * tituloSale,
          background: `radial-gradient(ellipse at center, rgba(7,6,13,${0.85 * titulo * tituloSale}) 0%, rgba(7,6,13,${0.5 * titulo * tituloSale}) 45%, rgba(7,6,13,0) 75%)`,
        }}
      >
        <div style={{ fontFamily: serif, fontStyle: "italic", fontSize: 84, color: "white", transform: `translateY(${(1 - titulo) * 30}px)`, textShadow: "0 6px 30px rgba(0,0,0,0.8)" }}>
          Una vida llena de
        </div>
        <div style={{ fontFamily: script, fontSize: 200, lineHeight: 1.2, transform: `scale(${0.8 + titulo * 0.2})`, ...goldText }}>
          momentos
        </div>
      </AbsoluteFill>
      <LuzCalida fuerza={0.5 + p * 0.5} />
      <Vineta />
    </AbsoluteFill>
  );
};

/* ---------- mensaje antes del cierre ---------- */
const Mensaje: React.FC<{ dur: number }> = ({ dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrada = interpolate(frame, [0, TR], [0, 1], clamp);
  const k = spring({ frame: frame - TR, fps, config: { damping: 200 } });
  const palabras = "Gracias por ser luz, fuerza y alegría para todos los que te rodean.".split(" ");
  return (
    <AbsoluteFill style={{ backgroundColor: "#07060d", opacity: entrada }}>
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <Img
          src={staticFile("luis3/10-ceremonia.jpg")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "blur(10px) brightness(0.35) saturate(1.2)",
            transform: `scale(${interpolate(frame, [0, dur + TR], [1.1, 1.25])})`,
          }}
        />
      </AbsoluteFill>
      <LuzCalida fuerza={0.9} />
      <Destellos n={50} velocidad={0.8} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center", padding: "0 80px" }}>
        <div style={{ fontFamily: sans, fontSize: 30, letterSpacing: 4 + k * 12, color: GOLD, textTransform: "uppercase", opacity: k, marginBottom: 40 }}>
          Para ti
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 22px" }}>
          {palabras.map((w, i) => {
            const s = spring({ frame: frame - TR - 8 - i * 4, fps, config: { damping: 200 } });
            return (
              <span
                key={i}
                style={{
                  fontFamily: serif,
                  fontStyle: "italic",
                  fontSize: 82,
                  lineHeight: 1.3,
                  color: "white",
                  opacity: s,
                  filter: `blur(${(1 - s) * 8}px)`,
                  transform: `translateY(${(1 - s) * 25}px)`,
                  textShadow: "0 6px 30px rgba(0,0,0,0.7)",
                }}
              >
                {w}
              </span>
            );
          })}
        </div>
      </AbsoluteFill>
      <Vineta />
    </AbsoluteFill>
  );
};

/* ---------- destello blanco al entrar la batería ---------- */
const FlashDrop: React.FC = () => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 2, 16], [0, 1, 0], clamp);
  return <AbsoluteFill style={{ background: "radial-gradient(circle, #fff 0%, #ffe9b8 60%, #f3d27a 100%)", opacity: o, pointerEvents: "none" }} />;
};

export const SuperCumple3: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#07060d" }}>
      <Sequence durationInFrames={f(INTRO_FIN) + TR}>
        <Intro />
      </Sequence>
      {ESCENAS.map((e, i) => {
        const desde = f(e.ini) - TR;
        const dur = f(e.fin) - f(e.ini);
        return (
          <Sequence key={i} from={desde} durationInFrames={dur + TR + (i === ESCENAS.length - 1 ? 24 : TR)}>
            {e.tipo === "foto" && <EscenaFoto foto={e.foto} dur={dur} inicioGlobal={desde} primera={false} />}
            {e.tipo === "mosaico" && <Mosaico inicioGlobal={desde} />}
            {e.tipo === "mensaje" && <Mensaje dur={dur} />}
          </Sequence>
        );
      })}
      <Sequence from={f(DROP) - 2} durationInFrames={20}>
        <FlashDrop />
      </Sequence>
      <Sequence from={f(INICIO_ESPOSOS) - 2} durationInFrames={20}>
        <FlashDrop />
      </Sequence>
      <Sequence from={f(FINAL)} durationInFrames={DURACION_SUPER3 - f(FINAL)}>
        <Final />
      </Sequence>
      <Audio src={staticFile("luis2/cancion.mp3")} />
    </AbsoluteFill>
  );
};
