# Portfolio site

Static site — plain HTML, CSS and JS. No build step. Two vendored dependencies:
a tree-shaken three.js build for the hero field, loaded lazily on wide screens,
and GSAP for the loader.
Built against the Figma file **Portfolio › Desktop - 9** (`node-id=239-1139`).

```
site/
├── index.html          markup + copy
├── bondata.html        case page — Bondata
├── css/style.css       tokens, layout, the folder-tab nav
├── css/case.css        case-page layout: contents rail, decisions, shots
├── js/loader.js        the intro loader timeline (GSAP)
├── js/main.js          tab building, scroll spy, per-section colour, burger
├── js/case.js          case page: burger + which contents link is current
├── js/field-gl.js      particle glyph fields — hero wordmark + footer logo (GPU)
├── js/ascii.js         the hero field, CPU version (fallback)
├── vendor/
│   ├── gsap.min.js     GSAP 3.15.0
│   ├── three-field.js  three.js r186, only the classes field-gl.js uses
│   └── three-LICENSE.txt
└── assets/
    ├── logo.svg
    ├── loader/         the project shots the loader flicks through
    ├── case-bondata/   the case's before/after screenshots (WebP, 2x)
    ├── Wlad.A.svg
    ├── about-star.webp       About photo, exported from Figma already cut to the star (2x)
    ├── about-photo.jpg       previous About photos — no longer used
    └── about-photo-alt.jpg
```

## Running it

Open `index.html` directly, or serve it (needed once anything is fetched):

```sh
cd site && python3 -m http.server 8000    # → http://localhost:8000
```

## Deploying

Nothing to build — point the host at this folder as the publish directory
(Vercel / Netlify / GitHub Pages / Cloudflare Pages all take it as-is).

## Fluid layout

The Figma file is drawn on a 1440 canvas with a 1360 content column, but its
**sizes are meant for a 1920 screen**. There is no max width — the page fills
any window — and two units do the scaling:

```
--u   = 1 Figma px at a 1920-wide window
          ≥ 1920   grows 1:1 with the window
          < 1920   shrinks by only --shrink (0.4) of the way
          < 1024   continues from the 1024 value, proportionally
--lu  = (viewport − 2 × gutter) / 1360   ← one px of the file's content column
```

`--shrink` sits at the top of `style.css`. At 0.4 a window 25% narrower than
1920 makes things 10% smaller, not 25% — the layout is roomy enough to carry
type that stays large. `1` is plain proportional scaling, `0` freezes sizes
below 1920.

- **`--u`** — type, spacing, and everything sized around type: chips, tags, the
  About photo, the nav chrome. Written `calc(N * var(--u))` with `N` straight
  from Figma.
- **`--lu`** — horizontal layout only: the work-card blocks (860 / 960), their
  media strips and gaps, the strips' height, and the footer's column starts.
  These keep the file's proportions of the column at every width, which is what
  keeps the strips bleeding off the right edge.
- **Text boxes** from the file (hero copy 587, About lead 591, About columns 322)
  are in `em` of their own type — `calc(587em / 32)` — so the measure is the
  file's and still fits when the type sits on its floor. The hero copy is set at
  40 instead of the file's 32; its box grows with it, so the lines break the same.
- Column positions written as percentages (66.1% etc.) are layout, as before.

Measured:

| viewport | hero | lead | body | title | eyebrow | chip | contact | tab |
|---|---|---|---|---|---|---|---|---|
| 2560 | 53.3 | 53.3 | 21.3 | 32 | 20 | 26.7 | 42.7 | 208 |
| **1920** | **40** | **40** | **16** | **24** | **15** | **20** | **32** | **156** |
| 1728 | 38.4 | 38.4 | 15.4 | 23 | 14.4 | 19.2 | 30.7 | 149 |
| 1440 | 36 | 36 | 14.5* | 21.6 | 13.5 | 18 | 28.8 | 140* |
| 1024 | 32.5 | 32.5 | 14.5* | 19.5 | 13.5* | 16.3 | 26 | 140* |
| 768 | 26* | 26* | 14.5* | 19* | 13.5* | 15* | 22* | — |

