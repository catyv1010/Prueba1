"""Genera public/luis/musica2.wav: balada de piano (0-30 s) que desemboca en "Cumpleaños feliz"."""
import sys
import wave

import numpy as np

SR = 44100
BEAT = 0.75  # segundos por tiempo (80 BPM, compás 3/4)
BALADA = 30.0  # segundos de balada antes del cumpleaños
TOTAL = 53.0

NOTE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def freq(n: str) -> float:
    name, octave = n[:-1], int(n[-1])
    midi = 12 * (octave + 1) + NOTE[name[0]] + (1 if "#" in name else 0)
    return 440.0 * 2 ** ((midi - 69) / 12)


CHORDS = {
    "C": ["C3", "E4", "G4", "C5"],
    "F": ["F2", "A3", "C4", "F4"],
    "G7": ["G2", "B3", "D4", "F4"],
    "C7": ["C3", "E4", "G4", "A#4"],
    "Am": ["A2", "C4", "E4", "A4"],
    "G": ["G2", "B3", "D4", "G4"],
}

MELODY = [
    ("G4", 0, .75), ("G4", .75, .25), ("A4", 1, 1), ("G4", 2, 1), ("C5", 3, 1), ("B4", 4, 2),
    ("G4", 6, .75), ("G4", 6.75, .25), ("A4", 7, 1), ("G4", 8, 1), ("D5", 9, 1), ("C5", 10, 2),
    ("G4", 12, .75), ("G4", 12.75, .25), ("G5", 13, 1), ("E5", 14, 1), ("C5", 15, 1), ("B4", 16, 1),
    ("A4", 17, 1), ("F5", 18, .75), ("F5", 18.75, .25), ("E5", 19, 1), ("C5", 20, 1), ("D5", 21, 1),
    ("C5", 22, 3),
]

# (tiempo de inicio relativo a la melodía, acorde, duración en tiempos)
HARMONY = [
    (1, "C", 3), (4, "G7", 3), (7, "G7", 3), (10, "C", 3), (13, "C7", 3),
    (16, "F", 3), (19, "C", 2), (21, "G7", 1), (22, "C", 3),
]

out = np.zeros(int(SR * TOTAL) + SR)


def add(f, start, dur, amp, decay, harmonics=((1, 1.0),), attack=0.005):
    n = int(SR * dur)
    t = np.arange(n) / SR
    env = np.exp(-t / decay) * np.minimum(1, t / attack)
    tail = int(SR * 0.05)
    env[-tail:] *= np.linspace(1, 0, tail)
    wav = sum(a * np.sin(2 * np.pi * f * h * t) for h, a in harmonics)
    i = int(SR * start)
    out[i:i + n] += amp * env * wav


BOX = ((1, 1.0), (2, 0.25), (3, 0.08), (5.4, 0.04))  # timbre de caja musical
PIANO = ((1, 1.0), (2, 0.35), (3, 0.15), (4, 0.05))


def box(note, start, beats, amp=0.30):
    add(freq(note), start, max(beats * BEAT, 1.6), amp, 0.9, BOX)
    add(freq(note) * 2, start, 1.0, amp * 0.12, 0.25)  # brillo


def waltz(chord, start_beat, beats, origin, amp=0.10):
    notes = CHORDS[chord]
    for b in range(beats):
        t = origin + (start_beat + b) * BEAT
        if b == 0:
            add(freq(notes[0]), t, 1.6, amp * 1.6, 0.6, PIANO)
        else:
            for n in notes[1:]:
                add(freq(n), t, 0.9, amp * 0.55, 0.3, PIANO)


def pad(chord, start, dur, amp=0.035):
    for n in CHORDS[chord][1:]:
        for det in (0.997, 1.003):
            nsamp = int(SR * dur)
            t = np.arange(nsamp) / SR
            env = np.minimum(1, t / 0.8) * np.minimum(1, (dur - t) / 0.8)
            i = int(SR * start)
            out[i:i + nsamp] += amp * env * np.sin(2 * np.pi * freq(n) * det * t)



# ---- Balada 4/4: arpegios de piano + campanitas ----
PROG = ["C", "G", "Am", "F", "C", "G", "Am", "F", "F", "G7"]
MOTIVO = {"C": ["E5", "G5"], "G": ["D5", "B4"], "Am": ["C5", "E5"], "F": ["A4", "C5"], "G7": ["B4", "D5"]}
BAR = 4 * BEAT
for k, chord in enumerate(PROG):
    t0 = k * BAR
    notes = CHORDS[chord]
    pad(chord, t0, BAR + 0.5, amp=0.03 if k < 8 else 0.045)
    patron = [notes[0], notes[1], notes[2], notes[3], notes[2], notes[1], notes[2], notes[3]]
    for j, n in enumerate(patron):
        t = t0 + j * BEAT / 2
        if t >= BALADA - BEAT:
            break
        add(freq(n), t, 1.4, 0.07 if j else 0.11, 0.5, PIANO)
    if k >= 1:  # la campanita entra en el segundo compás
        for j, n in enumerate(MOTIVO[chord]):
            box(n, t0 + j * 2 * BEAT, 2, amp=0.12)

# ---- Cumpleaños feliz (vals 3/4) ----
origin = BALADA - BEAT  # anacrusa
for note, b, d in MELODY:
    box(note, origin + b * BEAT, d, amp=0.30)
    lo = note[:-1] + str(int(note[-1]) - 1)
    add(freq(lo), origin + b * BEAT, max(d * BEAT, 1.0), 0.08, 0.6, PIANO)  # refuerzo una octava abajo
for b, chord, d in HARMONY:
    waltz(chord, b, d, origin, amp=0.12)
    pad(chord, origin + b * BEAT, d * BEAT + 0.3, amp=0.04)

end = origin + 25 * BEAT
pad("C", end, 5.0, amp=0.05)
for j, n in enumerate(["C5", "E5", "G5", "C6", "E6", "G6", "C7"]):
    box(n, end + j * 0.12, 2, amp=0.14)

# Reverb sencilla (combs) y normalización
dry = out.copy()
for delay, g in ((0.031, 0.35), (0.047, 0.3), (0.071, 0.25), (0.113, 0.2), (0.167, 0.15)):
    d = int(SR * delay)
    out[d:] += g * dry[:-d]
out = out[: int(SR * TOTAL)]
fade = int(SR * 2.5)
out[-fade:] *= np.linspace(1, 0, fade)
out = out / np.max(np.abs(out)) * 0.85

stereo = np.stack([out, np.roll(out, int(SR * 0.012))], axis=1)
with wave.open(sys.argv[1], "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((stereo * 32767).astype(np.int16).tobytes())
print("ok", TOTAL, "s")
