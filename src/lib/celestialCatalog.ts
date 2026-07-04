export type CatalogStar = {
  id: string
  displayName: string
  constellation: string
  raHours: number
  raDeg: number
  decDeg: number
  magnitude: number
  color: string
  distanceLy?: number
}

export type CelestialCatalog = {
  stars: CatalogStar[]
}

type D3StarFeature = {
  id: number | string
  properties: {
    mag: number
    bv?: string
  }
  geometry: {
    type: 'Point'
    coordinates: [number, number]
  }
}

type D3StarNames = Record<
  string,
  {
    name?: string
    bayer?: string
    flam?: string
    var?: string
    hip?: string
    c?: string
    desig?: string
  }
>

type D3Stars = {
  type: 'FeatureCollection'
  features: D3StarFeature[]
}

export async function loadD3CelestialCatalog(): Promise<CelestialCatalog> {
  const [stars, starNames] = await Promise.all([
    fetchJson<D3Stars>('/vendor/d3-celestial/stars.6.json'),
    fetchJson<D3StarNames>('/vendor/d3-celestial/starnames.json'),
  ])

  return {
    stars: mapStars(stars, starNames),
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`)
  }

  return (await response.json()) as T
}

function mapStars(stars: D3Stars, names: D3StarNames): CatalogStar[] {
  return stars.features
    .map((feature) => {
      const id = String(feature.id)
      const [raDeg, decDeg] = feature.geometry.coordinates
      const metadata = names[id]
      const bv = Number.parseFloat(feature.properties.bv ?? '')
      const displayName = getStarDisplayName(id, metadata)
      const constellation = metadata?.c?.trim() || 'Unknown'

      return {
        id,
        displayName,
        constellation,
        raDeg: normalizeDegrees(raDeg),
        raHours: normalizeDegrees(raDeg) / 15,
        decDeg,
        magnitude: feature.properties.mag,
        color: bvToColor(Number.isFinite(bv) ? bv : 0.55),
      }
    })
    .sort((a, b) => a.magnitude - b.magnitude)
}

function getStarDisplayName(id: string, metadata: D3StarNames[string] | undefined): string {
  const properName = metadata?.name?.trim()

  if (properName) {
    return properName
  }

  const designation = metadata?.desig?.trim()

  if (designation && metadata?.c) {
    return `${designation} ${metadata.c}`
  }

  const hip = metadata?.hip?.trim()

  return hip || `HIP ${id}`
}

function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360
}

function bvToColor(bv: number): string {
  const temperature = 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62))
  const kelvin = Math.max(1000, Math.min(40000, temperature)) / 100
  const red =
    kelvin <= 66
      ? 255
      : clampColor(329.698727446 * (kelvin - 60) ** -0.1332047592)
  const green =
    kelvin <= 66
      ? clampColor(99.4708025861 * Math.log(kelvin) - 161.1195681661)
      : clampColor(288.1221695283 * (kelvin - 60) ** -0.0755148492)
  const blue =
    kelvin >= 66
      ? 255
      : kelvin <= 19
        ? 0
        : clampColor(138.5177312231 * Math.log(kelvin - 10) - 305.0447927307)

  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`
}

function clampColor(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function toHex(value: number): string {
  return value.toString(16).padStart(2, '0')
}
