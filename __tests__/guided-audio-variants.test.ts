import { describe, expect, it } from "vitest"
import { validateAudioPayload } from "@/lib/audioCache"
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
      .toBe("https://media.githubusercontent.com/media/jstur225/ashtanga-app/4ba630f90d9e53106a807511df748afb66595411/public/audio/sharath-jois-led-primary-v1.m4a")
  })

  it("只接受真实音频内容，拒绝 Git LFS 指针和登录页", () => {
    const m4aPayload = new Uint8Array([
      0x00, 0x00, 0x00, 0x18,
      0x66, 0x74, 0x79, 0x70,
      0x4d, 0x34, 0x41, 0x20,
    ]).buffer
    const lfsPointer = new TextEncoder().encode(
      "version https://git-lfs.github.com/spec/v1\noid sha256:abc\nsize 32273838\n",
    ).buffer
    const loginPage = new TextEncoder().encode("<!doctype html><title>Sign in</title>").buffer

    expect(() => validateAudioPayload(m4aPayload, "audio/mp4")).not.toThrow()
    expect(() => validateAudioPayload(lfsPointer, "text/plain")).toThrow(/Git LFS/)
    expect(() => validateAudioPayload(loginPage, "text/html")).toThrow(/有效音频/)
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
