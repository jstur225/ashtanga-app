import "server-only"

import fs from "node:fs"
import path from "node:path"
import matter from "gray-matter"

export type PublicContentSection = "ashtanga" | "tools" | "poses"
export type PublicContentSchema = "Article" | "SoftwareApplication"

export interface PublicContentMeta {
  title: string
  description: string
  slug: string
  section: PublicContentSection
  publishedAt: string
  updatedAt: string
  author: string
  keywords: string[]
  eyebrow: string
  ctaLabel: string
  ctaHref: string
  schemaType: PublicContentSchema
  image?: string
}

export interface PublicContentDocument {
  meta: PublicContentMeta
  body: string
}

const CONTENT_ROOT = path.join(process.cwd(), "content", "knowledge")
const SECTIONS: PublicContentSection[] = ["ashtanga", "tools", "poses"]

const isSection = (value: unknown): value is PublicContentSection =>
  typeof value === "string" && SECTIONS.includes(value as PublicContentSection)

const parseStringList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []

const parseMeta = (data: Record<string, unknown>, filePath: string): PublicContentMeta => {
  const required = [
    "title",
    "description",
    "slug",
    "section",
    "publishedAt",
    "updatedAt",
    "author",
    "eyebrow",
    "ctaLabel",
    "ctaHref",
    "schemaType",
  ] as const

  for (const field of required) {
    if (typeof data[field] !== "string" || !data[field]) {
      throw new Error(`Missing frontmatter field "${field}" in ${filePath}`)
    }
  }
  if (!isSection(data.section)) {
    throw new Error(`Invalid content section in ${filePath}`)
  }
  if (data.schemaType !== "Article" && data.schemaType !== "SoftwareApplication") {
    throw new Error(`Invalid schemaType in ${filePath}`)
  }

  return {
    title: data.title as string,
    description: data.description as string,
    slug: data.slug as string,
    section: data.section,
    publishedAt: data.publishedAt as string,
    updatedAt: data.updatedAt as string,
    author: data.author as string,
    keywords: parseStringList(data.keywords),
    eyebrow: data.eyebrow as string,
    ctaLabel: data.ctaLabel as string,
    ctaHref: data.ctaHref as string,
    schemaType: data.schemaType,
    image: typeof data.image === "string" ? data.image : undefined,
  }
}

export const getPublicContent = (
  section: PublicContentSection,
  slug: string,
): PublicContentDocument | null => {
  const filePath = path.join(CONTENT_ROOT, section, `${slug}.md`)
  if (!fs.existsSync(filePath)) return null

  const parsed = matter(fs.readFileSync(filePath, "utf8"))
  const meta = parseMeta(parsed.data as Record<string, unknown>, filePath)
  if (meta.section !== section || meta.slug !== slug) {
    throw new Error(`Content route mismatch in ${filePath}`)
  }
  return { meta, body: parsed.content.trim() }
}

export const getAllPublicContentMeta = (): PublicContentMeta[] =>
  SECTIONS.flatMap((section) => {
    const directory = path.join(CONTENT_ROOT, section)
    if (!fs.existsSync(directory)) return []
    return fs
      .readdirSync(directory)
      .filter((file) => file.endsWith(".md"))
      .map((file) => getPublicContent(section, file.replace(/\.md$/, ""))?.meta)
      .filter((meta): meta is PublicContentMeta => Boolean(meta))
  })

export const getPublicContentUrl = (meta: PublicContentMeta) =>
  `/${meta.section}/${meta.slug}`
