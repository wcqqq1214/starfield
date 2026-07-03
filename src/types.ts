export type ExperienceStage = 'EARTH' | 'TRANSITIONING' | 'FLIP' | 'SKY'

export type LocationTarget = {
  name: string
  lat: number
  lon: number
  note: string
}

export type ActiveLocation = LocationTarget & {
  rotationY: number
}
