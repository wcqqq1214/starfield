import { SiderealTime } from 'astronomy-engine'
import { MathUtils } from 'three'
import type { CatalogStar } from './celestialCatalog'
import type { LocationTarget } from '../types'

const DEG_TO_RAD = Math.PI / 180
const RAD_TO_DEG = 180 / Math.PI

export type HorizonStar = CatalogStar & {
  altitude: number
  azimuth: number
  brightness: number
  visible: boolean
}

type HorizontalPoint = {
  altitude: number
  azimuth: number
}

type HorizonProjector = {
  toHorizontal: (raDeg: number, decDeg: number) => HorizontalPoint
}

export function computeHorizonStars(
  location: Pick<LocationTarget, 'lat' | 'lon'>,
  utcDate: Date,
  stars: readonly CatalogStar[],
): HorizonStar[] {
  const projector = createHorizonProjector(location, utcDate)

  return stars.map((star) => {
    const horizontal = projector.toHorizontal(star.raDeg, star.decDeg)
    const brightness = MathUtils.clamp(2.4 - star.magnitude, 0.25, 4.2)

    return {
      ...star,
      altitude: horizontal.altitude,
      azimuth: horizontal.azimuth,
      brightness,
      visible: horizontal.altitude > 0,
    }
  }).sort((a, b) => {
    if (a.visible !== b.visible) {
      return a.visible ? -1 : 1
    }

    return a.magnitude - b.magnitude
  })
}

function createHorizonProjector(
  location: Pick<LocationTarget, 'lat' | 'lon'>,
  utcDate: Date,
): HorizonProjector {
  const latitudeRad = location.lat * DEG_TO_RAD
  const sinLat = Math.sin(latitudeRad)
  const cosLat = Math.cos(latitudeRad)
  const localSiderealDeg = normalizeDegrees(
    (SiderealTime(utcDate) + location.lon / 15) * 15,
  )

  return {
    toHorizontal: (raDeg: number, decDeg: number) => {
      const hourAngleRad = signedDegrees(localSiderealDeg - raDeg) * DEG_TO_RAD
      const decRad = decDeg * DEG_TO_RAD
      const sinDec = Math.sin(decRad)
      const cosDec = Math.cos(decRad)
      const sinAlt =
        sinDec * sinLat + cosDec * cosLat * Math.cos(hourAngleRad)
      const altitude = Math.asin(MathUtils.clamp(sinAlt, -1, 1)) * RAD_TO_DEG
      const azimuth =
        Math.atan2(
          -Math.sin(hourAngleRad),
          Math.tan(decRad) * cosLat - sinLat * Math.cos(hourAngleRad),
        ) * RAD_TO_DEG

      return {
        altitude: altitude + refractionCorrection(altitude),
        azimuth: normalizeDegrees(azimuth),
      }
    },
  }
}

function refractionCorrection(altitude: number): number {
  if (altitude < -1) {
    return 0
  }

  return (
    1.02 /
    Math.tan((altitude + 10.3 / (altitude + 5.11)) * DEG_TO_RAD) /
    60
  )
}

function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360
}

function signedDegrees(value: number): number {
  const normalized = normalizeDegrees(value)

  return normalized > 180 ? normalized - 360 : normalized
}

export function formatUtc(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z')
}
