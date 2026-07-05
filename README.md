# Starfield

[Live demo](https://starfield-9y4.pages.dev)

Starfield is a non-commercial sky exploration prototype that jumps from a
rotating 3D Earth to a local all-sky view with stars and deep-sky highlights.

The SKY stage uses `astronomy-engine` to convert bright star right ascension and
declination into altitude/azimuth for the selected latitude, longitude, and
current UTC time, then projects the visible hemisphere onto a flat planisphere.

## Experience

- Earth: rotating Earth with atmosphere glow and a deep static starfield.
- Direct sky entry: click a location or enter coordinates, then immediately show
  the local sky without camera descent or flip animation.
- Sky: fixed flat all-sky chart with approximate visible star positions and
  image-backed deep-sky highlights. Center is the zenith; the outer edge
  represents the horizon.

## Scope

- This is a visual exploration app, not a scientific-grade planetarium.
- Star positions are based on a real star catalog and local sky math, but the
  current chart should be treated as an approximation.
- Deep-sky objects are image-backed visual highlights. Their on-screen size,
  brightness, and visibility are tuned for exploration, not calibrated
  observation.
- This project is not reviewed, approved, sponsored, or endorsed by NASA.

## Stack

- React + Vite + TypeScript
- Three.js + React Three Fiber + Drei
- astronomy-engine
- Tailwind CSS

## Data And Attribution

- NASA imagery is used as source-attributed, publicly available media under
  NASA's [Images and Media Usage Guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/).
  The app does not use NASA logos, seals, or insignia. Per-image source URLs,
  credits, and third-party rights notes are tracked in
  `public/vendor/nasa/SOURCE.txt`.
- Star positions and names are vendored from
  [ofrohn/d3-celestial](https://github.com/ofrohn/d3-celestial) under
  BSD-3-Clause and rendered with `astronomy-engine`.
- City search uses a curated GeoNames-derived local list in `src/data/cities.ts`.
- `spacekit`, `VirtualSky`, and Stellarium Web Engine are useful references, but
  their code is not imported into this project.

## Known Limitations

- The sky chart does not yet apply full precession or proper-motion correction
  for the observation date.
- Deep-sky highlights are not calibrated to real apparent size, surface
  brightness, or naked-eye visibility.
- First-time deep-sky rendering can still be affected by browser image decode,
  GPU texture upload, and shader warm-up on slower devices.

## Development

```bash
pnpm install
pnpm dev
pnpm ts-type-check
pnpm lint
pnpm build
```

## Deployment

Production is hosted on Cloudflare Pages:

- URL: https://starfield-9y4.pages.dev
- Project: `starfield`
- Production branch: `main`

Pushes to `main` are deployed by the GitHub Actions workflow in
`.github/workflows/deploy-cloudflare-pages.yml`.
