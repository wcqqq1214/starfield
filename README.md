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

## Development

```bash
pnpm install
pnpm dev
pnpm ts-type-check
pnpm lint
pnpm build
```
