import fs from "node:fs"
import path from "node:path"
import { beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

let getAllPublicContentMeta: typeof import("@/lib/public-content").getAllPublicContentMeta
let getPublicContent: typeof import("@/lib/public-content").getPublicContent
let buildContentMetadata: typeof import("@/lib/seo-metadata").buildContentMetadata
let sitemap: typeof import("@/app/sitemap").default
let robots: typeof import("@/app/robots").default

const readTypeScriptFiles = (directory: string): string =>
  fs
    .readdirSync(directory, { withFileTypes: true })
    .map((entry) => {
      const fullPath = path.join(directory, entry.name)
      if (entry.isDirectory()) return readTypeScriptFiles(fullPath)
      return /\.(ts|tsx)$/.test(entry.name) ? fs.readFileSync(fullPath, "utf8") : ""
    })
    .join("\n")

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
  it("公开工具与入门科普内容可读取且 slug 唯一", () => {
    const entries = getAllPublicContentMeta()
    const urls = entries.map((entry) => `/${entry.section}/${entry.slug}`)

    expect(entries).toHaveLength(7)
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

  it("不发布有版权争议的体式科普页面", () => {
    const poseIndexRoute = path.join(process.cwd(), "app", "poses", "page.tsx")
    const poseDetailRoute = path.join(process.cwd(), "app", "poses", "[slug]", "page.tsx")
    const poseContent = path.join(process.cwd(), "content", "knowledge", "poses")

    expect(fs.existsSync(poseIndexRoute)).toBe(false)
    expect(fs.existsSync(poseDetailRoute)).toBe(false)
    expect(
      fs.existsSync(poseContent)
        ? fs.readdirSync(poseContent).filter((file) => file.endsWith(".md"))
        : [],
    ).toHaveLength(0)
    expect(getAllPublicContentMeta().some((entry) => String(entry.section) === "poses")).toBe(false)
  })

  it("练习 App 不增加跳转到公开科普页面的入口", () => {
    const practiceCode = [
      fs.readFileSync(path.join(process.cwd(), "app", "practice", "page.tsx"), "utf8"),
      readTypeScriptFiles(path.join(process.cwd(), "components", "practice")),
    ].join("\n")

    expect(practiceCode).not.toMatch(/href=["']\/(ashtanga|tools)\b/)
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
    expect(urls).toContain("https://ash.ashtangalife.online/authors/shao-bingbing")
    expect(urls).toContain("https://ash.ashtangalife.online/ashtanga")
    expect(urls).toHaveLength(11)
    expect(urls.some((url) => url.includes("/poses"))).toBe(false)
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