\* on its readability floor (`max(…)` in the type scale). There is no jump at
the 1024 breakpoint.

Below 1024 the gutter drops to 20px and the layout regroups into one column.
Hairlines — the nav rule and the tab outline — stay at 1px at every width.

## Palette

The whole palette moved in Desktop - 9. Nothing carries over from the earlier
warm/brown scheme except the three chip borders.

| token | value | used for |
|---|---|---|
| `--paper` | `#F5F3EE` | page ground |
| `--ink` | `#121212` | body copy, inactive tab label |
| `--accent` | `#D42823` | eyebrows, active tab label |
| `--paper-bright` | `#FFFEFC` | About band |
| `--coral` | `#FA4D48` | every hairline rule, the wordmark |
| `--rule` | `#B8B5B2` | nav hairline only |
| `--tag-bg` | `#E5DFD5` | work-card tags |
| `--dark` / `--on-dark` | `#121212` / `#F5F3EE` | contact footer |

Section rules (work cards, career rows) are `0.5px solid var(--coral)` — the
file draws them at half a pixel, which browsers render as a pale coral tint
rather than a crisp line. That is the intended look, not a rounding bug.

## Sections

Bands no longer share one rhythm. Each carries its own padding and they are
separated by a flat 40 from the file (`--gap-section`):

| band | padding | column |
|---|---|---|
| Intro | none, `100vh` | copy on the column's left edge, 40px type |
| Selected works | 120 | full 1360 |
| About | 120 | star photo (375.8) at the gutter, body at 66.1% |
| Career | 80 | 66.1%, right-aligned |
| Skills | 80 | 66.1%, right-aligned |
| Contact | 40 | full 1360 |

### The work cards bleed on purpose

A card is an 860-wide left block plus a 960-wide media row (in `--lu`) — 1820
against a 1360 column. That overflow is in the file: the image strips run off the right
edge and are cut by the viewport, not by the content column. So nothing clips
them locally; `overflow-x:hidden` on `body` is what ends them. Each strip's
width is a Figma number passed in as `style="--w:126"`, and every card shows a
different subset, which is why they are inline rather than a class.

Below 1024 the row stops bleeding and becomes a swipeable `overflow-x:auto`
strip instead.

### Contact is a real `<footer>`

It sits outside `<main>` but carries `data-nav`, so it owns tab 06 like any
other band. That is why `main.js` selects on `[data-nav]` rather than
`main section[id]`.

## Case pages

Figma **Portfolio › Case — Bondata · kit** (`node-id=343-5478`). One page per
case, `bondata.html` first. Three rules hold them together.

**The bar never changes.** A case page is still the same site, so the six tabs
stay and keep pointing at the home page's bands — written out in the markup
rather than built, with 02 marked `aria-current`. That is also why `js/main.js`
is not loaded here: it builds tabs from the page's own `[data-nav]` bands, and
a case page has none. `js/case.js` picks up the burger instead.

**The case's own sections go to a contents rail**, sticky in the left column
for the whole page: Home, then Overview, Decisions, Results. `js/case.js` only
marks which one you are reading. Under 1024 the grid becomes a column and the
rail turns into a strip pinned under the bar.

**The page is one grid**, 346 + 1014 in `--lu` — the file's aside and content
column. The cover is row one and bleeds to both window edges; everything else
is one body block in column two. The rail spans row two so it can travel the
whole page without a scroll handler.

