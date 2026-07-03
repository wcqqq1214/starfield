import { Horizon, Observer } from 'astronomy-engine'
import { MathUtils, Vector3 } from 'three'
import type { CatalogStar, EquatorialPolyline } from './celestialCatalog'
import type { SurfaceFrame } from './geo'
import type { LocationTarget } from '../types'

export type HorizonStar = CatalogStar & {
  altitude: number
  azimuth: number
  brightness: number
  visible: boolean
}

export function computeHorizonStars(
  location: Pick<LocationTarget, 'lat' | 'lon'>,
  utcDate: Date,
  stars: readonly CatalogStar[],
): HorizonStar[] {
  const observer = new Observer(location.lat, location.lon, 0)

  return stars.map((star) => {
    const horizontal = Horizon(
      utcDate,
      observer,
      star.raHours,
      star.decDeg,
      'normal',
    )
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

export function computeHorizonPolylines(
  location: Pick<LocationTarget, 'lat' | 'lon'>,
  utcDate: Date,
  frame: SurfaceFrame,
  polylines: readonly EquatorialPolyline[],
  radius: number,
  minAltitude = -2,
): Vector3[][] {
  const observer = new Observer(location.lat, location.lon, 0)

  return polylines.flatMap((polyline) => {
    const points = polyline.points
      .map((point) => {
        const horizontal = Horizon(
          utcDate,
          observer,
          point.raDeg / 15,
          point.decDeg,
          'normal',
        )

        if (horizontal.altitude < minAltitude) {
          return null
        }

        return horizonToWorldPosition(
          frame,
          horizontal.azimuth,
          horizontal.altitude,
          radius,
        )
      })
      .filter((point): point is Vector3 => point !== null)

    return points.length >= 2 ? [points] : []
  })
}

export function horizonToWorldPosition(
  frame: SurfaceFrame,
  azimuthDeg: number,
  altitudeDeg: number,
  radius: number,
): Vector3 {
  const azimuth = MathUtils.degToRad(azimuthDeg)
  const altitude = MathUtils.degToRad(altitudeDeg)
  const horizon = Math.cos(altitude)
  const direction = new Vector3()
    .addScaledVector(frame.north, horizon * Math.cos(azimuth))
    .addScaledVector(frame.east, horizon * Math.sin(azimuth))
    .addScaledVector(frame.up, Math.sin(altitude))
    .normalize()

  return frame.position
    .clone()
    .addScaledVector(frame.up, 0.06)
    .addScaledVector(direction, radius)
}

export function formatUtc(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z')
}
