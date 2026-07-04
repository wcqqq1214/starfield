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
    glowStrength: 0.82,
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
    glowStrength: 1.2,
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
    aspectRatio: 1.18,
    rotationDeg: 22,
    glowStrength: 1.06,
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
    aspectRatio: 1.72,
    rotationDeg: -10,
    glowStrength: 0.92,
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
    aspectRatio: 3.1,
    rotationDeg: 11,
    glowStrength: 0.82,
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
    aspectRatio: 1.36,
    rotationDeg: 18,
    glowStrength: 1.1,
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
    aspectRatio: 1.32,
    rotationDeg: -24,
    glowStrength: 0.92,
  },
] satisfies readonly DeepSkyObject[]
