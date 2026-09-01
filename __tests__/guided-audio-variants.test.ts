import { describe, expect, it } from "vitest"
import {
  DEFAULT_GUIDED_AUDIO_VARIANT,
  GUIDED_AUDIO_VARIANTS,
  getGuidedAudioVariant,
} from "@/lib/guided-audio-variants"

describe("guided audio variants", () => {
  it("保留老掌门人为默认版本并注册完整 Sharath 音轨", () => {
    expect(DEFAULT_GUIDED_AUDIO_VARIANT.id).toBe("guruji-led-primary")
    expect(GUIDED_AUDIO_VARIANTS).toHaveLength(2)
    expect(getGuidedAudioVariant("sharath-jois-led-primary").audioSrc)
      .toBe("/audio/sharath-jois-led-primary-v1.m4a")
  })

  it("未知或旧会话缺失版本时安全回退老掌门人", () => {
    expect(getGuidedAudioVariant(undefined)).toBe(DEFAULT_GUIDED_AUDIO_VARIANT)
    expect(getGuidedAudioVariant("removed-version")).toBe(DEFAULT_GUIDED_AUDIO_VARIANT)
  })

  it("两个版本使用不同的缓存键", () => {
    expect(new Set(GUIDED_AUDIO_VARIANTS.map((variant) => variant.cacheKey)).size)
      .toBe(GUIDED_AUDIO_VARIANTS.length)
  })
})
