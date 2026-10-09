import {
  AbsoluteFill,
  Img,
  interpolate,
  random,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  Easing,
  Audio,
} from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { loadFont } from "@remotion/fonts";

// Fuentes locales (public/fonts) para que el render no dependa de internet
export const serif = "Playfair Display";
export const script = "Great Vibes";
export const sans = "Montserrat";
loadFont({ family: serif, url: staticFile("fonts/playfair-italic.woff2"), style: "italic", weight: "500" });
loadFont({ family: script, url: staticFile("fonts/greatvibes.woff2") });
loadFont({ family: sans, url: staticFile("fonts/montserrat.woff2"), weight: "500" });

const NOMBRE = "Luis Fernando";
export const GOLD = "#f3d27a";
const GOLD_GRADIENT = "linear-gradient(180deg, #fff4cf 0%, #f3d27a 45%, #c8932f 100%)";

type Foto = {
  src: string;
  texto: string;
  aspect: number; // ancho / alto
  origin: string; // punto hacia donde hace zoom (la cara)
  tilt: number;
};

const FOTOS: Foto[] = [
  { src: "luis/1-bateria.jpg", texto: "Con ritmo propio", aspect: 4 / 3, origin: "35% 30%", tilt: -2.5 },
  { src: "luis/2-topografia.jpg", texto: "Midiendo el mundo a su manera", aspect: 4 / 3, origin: "30% 35%", tilt: 2 },
  { src: "luis/3-sonrisa.jpg", texto: "Una sonrisa que contagia", aspect: 1, origin: "50% 30%", tilt: -1.5 },
  { src: "luis/4-playa.jpg", texto: "La mirada en el horizonte", aspect: 3 / 4, origin: "60% 40%", tilt: 2.5 },
  { src: "luis/5-espejo.jpg", texto: "Cada año, su mejor versión", aspect: 1, origin: "50% 25%", tilt: -2 },
  { src: "luis/6-pareja.jpg", texto: "Y con amor de sobra", aspect: 1, origin: "40% 35%", tilt: 1.5 },
];

export const INTRO = 195;
export const FOTO = 111;
export const OUTRO = 195;
export const TRANS = 18;
export const DURACION = INTRO + FOTOS.length * FOTO + OUTRO - (FOTOS.length + 1) * TRANS;

export const goldText: React.CSSProperties = {
  backgroundImage: GOLD_GRADIENT,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
  filter: "drop-shadow(0 4px 18px rgba(243,210,122,0.35))",
};

/* ---------- Fondo: degradado nocturno + bokeh dorado ---------- */
const Bokeh: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill>
      {new Array(38).fill(0).map((_, i) => {
        const size = 20 + random(`s${i}`) * 110;
        const x = random(`x${i}`) * width;
        const speed = 0.25 + random(`v${i}`) * 0.7;
        const y = (((random(`y${i}`) * height - frame * speed) % (height + 200)) + height + 200) % (height + 200) - 100;
        const tw = 0.5 + 0.5 * Math.sin(frame / (18 + random(`t${i}`) * 25) + i);
        const hue = random(`h${i}`) > 0.75 ? "255,170,190" : "243,210,122";
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - size / 2,
              top: y - size / 2,
              width: size,
              height: size,
              borderRadius: "50%",
              background: `radial-gradient(circle, rgba(${hue},0.55) 0%, rgba(${hue},0.15) 45%, rgba(${hue},0) 70%)`,
              opacity: 0.25 + tw * 0.55,
              filter: size > 90 ? "blur(6px)" : "blur(1px)",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const Fondo: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        "radial-gradient(ellipse at 50% 20%, #3b2350 0%, #1d1433 45%, #0b0a1a 100%)",
    }}
  >
    <Bokeh />
  </AbsoluteFill>
);