| block | what it is | from the file |
|---|---|---|
| Cover | full-bleed **video**, muted and looping, flush under the bar | 1440 × 539, 0.5 rule |
| Overview | title, subtitle, five meta columns between two dividers, then Context / Problem / Outcome / Ownership | pad 40/80, column gap 24 |
| Decisions | number, title, one paragraph, then Before and After shots with a divider between them | pad 80/80; a stacked decision pads 80, a side-by-side pair 40 |
| Shots | the screenshot on `--media` inside a 0.5 rule, label above in grey SemiBold | image block gap 12, side padding 24 |
| List marker | the file's four-point spark, inlined as `--spark` and masked in coral | 12 × 12 |
| Notes | numbered captions under a Before shot, in boxes on the same ground — the badges are drawn on the screenshot itself | two to a row, gap 16, pad 24, red 24px badge |
| Tabs | two states of one shot (decision 01: expanded and collapsed filters) | 40 tall, radius 8, active on paper |
| What else changed | a list, each line led by the coral spark | pad 80/80 |
| Results | Results, What I'd do differently, What's next, labels in red | pad 120/120 on **white** |
| Other projects | the home page's work rows, full width, media bleeding off the right edge | pad 120/120 |

Two greys that are not in `style.css` live here: `--muted` `#737373` for labels,
shot captions and notes, and `--note` `#FF0000` for the badge. Every rule and
divider on the site — work rows, career rows, the case's dividers — is `--rule`
`#B8B5B2` at 0.5; the accent is for type only.

Screenshots live in `assets/case-bondata/` as WebP at twice their drawn size
(765 KB for ten). Every one keeps the proportions of its own file — the width
and height attributes carry the ratio, so nothing is cropped and a tall shot is
scaled down whole.

Bands run Cover and Overview on the paper, Decisions on **white**, What else
changed on the paper, Results on **white**, Other projects on the paper. A band
bleeds with negative margins and takes the aside back as padding, so the ground
reaches both window edges while the text stays in the column. Other projects
sits outside the case grid: the contents rail is sticky inside that grid and
would otherwise ride over it.

## Loader

Figma **Portfolio › Loader** (`node-id=269-936`). The logo is split into its two
initials, W left and A right, with a parallelogram project frame between them
(the frame's slant is the W's last stroke). The page opens on exactly that
frame — nothing enters. About 3 s, one GSAP timeline in `js/loader.js`:

| phase  | what happens                                                         | tune          |
|--------|----------------------------------------------------------------------|---------------|
| flick  | `assets/loader/img*.webp` run past inside the frame, in file order — slow, fast, slow: every shot owns an equal slice of an in-out eased progress | `T.flick` (whole run), `FLICK_EASE` |
| close  | the halves slam together over the frame and land as the whole logo; the strokes the letters share turn red — that is `logo.svg` | `T.close`, `T.hold` |
| exit   | the dark ground lifts, the logo flies onto the nav logo and takes its place, the hero copy rises in | `T.exit` |

- **Adding or reordering shots:** edit the `<img>` list inside `.loader__reveal`
  in `index.html`. The first one is the opening frame (it is also preloaded in
  `<head>`). The flick waits for the shots to decode, at most
  `WAIT_FOR_SHOTS` ms; any not ready by then are skipped.
- **Size:** laid out in Figma px of the 1440 frame times `--lk`, so the
  composition is half the window wide, never wider than the window minus gutters.
- **Colour during the flight** follows the ground's lower edge: the logo is
  light while over the dark, dark once over the page.
- **Never traps the page.** The loader only draws while `<html>` has
  `.is-loading`, added by a tiny script in `<head>`: skipped under
  `prefers-reduced-motion`, taken down by a 6 s timer there if `loader.js` never
  runs, and removed at once if GSAP is missing.
- `ONCE_PER_SESSION = true` plays it on the first page view of a tab only.
- The page is scrolled to the top for it (unless the URL has a `#section`), and
  scroll is locked until the exit starts.

## Hero

The hero is `100vh` (`100svh` where supported), not the 828 from the file. The
copy is held at `calc(213 * var(--u))` from the top — a distance, not a
percentage, so it keeps the same gap under the bar at any viewport height.
Percentage padding would resolve against *width*, which is the wrong axis.

## Character field

### GPU version — `js/field-gl.js` (default)

