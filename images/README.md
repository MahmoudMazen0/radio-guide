# images/ — what goes here

`m1.html` already points at these files. This is the state of the folder:

| File | State | Where it appears | What it shows |
|---|---|---|---|
| `coil.jpg` | ✅ in | §5 Build, first figure | The 75-turn winding on the 50 mm PVC pipe, taped and filmed |
| `breadboard.jpg` | ✅ in | §5 Build, second figure | The breadboard: tuning capacitor, 1N60P, 15 kΩ, 3.3 nF, flying leads |
| `resonance.png` | ✅ in | §6 Measure, Figure 2 | Two scope frames side by side: detuned (small sine) vs tuned to f₀ (large sine), same 1.00 V/div and 500 ns/div |
| `tp1-scope.png` | ✅ in | §6 Measure, Figure 3 | TP1 at f₀ on the RIGOL DS1052E, measurement table open |

All four load. Nothing is missing from this folder.

> ⚠️ The two source files were originally swapped: `12.44.58 PM.jpeg` is the **coil**, and
> `12.45.18 PM.jpeg` is the **breadboard**. Both are now in the right place.

## Optional, but they earn their place

| File | Where it would go | What it should show |
|---|---|---|
| `tp3-dmm.png` | §6, beside Table 6 | The multimeter reading TP3’s DC |
| `loop-position.jpg` | §5 | The test loop a few centimetres from the coil, on the same axis |
| `qucs-tank.png` | §4 | Qucs-S / ngspice AC sweep of the tank, if you want the widget cross-checked |

## How the two scope images were made

Both come from `1\WhatsApp Video 2026-11-03 at 2.11.36 PM.mp4`:

- **`tp1-scope.png`** — frame 345, cropped to the LCD and upscaled 4×.
- **`resonance.png`** — two frames (195 and 345) at the same crop, same scale, with a caption bar.

Something worth knowing while reading them: on both frames the scope is on **1.00 V/div** and
**500 ns/div**, and one cycle spans about 3.3 divisions. That is

```
T = 3.3 × 500 ns = 1.65 µs  →  f ≈ 600 kHz
```

which is the independent evidence that the tank sits near 600–620 kHz, not at the 819 kHz of
Table 4. §8.3 and §7 explain why.

## Notes

- **Compress before committing.** ~1500 px wide is plenty; aim for under 300 kB each.
  Windows: open in Photos → *Save as* → JPEG at 80 %.
- Keep the aspect ratio of the original — the layout is fluid and does not crop.
- `alt` text is already written into `m1.html`; update it if a photo shows something else.
- Anything not in this list can still be added: put it here, then add an
  `<img src="images/…">` inside a `<figure>` where you want it.
