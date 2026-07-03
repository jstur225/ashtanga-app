import Link from "next/link"
import type { ReactNode } from "react"
import type { PublicContentMeta, PublicContentSection } from "@/lib/public-content"
import { getPublicContentUrl } from "@/lib/public-content"
import { PublicSiteFrame } from "@/components/content/PublicSiteChrome"

interface PublicContentIndexProps {
  eyebrow: string
  title: string
  description: string
  section: PublicContentSection
  entries: PublicContentMeta[]
  children?: ReactNode
}

export function PublicContentIndex({
  eyebrow,
  title,
  description,
  section,
  entries,
  children,
}: PublicContentIndexProps) {
  return (
    <PublicSiteFrame>
      <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <p className="text-sm tracking-[0.16em] text-[#98783e]">{eyebrow}</p>
        <h1 className="mt-4 text-4xl font-semibold text-[#203d31]">{title}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-[#2A4B3C]/75">{description}</p>

        {children ? (
          <div className="mt-10 space-y-7 rounded-2xl border border-[#2A4B3C]/10 bg-white p-6 text-base leading-8 text-[#2A4B3C]/80">
            {children}
          </div>
        ) : null}

        <div className="mt-10 grid gap-4">
          {entries.length > 0 ? (
            entries.map((entry) => (
              <Link
                key={`${section}-${entry.slug}`}
                href={getPublicContentUrl(entry)}
                className="rounded-2xl border border-[#2A4B3C]/10 bg-white p-5 transition-transform hover:-translate-y-0.5"
              >
                <h2 className="text-xl font-semibold text-[#203d31]">{entry.title}</h2>
                <p className="mt-2 text-sm leading-6 text-[#2A4B3C]/65">{entry.description}</p>
              </Link>
            ))
          ) : (
            <p className="rounded-2xl bg-white p-5 text-[#2A4B3C]/65">内容正在整理。</p>
          )}
        </div>
      </main>
    </PublicSiteFrame>
  )
}