A rebuild of artefakt.mov's hero for our wordmark, with their parameters:

1. **Particles.** `assets/Wlad.A.v2.svg` is extruded into a solid (three.js
   `SVGLoader` + `ExtrudeGeometry`) and 65,536 points are scattered over its
   surface. A GPU simulation (`GPUComputationRenderer`) gives each point a life
   cycle: born at home, drifts on a 4D simplex-noise flow field
   (influence .43 / strength 1.09 / frequency .53), springs back, fades out, is
   reborn. Random starting ages keep that out of step — that is the glyph
   flicker. Points are lit by the surface normal they came from.
2. **Cursor.** A ray from the pointer hits an invisible low-poly copy of the
   word; points near the hit are pushed away with a force that follows pointer
   **speed** (×500, eased .15, capped .1), so a still cursor does nothing. The
   word also tilts toward the pointer (0.2 / 0.05, eased .09).
3. **ASCII.** Points render into a 30%-size buffer; a fullscreen shader splits
   it into 145 columns and swaps each cell for a glyph from an atlas, picked by
   brightness (ramp `' .:-=+*#%@WLAD'`, contrast 1.09).

Three deliberate departures from artefakt, all for a light page:

- **Ink instead of white.** Their glyphs are white, brightened by luma, on
  black. Here the glyph is the alpha of the coral ink.
- **Sampling weighted to the front face.** The extruded word is 23% front, 23%
  back and 54% side walls, and the back and most walls are unlit. Spread evenly,
  the points that can be seen were too sparse and the word broke up. The front
  face gets weight 4 (`frontWeight`), lit walls 0.5, the rest ≈0.
- **Cell centre, not corner.** Their pass samples each cell at its corner,
  which falls between texels and averages four; sampling the centre reads the
  cell's own brightness.

**Loading.** `index.html` picks the field before any script runs:
WebGL2 + `EXT_color_buffer_float` + an http(s) page → `data-field="gl"`,
otherwise `cpu`. three.js is imported dynamically, and not at all under
`minWidth` (1024). If the GPU field fails, or has not reported in 6 s, it fires
`field:fallback` and `ascii.js` starts. Tested with WebGL disabled: the CPU field
comes up on its own.

**Cost.** Per frame the page does no text layout at all — the old field
rewrote ~12k glyphs of DOM text 24 times a second. The loop stops when the hero
is off screen or the tab is hidden; under reduced motion it draws one still
frame.

**Tuning.** `H` opens one panel for both fields, with a **Hero / Footer**
switch at the top (switching scrolls to that field). Each field keeps its own
values in this browser (`field-gl-v1`, `field-gl-footer-v1`). *Copy CONFIG* /
*Copy FOOTER* gives the object to paste over that constant; set
`DEV_PANEL = false` to ship. Depth, front weight and particle count are baked
into the particle positions, so they are saved but apply after a reload.
Debug views: `?field=raw` (particles, no ASCII), `?field=buffer` (what the ASCII
pass samples), `?field=still` (flow off).

**Rebuilding `vendor/three-field.js`.** An esbuild bundle of `three@0.186.0`
exporting only: `WebGLRenderer, WebGLRenderTarget, Scene, Group,
PerspectiveCamera, OrthographicCamera, Mesh, Points, BufferGeometry,
BufferAttribute, PlaneGeometry, ExtrudeGeometry, ShaderMaterial,
MeshBasicMaterial, CanvasTexture, NearestFilter, Vector2, Vector3, Raycaster,
Clock, DoubleSide, NoBlending` plus addons `SVGLoader`,
`GPUComputationRenderer`, `MeshSurfaceSampler`. 601 KB, 155 KB gzipped.

### Footer — the logo mark

The footer is a full screen (`100vh`, the bar's height added to its top
padding so the contacts are not under the fixed nav). Contacts run along the
top — email and phone in semibold capitals at x=519.67, links at 1079.33,
*Download CV* at the right edge — the copyright sits at the foot, and the space
between is a second particle field drawing `assets/logo.svg`, 934 of 1360
wide, its left edge in line with the copyright.

