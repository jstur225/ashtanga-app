import fs from "node:fs"
import path from "node:path"
import { beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

let getAllPublicContentMeta: typeof import("@/lib/public-content").getAllPublicContentMeta
let getPublicContent: typeof import("@/lib/public-content").getPublicContent
let buildContentMetadata: typeof import("@/lib/seo-metadata").buildContentMetadata
let sitemap: typeof import("@/app/sitemap").default
let robots: typeof import("@/app/robots").default

beforeAll(async () => {
  const content = await import("@/lib/public-content")
  const seo = await import("@/lib/seo-metadata")
  getAllPublicContentMeta = content.getAllPublicContentMeta
  getPublicContent = content.getPublicContent
  buildContentMetadata = seo.buildContentMetadata
  sitemap = (await import("@/app/sitemap")).default
  robots = (await import("@/app/robots")).default
})

describe("public SEO content", () => {
  it("首批 12 篇三类内容可读取且 slug 唯一", () => {
    const entries = getAllPublicContentMeta()
    const urls = entries.map((entry) => `/${entry.section}/${entry.slug}`)

    expect(entries).toHaveLength(12)
    expect(new Set(urls).size).toBe(urls.length)
    expect(urls).toEqual(
      expect.arrayContaining([
        "/tools/ashtanga-practice-tracker",
        "/ashtanga/awareness-journal",
        "/ashtanga/moon-days",
        "/ashtanga/mysore",
        "/ashtanga/opening-chant",
        "/ashtanga/practice-record",
        "/ashtanga/primary-series",
        "/poses/matsyasana",
        "/poses/padangusthasana-padahastasana",
        "/poses/supta-konasana",
        "/poses/upavishta-konasana",
        "/poses/uttana-padasana",
      ]),
    )
  })

  it("正文和必要 frontmatter 均存在", () => {
    const document = getPublicContent("ashtanga", "practice-record")

    expect(document?.body).toContain("先记录事实")
    expect(document?.meta.author).toBe("烧冰冰")
    expect(document?.meta.description.length).toBeGreaterThan(30)
    expect(document?.meta.keywords.length).toBeGreaterThan(0)
  })

  it("公开体式页只做名称科普，不包含分步教学", () => {
    const poseEntries = getAllPublicContentMeta().filter((entry) => entry.section === "poses")

    expect(poseEntries).toHaveLength(5)
    for (const entry of poseEntries) {
      const document = getPublicContent("poses", entry.slug)
      expect(document?.meta.title).not.toMatch(/怎么做|怎样练|练习提示/)
      expect(document?.meta.description).not.toMatch(/动作顺序|呼吸提示|安全提示/)
      expect(document?.body).not.toMatch(/^## (动作顺序|练习步骤|呼吸提示)/m)
      expect(document?.body).not.toMatch(/^\d+\.\s/m)
      expect(document?.body).toMatch(/不提供体式教学|不教你|不提供进入|不讲解动作方法|不提供动作教学/)
    }
  })

  it("内容 metadata 输出 canonical 和社交卡片", () => {
    const document = getPublicContent("tools", "ashtanga-practice-tracker")
    expect(document).not.toBeNull()

    const metadata = buildContentMetadata(document!.meta)
    expect(metadata.alternates?.canonical).toBe("/tools/ashtanga-practice-tracker")
    expect(metadata.openGraph?.title).toContain("熬汤日记")
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" })
  })

  it("sitemap 收录公开内容并排除应用页和旧 SEO 页", () => {
    const urls = sitemap().map((entry) => entry.url)

    expect(urls).toContain("https://ash.ashtangalife.online/tools/ashtanga-practice-tracker")
    expect(urls).toContain("https://ash.ashtangalife.online/ashtanga/practice-record")
    expect(urls).toContain("https://ash.ashtangalife.online/poses/padangusthasana-padahastasana")
    expect(urls).toContain("https://ash.ashtangalife.online/authors/shao-bingbing")
    expect(urls).toContain("https://ash.ashtangalife.online/ashtanga")
    expect(urls).toContain("https://ash.ashtangalife.online/poses")
    expect(urls).toHaveLength(17)
    expect(urls).not.toContain("https://ash.ashtangalife.online/practice")
    expect(urls).not.toContain("https://ash.ashtangalife.online/seo")
  })

  it("robots 允许公开抓取、阻止 API，并明确允许搜索爬虫", () => {
    const result = robots()
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules]

    expect(rules.some((rule) => rule.userAgent === "*" && rule.allow === "/")).toBe(true)
    expect(rules.some((rule) => rule.userAgent === "OAI-SearchBot")).toBe(true)
    expect(rules.some((rule) => rule.userAgent === "Baiduspider")).toBe(true)
    expect(rules.every((rule) => rule.disallow?.includes("/api/"))).toBe(true)
  })

  it("公众号二维码已经进入可部署静态资源", () => {
    const qrPath = path.join(process.cwd(), "public", "social", "wechat-ashtanga-journal.jpg")
    expect(fs.existsSync(qrPath)).toBe(true)
    expect(fs.statSync(qrPath).size).toBeGreaterThan(10_000)
  })
})
