export type ExperienceStage = 'EARTH' | 'SKY'

export type LocationTarget = {
  name: string
  lat: number
  lon: number
  note: string
}

export type ActiveLocation = LocationTarget & {
  rotationY: number
}
