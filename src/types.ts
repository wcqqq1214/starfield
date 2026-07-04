export type ExperienceStage = 'EARTH' | 'SKY'

export type SkyMode = 'PURE' | 'INTERACTIVE'

export type LocationTarget = {
  name: string
  lat: number
  lon: number
  note: string
}

export type ActiveLocation = LocationTarget & {
  rotationY: number
}
