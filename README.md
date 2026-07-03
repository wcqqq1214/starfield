# Starfield

Immersive React Three Fiber visualization that jumps from a rotating 3D Earth to
a clean local all-sky chart. The SKY stage uses `astronomy-engine` to convert
bright star right ascension and declination into altitude/azimuth for the
selected latitude, longitude, and current UTC time, then projects the visible
hemisphere onto a flat planisphere.

## Experience

- EARTH: rotating Earth with atmosphere glow and a deep static starfield.
- DIRECT SKY ENTRY: click a location or enter coordinates, then immediately show
  the local sky without camera descent or flip animation.
- SKY: fixed flat all-sky chart with true visible star positions. Center is the
  zenith; the outer edge represents the horizon.

## Stack

- React + Vite + TypeScript
- Three.js + React Three Fiber + Drei
- astronomy-engine
- Tailwind CSS + Framer Motion

## Open Source Data And References

- Earth texture is vendored from
  [NASA SVS item 3615](https://svs.gsfc.nasa.gov/3615/). The copied no-cloud
  texture lives in `public/vendor/nasa/earth_noClouds.0330.jpg`. Credit:
  NASA/Goddard Space Flight Center Scientific Visualization Studio; Blue Marble
  Next Generation data courtesy of Reto Stockli (NASA/GSFC) and NASA Earth
  Observatory.
- Runtime star positions and star names are vendored from
  [ofrohn/d3-celestial](https://github.com/ofrohn/d3-celestial), licensed under
  BSD-3-Clause. The copied files live in `public/vendor/d3-celestial/`,
  including the upstream `LICENSE`. Constellation and Milky Way line rendering is
  intentionally disabled for the current clean-sky prototype.
- City search uses a curated local config in `src/data/cities.ts`. Coordinates
  are derived from GeoNames populated-place records
  ([Creative Commons Attribution](https://www.geonames.org/)). The list includes
  national capitals, cities with population of at least 300,000, and first-level
  administrative capitals above 50,000. Mainland China, Hong Kong, Macao, and
  Taiwan are grouped under China; the full GeoNames dump is not vendored.
- [typpo/spacekit](https://github.com/typpo/spacekit) is a useful MIT-licensed
  Three.js reference for larger-scale solar-system and particle visualization,
  but it is not imported into this app.
- [slowe/VirtualSky](https://github.com/slowe/VirtualSky) is a useful
  planetarium/math reference, but this app keeps `astronomy-engine` as the local
  astrometry engine instead of copying VirtualSky code.
- [Stellarium Web Engine](https://github.com/Stellarium/stellarium-web-engine)
  is useful as a correctness benchmark, but it is not vendored because its
  AGPL-style licensing and engine scope are not a fit for this lightweight R3F
  prototype.

## Development

```bash
pnpm install
pnpm dev
pnpm ts-type-check
pnpm lint
pnpm build
```
