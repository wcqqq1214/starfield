export type DeepSkyObjectKind =
  | 'cluster'
  | 'galaxy'
  | 'nebula'
  | 'planetary-nebula'

export type DeepSkyVisualStyle =
  | 'dumbbell'
  | 'emission'
  | 'galaxy'
  | 'globular'
  | 'reflection'
  | 'ring'

export type DeepSkyObject = {
  id: string
  name: string
  kind: DeepSkyObjectKind
  visualStyle: DeepSkyVisualStyle
  raDeg: number
  decDeg: number
  magnitude: number
  angularSizeArcMin: number
  color: string
  accentColor: string
  imagePath: string
  aspectRatio: number
  rotationDeg: number
  glowStrength: number
  renderProfile: DeepSkyRenderProfile
}

export type DeepSkyRenderProfile = {
  alphaHigh: number
  alphaLow: number
  colorMaskBoost: number
  contrast: number
  edgePower: number
  hazeStrength: number
  opacity: number
  sizeScale: number
  tintMix: number
}

export const DEEP_SKY_OBJECTS = [
  {
    id: 'm13',
    name: 'Hercules Cluster',
    kind: 'cluster',
    visualStyle: 'globular',
    raDeg: 250.42,
    decDeg: 36.46,
    magnitude: 5.8,
    angularSizeArcMin: 20,
    color: '#fff2d4',
    accentColor: '#c9ddff',
    imagePath: '/vendor/nasa/deep-sky/m13-hercules.webp',
    aspectRatio: 1,
    rotationDeg: 0,
    glowStrength: 0.78,
    renderProfile: {
      alphaHigh: 0.46,
      alphaLow: 0.055,
      colorMaskBoost: 0.34,
      contrast: 1.08,
      edgePower: 2.25,
      hazeStrength: 0.02,
      opacity: 0.78,
      sizeScale: 0.78,
      tintMix: 0.1,
    },
  },
  {
    id: 'm57',
    name: 'Ring Nebula',
    kind: 'planetary-nebula',
    visualStyle: 'ring',
    raDeg: 283.4,
    decDeg: 33.03,
    magnitude: 8.8,
    angularSizeArcMin: 1.4,
    color: '#7df8ff',
    accentColor: '#3d82ff',
    imagePath: '/vendor/nasa/deep-sky/m57-ring.webp',
    aspectRatio: 1.06,
    rotationDeg: -14,
    glowStrength: 1.18,
    renderProfile: {
      alphaHigh: 0.36,
      alphaLow: 0.032,
      colorMaskBoost: 0.86,
      contrast: 1.2,
      edgePower: 2.85,
      hazeStrength: 0,
      opacity: 0.92,
      sizeScale: 0.82,
      tintMix: 0.18,
    },
  },
  {
    id: 'm27',
    name: 'Dumbbell Nebula',
    kind: 'planetary-nebula',
    visualStyle: 'dumbbell',
    raDeg: 299.9,
    decDeg: 22.72,
    magnitude: 7.5,
    angularSizeArcMin: 8,
    color: '#8ee6ff',
    accentColor: '#ff7fa8',
    imagePath: '/vendor/nasa/deep-sky/m27-dumbbell.webp',
    aspectRatio: 1.68,
    rotationDeg: 22,
    glowStrength: 1.02,
    renderProfile: {
      alphaHigh: 0.4,
      alphaLow: 0.04,
      colorMaskBoost: 0.78,
      contrast: 1.14,
      edgePower: 2.35,
      hazeStrength: 0.015,
      opacity: 0.84,
      sizeScale: 0.98,
      tintMix: 0.14,
    },
  },
  {
    id: 'm8',
    name: 'Lagoon Nebula',
    kind: 'nebula',
    visualStyle: 'emission',
    raDeg: 270.9,
    decDeg: -24.39,
    magnitude: 6,
    angularSizeArcMin: 90,
    color: '#ff7da7',
    accentColor: '#67d8ff',
    imagePath: '/vendor/nasa/deep-sky/m8-lagoon.webp',
    aspectRatio: 1.87,
    rotationDeg: -10,
    glowStrength: 0.86,
    renderProfile: {
      alphaHigh: 0.5,
      alphaLow: 0.055,
      colorMaskBoost: 0.74,
      contrast: 1.08,
      edgePower: 2.15,
      hazeStrength: 0.045,
      opacity: 0.72,
      sizeScale: 0.94,
      tintMix: 0.12,
    },
  },
  {
    id: 'm31',
    name: 'Andromeda Galaxy',
    kind: 'galaxy',
    visualStyle: 'galaxy',
    raDeg: 10.68,
    decDeg: 41.27,
    magnitude: 3.4,
    angularSizeArcMin: 190,
    color: '#b8d7ff',
    accentColor: '#fff3cc',
    imagePath: '/vendor/nasa/deep-sky/m31-andromeda.webp',
    aspectRatio: 3.12,
    rotationDeg: 11,
    glowStrength: 0.84,
    renderProfile: {
      alphaHigh: 0.27,
      alphaLow: 0.018,
      colorMaskBoost: 0.34,
      contrast: 1.12,
      edgePower: 0.92,
      hazeStrength: 0.13,
      opacity: 0.78,
      sizeScale: 1.08,
      tintMix: 0.08,
    },
  },
  {
    id: 'm42',
    name: 'Orion Nebula',
    kind: 'nebula',
    visualStyle: 'emission',
    raDeg: 83.82,
    decDeg: -5.39,
    magnitude: 4,
    angularSizeArcMin: 85,
    color: '#8fdfff',
    accentColor: '#ff9a78',
    imagePath: '/vendor/nasa/deep-sky/m42-orion.webp',
    aspectRatio: 1,
    rotationDeg: 18,
    glowStrength: 1,
    renderProfile: {
      alphaHigh: 0.44,
      alphaLow: 0.04,
      colorMaskBoost: 0.82,
      contrast: 1.16,
      edgePower: 2.05,
      hazeStrength: 0.05,
      opacity: 0.78,
      sizeScale: 0.92,
      tintMix: 0.1,
    },
  },
  {
    id: 'm45',
    name: 'Pleiades',
    kind: 'cluster',
    visualStyle: 'reflection',
    raDeg: 56.85,
    decDeg: 24.12,
    magnitude: 1.6,
    angularSizeArcMin: 110,
    color: '#dbe8ff',
    accentColor: '#80b8ff',
    imagePath: '/vendor/nasa/deep-sky/m45-pleiades.webp',
    aspectRatio: 0.89,
    rotationDeg: -24,
    glowStrength: 0.8,
    renderProfile: {
      alphaHigh: 0.42,
      alphaLow: 0.026,
      colorMaskBoost: 0.42,
      contrast: 1.06,
      edgePower: 1.28,
      hazeStrength: 0.08,
      opacity: 0.64,
      sizeScale: 0.88,
      tintMix: 0.08,
    },
  },
] satisfies readonly DeepSkyObject[]