/* ---------- Intro ---------- */
const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = (delay: number) => spring({ frame: frame - delay, fps, config: { damping: 200 } });
  const letras = NOMBRE.split("");
  const linea = interpolate(frame, [60, 110], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
      <div
        style={{
          fontFamily: sans,
          letterSpacing: 18,
          fontSize: 38,
          color: "rgba(255,255,255,0.8)",
          opacity: a(5),
          transform: `translateY(${(1 - a(5)) * 30}px)`,
          textTransform: "uppercase",
        }}
      >
        Hoy celebramos a
      </div>
      <div style={{ fontFamily: script, fontSize: 190, lineHeight: 1.25, marginTop: 30 }}>
        {letras.map((l, i) => {
          const p = a(25 + i * 3);
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                opacity: p,
                transform: `translateY(${(1 - p) * 40}px) scale(${0.8 + p * 0.2})`,
                whiteSpace: "pre",
                ...goldText,
              }}
            >
              {l}
            </span>
          );
        })}
      </div>
      <div style={{ width: 520 * linea, height: 2, background: GOLD, opacity: 0.8, margin: "30px 0" }} />
      <div
        style={{
          fontFamily: serif,
          fontStyle: "italic",
          fontSize: 64,
          color: "white",
          opacity: a(95),
          transform: `translateY(${(1 - a(95)) * 30}px)`,
        }}
      >
        ¡Feliz cumpleaños!
      </div>
    </AbsoluteFill>
  );
};

/* ---------- Escena de foto ---------- */
const EscenaFoto: React.FC<{ foto: Foto; index: number }> = ({ foto, index }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const entra = spring({ frame, fps, config: { damping: 18, mass: 0.8 } });
  const zoom = interpolate(frame, [0, FOTO], [1.0, 1.1]);
  const texto = spring({ frame: frame - 18, fps, config: { damping: 200 } });

  const w = 900;
  const h = Math.min(w / foto.aspect, 1150);

  return (
    <AbsoluteFill>
      {/* Fondo: la misma foto difuminada */}
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <Img
          src={staticFile(foto.src)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "blur(40px) brightness(0.45) saturate(1.3)",
            transform: `scale(${1.3 + frame / durationInFrames / 10})`,
          }}
        />
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(11,10,26,0) 30%, rgba(11,10,26,0.75) 100%)" }} />
      </AbsoluteFill>

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        {/* Marco tipo polaroid */}
        <div
          style={{
            padding: 22,
            paddingBottom: 26,
            background: "#fbf7ef",
            borderRadius: 14,
            boxShadow: "0 40px 90px rgba(0,0,0,0.55)",
            transform: `translateY(${(1 - entra) * 120 - 80}px) rotate(${foto.tilt * entra}deg) scale(${0.9 + entra * 0.1})`,
            opacity: Math.min(1, entra * 1.5),
          }}
        >
          <div style={{ width: w, height: h, overflow: "hidden", borderRadius: 6 }}>
            <Img
              src={staticFile(foto.src)}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `scale(${zoom})`,
                transformOrigin: foto.origin,
              }}
            />
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 230,
            width: "100%",
            textAlign: "center",
            opacity: texto,
            transform: `translateY(${(1 - texto) * 30}px)`,
          }}
        >
          <div style={{ fontFamily: sans, fontSize: 26, letterSpacing: 10, color: GOLD, opacity: 0.85 }}>
            {String(index + 1).padStart(2, "0")} / {String(FOTOS.length).padStart(2, "0")}
          </div>
          <div style={{ fontFamily: serif, fontStyle: "italic", fontSize: 66, color: "white", marginTop: 14, textShadow: "0 4px 24px rgba(0,0,0,0.6)" }}>
            {foto.texto}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ---------- Final con confeti ---------- */
const COLORES = ["#f3d27a", "#ff8fab", "#9bd7ff", "#c3a6ff", "#ffffff", "#ffb86b"];

