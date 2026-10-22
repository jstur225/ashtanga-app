import { closeSync, existsSync, openSync, readFileSync, readSync, statSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const SHARATH_AUDIO_PATH = resolve(
  process.cwd(),
  "public/audio/sharath-jois-led-primary-v1.m4a",
)
const GIT_ATTRIBUTES_PATH = resolve(process.cwd(), ".gitattributes")

describe("Sharath guided audio static asset", () => {
  it("publishes real M4A bytes instead of a Git LFS pointer", () => {
    const attributes = existsSync(GIT_ATTRIBUTES_PATH)
      ? readFileSync(GIT_ATTRIBUTES_PATH, "utf8")
      : ""
    expect(attributes).not.toMatch(
      /public\/audio\/sharath-jois-led-primary-v1\.m4a\s+.*filter=lfs/,
    )

    const stat = statSync(SHARATH_AUDIO_PATH)
    expect(stat.size).toBeGreaterThan(30 * 1024 * 1024)

    const descriptor = openSync(SHARATH_AUDIO_PATH, "r")
    const header = Buffer.alloc(32)
    try {
      readSync(descriptor, header, 0, header.length, 0)
    } finally {
      closeSync(descriptor)
    }

    expect(header.subarray(4, 8).toString("ascii")).toBe("ftyp")
    expect(header.toString("utf8")).not.toContain("git-lfs.github.com")
  })
})