`field-gl.js` is a factory (`createField(stage, cfg)`): the hero uses `CONFIG`,
the footer `FOOTER`, and three.js is imported once for both. Each field stops
its own loop when off screen.

| | hero | footer | why |
|---|---|---|---|
| ink | `#FA4D48` | `#F5F3EE` | the footer is `#121212` — artefakt's own light-on-black case |
| placement | centred, `posX/posY` | `anchor: 'left'` | the mark's left edge lands on the field's padding |
| glyph size | 145 columns | `cell: 9` px | about the hero's cell, independent of field width |
| tilt | from the window | none (`tiltX/Y: 0`) | the mark stays flat to the page |
| depth | 0.5 | 1.2 | a compact mark shows its sides when it tilts |

The field's box runs out to the viewport edges (negative margin) with the
gutter as padding, so drift and tilt are not cut at the column; the script
reads that padding to place the mark.

**Front face on the pixel plane.** One scene unit is one pixel only at z = 0.
Both fields push the solid back so its front face sits exactly there; centred
on its depth, the front face was nearer the camera and perspective enlarged the
shape — ~5% in the hero, ~13% for the deeper footer mark, which also pulled it
left of the column.

No CPU fallback for the footer, and hidden under 1024px: without WebGL the band
is empty.

### CPU version — `js/ascii.js` (fallback)

`js/ascii.js` paints a character grid in the hero. It is `position:absolute`
inside the hero section, so it scrolls away with it — it does **not** follow
the page any more. The element's box comes entirely from CSS; the module just
reads it.

In the file this slot is a Figma dither shader over the word `Wlad.A`. Here the
same slot is the character field, placed to match: `scale 96 / posX -1 /
posY 29` puts the word 1390 of 1440 wide with its foot on the hero's bottom
edge, exactly where the file crops it. Ink is the file's coral `#FA4D48`.

The object — the `Wlad.A` wordmark by default, or the logo mark, or any typed
word — is rasterised **once** into an offscreen canvas and kept as a density
map; every frame each cell of the grid inverse-projects into that map and picks
a glyph by density. No WebGL, no dependencies. Measured cost: **1.5 ms of
script per frame** for 16.6k cells.

An `IntersectionObserver` on the hero stops the loop once the hero is off
screen — the field cannot be seen from anywhere else on the page, so there is
nothing to pay for.

### Objects

- **`wordmark`** — `assets/Wlad.A.v2.svg`, inlined into `ascii.js`. Two things
  differ from the file: the fill is swapped from `#FA4D48` to black (density is
  inverted luminance, and the coral only reaches ~0.56, so the whole word would
  top out mid-ramp), and it rasterises at 1024 wide instead of 512 so a 4:1
  word keeps its strokes. If the asset changes, the inline copy has to be
  regenerated.
- **`logo`** — the header mark.
- **`text`** — any word, set in Inclusive Sans.

The blur radius follows the map's **height**, not its width. Sized by width, a
wide word gets blurred roughly 3.6× harder relative to its strokes than the
mark does and dissolves into mush.

### Lighting

Flat vector art has no shading of its own — every fill is one tone — so straight
off the rasteriser it quantises into slabs of a single glyph. Two things fix
that, in order:

1. **`soft`** box-blurs the density map, which gives every edge a falloff.
2. **`light`** treats that falloff as a height field: a Sobel gradient turns it
   into normals (cached with the map), and a directional light shades them.

The lambert is **normalised against a flat, front-facing normal**. Without that
step the flat core of the mark takes the same hit as everything else and the
whole form simply dims instead of gaining a bevel — the core sits at exactly 1
and only the tilted edges ride above or below it.

Set `light: 0` for the old flat look, `soft: 0` to see the raw stencil.

### Charsets