const Confeti: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {new Array(140).fill(0).map((_, i) => {
        const delay = random(`d${i}`) * 50;
        const t = Math.max(0, frame - delay);
        const x0 = random(`cx${i}`) * width;
        const vy = 6 + random(`cv${i}`) * 9;
        const sway = Math.sin(t / (8 + random(`cw${i}`) * 10) + i) * 40;
        const y = -60 + t * vy;
        if (y > height + 60) return null;
        const rot = t * (4 + random(`cr${i}`) * 10);
        const flip = Math.abs(Math.cos(t / 6 + i));
        const w = 14 + random(`cs${i}`) * 14;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x0 + sway,
              top: y,
              width: w,
              height: w * 0.45,
              background: COLORES[i % COLORES.length],
              borderRadius: i % 3 === 0 ? "50%" : 3,
              transform: `rotate(${rot}deg) scaleY(${0.3 + flip * 0.7})`,
              opacity: frame < delay ? 0 : 0.95,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const Final: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const pop = spring({ frame: frame - 8, fps, config: { damping: 10, mass: 0.7 } });
  const sub = spring({ frame: frame - 45, fps, config: { damping: 200 } });
  const brillo = 0.5 + 0.5 * Math.sin(frame / 10);
  const salida = interpolate(frame, [durationInFrames - 30, durationInFrames], [1, 0], { extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: salida }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 45%, rgba(243,210,122,${0.12 + brillo * 0.08}) 0%, rgba(0,0,0,0) 55%)` }} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
        <div style={{ fontFamily: serif, fontStyle: "italic", fontSize: 92, color: "white", transform: `scale(${pop})` }}>
          ¡Feliz cumpleaños,
        </div>
        <div style={{ fontFamily: script, fontSize: 170, lineHeight: 1.3, transform: `scale(${pop})`, ...goldText }}>
          {NOMBRE}!
        </div>
        <div
          style={{
            fontFamily: sans,
            fontSize: 40,
            lineHeight: 1.5,
            color: "rgba(255,255,255,0.88)",
            marginTop: 40,
            maxWidth: 820,
            opacity: sub,
            transform: `translateY(${(1 - sub) * 30}px)`,
          }}
        >
          Que este nuevo año venga lleno de ritmo, aventuras y mucho amor.
        </div>
        <div style={{ fontSize: 70, marginTop: 50, opacity: sub, transform: `scale(${0.9 + brillo * 0.1})` }}>🎂</div>
      </AbsoluteFill>
      <Confeti />
    </AbsoluteFill>
  );
};

/* ---------- Composición completa ---------- */
const transiciones = [
  fade(),
  slide({ direction: "from-right" }),
  fade(),
  slide({ direction: "from-bottom" }),
  fade(),
  slide({ direction: "from-left" }),
  fade(),
];

export const Cumple: React.FC = () => {
  const items: React.ReactNode[] = [];
  items.push(
    <TransitionSeries.Sequence key="intro" durationInFrames={INTRO}>
      <Intro />
    </TransitionSeries.Sequence>,
  );
  FOTOS.forEach((foto, i) => {
    items.push(
      <TransitionSeries.Transition key={`t${i}`} presentation={transiciones[i]} timing={linearTiming({ durationInFrames: TRANS })} />,
      <TransitionSeries.Sequence key={foto.src} durationInFrames={FOTO}>
        <EscenaFoto foto={foto} index={i} />
      </TransitionSeries.Sequence>,
    );
  });
  items.push(
    <TransitionSeries.Transition key="tfin" presentation={transiciones[6]} timing={linearTiming({ durationInFrames: TRANS })} />,
    <TransitionSeries.Sequence key="final" durationInFrames={OUTRO}>
      <Final />
    </TransitionSeries.Sequence>,
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#0b0a1a" }}>
      <Fondo />
      <TransitionSeries>{items}</TransitionSeries>
      <Audio src={staticFile("luis/musica.wav")} />
    </AbsoluteFill>
  );
};
