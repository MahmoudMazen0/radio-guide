# Our Medium-Wave Radio — a DIY guide

A static, hand-written HTML/CSS guide to the medium-wave AM radio our team builds for
**ELEG103 · Analog and Digital Electronics · Fall 2026** (SBME, Cairo University).
One section per milestone, telling the journey and the challenges we met.

No frameworks, no build step, no dependencies: hand-written HTML, CSS and a small vanilla-JS
widget, exactly what “a DIY guide on a static website” asks for.

---

## Structure

```
radio-guide/
├── index.html      Home: the team, the pipeline, the milestone list
├── m1.html         M1 · the radio's tuner and detector   ← the milestone to submit
├── css/style.css   All styling (design tokens at the top of the file)
├── js/sim.js       The interactive tank simulator (§4) — plain JS, no dependencies
├── favicon.svg     The tab icon
├── images/         Photographs and scope screenshots (see images/README.md)
└── README.md       This file
```

**M2 and M3 are placeholders for now.** To add one: copy `m1.html`, rewrite the sections,
and un-disable its link in the nav of `index.html`, `m1.html` and the new page.

---

## Editing

Everything is plain text. The `todo` class renders text in grey italic — use it for
placeholders you have not filled yet:

```html
<td class="num todo">measured</td>
```

When a measurement arrives, replace the whole cell with the value and drop the class:

```html
<td class="num">623</td>
```

Keep the section numbering (`1 ·`, `2 ·`, …) and the `id` anchors — the nav and the
figure captions rely on them.

---

## Publishing on GitHub Pages

1. **Create the repository**
   - GitHub → **New repository** → name it `radio-guide` → **Public** → Create.
   - Do *not* add a README when creating it (this folder already has one).

2. **Push this folder**
   ```powershell
   cd D:\study\2-Electronics\Lab\Milestones
   git init radio-guide
   cd radio-guide
   git add .
   git commit -m "M1: the radio's tuner and detector"
   git branch -M main
   git remote add origin https://github.com/<your-username>/radio-guide.git
   git push -u origin main
   ```

3. **Turn on Pages**
   - Repo → **Settings** → **Pages** → *Build and deployment* → Source: **Deploy from a branch** →
     Branch: **main** / **/(root)** → **Save**.

4. **Open the site** — after a minute or two:
   `https://<your-username>.github.io/radio-guide/`

   Put that link in your submission / show it to your M1 grader.

### Updating later

```powershell
cd D:\study\2-Electronics\Lab\Milestones\radio-guide
git add .
git commit -m "M1: fill Tables 5 and 6"
git push
```

Pages rebuilds itself on every push — usually within a minute.

---

## Design notes

- One stylesheet, tokens (colours, width, radius) declared in `:root` — change the accent
  once and the whole site follows.
- Readable at 17 px with a ~880 px column; collapses to a single column on phones.
- Print-friendly: the nav and footer drop out, so the grader can print a section.
- Images: keep them in `images/`, compress before committing (a screenshot at ~1500 px wide
  is plenty), and give every `<img>` an `alt`.