`brand` is the classic ramp with the name pushed onto its dense end —
`' .:-=+*#%@WLAD'` — so the core of the mark is spelled out in its own letters.
Lifted from artefakt.mov, who append `4RT3F` to the same ramp.

**Tuning.** Press `H` for a panel of live controls; values persist in
`localStorage` for that browser. When the look is right, hit *Copy config* and
paste the result over `CONFIG` at the top of `js/ascii.js`, then set
`DEV_PANEL = false` — the panel's markup, styles and listeners then never get
created.

Panel values moved to `ascii-bg-config-v3` with the redesign. Look settings
carry over from the old key; placement and ink do not, because both were tuned
against a full-viewport field and the previous palette.

**Notes**

- Off below `minWidth` (1024 by default) — a full-screen grid on a phone is
  cost with no payoff.
- Frozen under `prefers-reduced-motion`; the loop also stops while the tab is
  in the background.

## Grain

A tiled fractal-noise speckle (`body::after`, SVG `feTurbulence` as a data URI)
over the whole page, opacity `--grain-opacity` — set from `CONFIG.grain` in
`ascii.js`, with `.08` as the CSS fallback. Tunable from the `H` panel.

It sits **above** the content, not on the paper. The active folder tab is a flat
fill that has to match the page beneath it; grain on the page but not in the bar
would leave a visible seam at the tab. One layer over everything keeps them
identical.

Plain alpha, no `mix-blend-mode` — a blended full-screen layer would have to be
recomposited on every scroll frame.

## Pixel-snapping the bar

Two things keep the tab feet clean where they meet the hairline:

- `--nav-h` is passed through `round(…, 1px)` (behind `@supports`, so old
  browsers just keep the fractional value). The bar's bottom edge carries the
  hairline and the foot of every tab; on a fractional height they all land
  between device pixels and the join goes soft.
- `.nav` has `overflow:hidden`. Each tab outline ends *on* that bottom edge,
  so half its 1px stroke — plus both butt caps — would otherwise render below
  the bar and sit on the page as little stubs.

## How the nav works

The folder effect is a z-index sandwich inside the bar, and nothing is drawn
per tab:

| layer          | z-index | effect                                        |
|----------------|---------|-----------------------------------------------|
| inactive tabs  | 1       | the hairline paints across them → "closed"     |
| `.nav__rule`   | 10      | one 1px line across the whole bar              |
| active tab     | 20      | covers the line → it breaks, the tab is "open" |

The tab outline is the Figma vector verbatim (`PLATE` / `EDGE` in `main.js`):
155.694 wide, 158 pitch, 32 tall, first tab 110 in from the gutter — all
multiplied by `--nav-u`. Labels are lowercased in CSS, as in the file.

`js/main.js` writes three things as you scroll:

- `.is-active` on one tab
- `--p` on that tab — how far through the section you are, 0 → 1
- `--section-bg` / `--section-fg` on `:root`, read from each band's
  `data-bg` / `data-fg` attributes

### Changing a section's colour

One attribute in `index.html`:

```html
<section id="about" data-nav="about" data-bg="#FFFEFC" data-fg="#D42823">
```

`data-bg` fills the active tab, `data-fg` colours its label. They should match
whatever background that section actually paints.

### Solid vs progress fill

`FILL_MODE` at the top of `js/main.js`:

- `'solid'` — the tab fills the moment it becomes active (this is the design)
- `'progress'` — the tab fills left to right as you read through the section,
  and the label recolours along the same edge

Both are wired; `solid` is the default.

## Known gaps

- Three of the four project cards are Figma placeholders (`Project Name` /
  lorem / eight identical `Web Design` tags). Only the first is real.
- `( view )` links, `Download CV`, the social links and the `PL / EN` switch are
  visual only, no behaviour yet.
- `assets/portrait-hero.png` and `assets/portrait-about.png` are left over from
  Desktop - 4 and no longer referenced — safe to delete.
- Text wraps a line differently from Figma in a couple of places — Chrome and
  Figma measure the same string slightly differently. Not a layout error.
