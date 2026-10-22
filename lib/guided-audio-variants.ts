export const GUIDED_AUDIO_VARIANT_STORAGE_KEY = "ashtanga_guided_audio_variant"

export interface GuidedAudioVariant {
  id: string
  teacher: string
  note: string
  durationLabel: string
  audioSrc: string
  cacheKey: string
  cacheVersion: string
  sourceUrl?: string
}

export const GUIDED_AUDIO_VARIANTS: readonly GuidedAudioVariant[] = [
  {
    id: "guruji-led-primary",
    teacher: "老掌门人",
    note: "老掌门人版口令",
    durationLabel: "88:06",
    audioSrc: "/audio/guruji-led-primary.m4a",
    cacheKey: "guruji-led-primary",
    cacheVersion: "1.0",
  },
  {
    id: "sharath-jois-led-primary",
    teacher: "Sharath Jois",
    note: "Sharath Jois版口令",
    durationLabel: "89:41",
    audioSrc: "https://media.githubusercontent.com/media/jstur225/ashtanga-app/4ba630f90d9e53106a807511df748afb66595411/public/audio/sharath-jois-led-primary-v1.m4a",
    cacheKey: "sharath-jois-led-primary",
    cacheVersion: "1.0",
    sourceUrl: "https://www.youtube.com/watch?v=0KMbO52LLqk",
  },
]

export const DEFAULT_GUIDED_AUDIO_VARIANT = GUIDED_AUDIO_VARIANTS[0]

export function getGuidedAudioVariant(id: unknown): GuidedAudioVariant {
  return GUIDED_AUDIO_VARIANTS.find((variant) => variant.id === id) ?? DEFAULT_GUIDED_AUDIO_VARIANT
}
