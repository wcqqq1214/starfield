import { Vector3 } from 'three'

export const EARTH_RADIUS = 1

const Y_AXIS = new Vector3(0, 1, 0)

export type SurfaceFrame = {
  position: Vector3
  up: Vector3
  north: Vector3
  east: Vector3
}

export function latLonToVector3(
  latDeg: number,
  lonDeg: number,
  radius = EARTH_RADIUS,
): Vector3 {
  const lat = (latDeg * Math.PI) / 180
  const lon = (lonDeg * Math.PI) / 180
  const cosLat = Math.cos(lat)

  return new Vector3(
    radius * cosLat * Math.cos(lon),
    radius * Math.sin(lat),
    -radius * cosLat * Math.sin(lon),
  )
}

export function vector3ToLatLon(point: Vector3): { lat: number; lon: number } {
  const normal = point.clone().normalize()
  const lat = Math.asin(normal.y) * (180 / Math.PI)
  const lon = Math.atan2(-normal.z, normal.x) * (180 / Math.PI)

  return {
    lat: roundCoordinate(lat),
    lon: roundCoordinate(normalizeLongitude(lon)),
  }
}

export function getSurfaceFrame(
  latDeg: number,
  lonDeg: number,
  rotationY: number,
): SurfaceFrame {
  const lat = (latDeg * Math.PI) / 180
  const lon = (lonDeg * Math.PI) / 180

  const up = latLonToVector3(latDeg, lonDeg).normalize()
  const east = new Vector3(-Math.sin(lon), 0, -Math.cos(lon)).normalize()
  const north = new Vector3(
    -Math.sin(lat) * Math.cos(lon),
    Math.cos(lat),
    Math.sin(lat) * Math.sin(lon),
  ).normalize()

  return {
    position: rotateAroundEarth(latLonToVector3(latDeg, lonDeg), rotationY),
    up: rotateAroundEarth(up, rotationY),
    north: rotateAroundEarth(north, rotationY),
    east: rotateAroundEarth(east, rotationY),
  }
}

function rotateAroundEarth(vector: Vector3, rotationY: number): Vector3 {
  return vector.clone().applyAxisAngle(Y_AXIS, rotationY).normalize()
}

function normalizeLongitude(lon: number): number {
  if (lon > 180) {
    return lon - 360
  }

  if (lon < -180) {
    return lon + 360
  }

  return lon
}

function roundCoordinate(value: number): number {
  return Number(value.toFixed(4))
}
