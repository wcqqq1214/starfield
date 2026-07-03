# Starfield

Immersive React Three Fiber visualization that dives from a rotating 3D Earth
to a local sky dome. The SKY stage uses `astronomy-engine` to convert bright
star right ascension and declination into altitude/azimuth for the selected
latitude, longitude, and current UTC time.

## Experience

- EARTH: rotating Earth with atmosphere glow and a deep static starfield.
- TRANSITIONING: GSAP-powered nonlinear camera descent toward a clicked or
  entered ground location.
- FLIP: near-surface 180 degree handoff from Earth overlook to skyward camera.
- SKY: ground-locked first-person drag view with real-time visible bright stars.

## Stack

- React + Vite + TypeScript
- Three.js + React Three Fiber + Drei
- GSAP
- astronomy-engine
- Tailwind CSS + Framer Motion

## Open Source Data And References

- Earth texture is vendored from
  [NASA SVS item 3615](https://svs.gsfc.nasa.gov/3615/). The copied texture
  lives in `public/vendor/nasa/flat_earth03.jpg`. Credit:
  NASA/Goddard Space Flight Center Scientific Visualization Studio; Blue Marble
  Next Generation data courtesy of Reto Stockli (NASA/GSFC) and NASA Earth
  Observatory.
- Runtime star, constellation, and Milky Way data is vendored from
  [ofrohn/d3-celestial](https://github.com/ofrohn/d3-celestial), licensed under
  BSD-3-Clause. The copied files live in `public/vendor/d3-celestial/`, including
  the upstream `LICENSE`.
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
