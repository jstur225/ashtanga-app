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
      <main className="mx-auto max-w-5xl px-5 py-12 sm:py-20">
        <div className="animate-enter grid gap-8 pb-12 sm:grid-cols-[1fr_2.3fr] sm:gap-12 sm:pb-16">
          <div>
            <p className="text-[10px] tracking-[0.28em] text-[#98783E]">VOL. 01 · 2026</p>
            <div className="mt-3 h-px w-8 bg-[#C1A268]/50" />
            <p className="mt-4 text-sm tracking-[0.16em] text-[#2A4B3C]/55">{eyebrow}</p>
          </div>
          <div>
            <h1 className="max-w-3xl text-4xl font-medium leading-[1.15] tracking-[-0.03em] text-[#203D31] sm:text-6xl">
              {title}
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-9 text-[#2A4B3C]/70">{description}</p>
          </div>
        </div>

        {children ? (
          <div className="animate-enter animate-enter-delay-1 mt-4 grid gap-6 pb-12 sm:grid-cols-3 [&>section]:border [&>section]:border-[#2A4B3C]/12 [&>section]:bg-[#F9F7F2]/80 [&>section]:p-8 [&>section]:transition-all [&>section:hover]:border-[#98783E]/40 [&>section:hover]:shadow-lg [&>section:hover]:shadow-[#2A4B3C]/5 [&_h2]:text-lg [&_h2]:font-medium [&_h2]:text-[#203D31] [&_p]:mt-3 [&_p]:text-sm [&_p]:leading-7 [&_p]:text-[#2A4B3C]/68">
            {children}
          </div>
        ) : null}

        <div className="animate-enter animate-enter-delay-2 mt-14">
          <div className="mb-5 flex items-end justify-between pb-3">
            <h2 className="text-2xl text-[#203D31]">本期目录</h2>
            <span className="text-[10px] tracking-[0.25em] text-[#98783E]">CONTENTS</span>
          </div>
          <div className="h-px bg-gradient-to-r from-[#2A4B3C]/20 to-transparent" />
          {entries.length > 0 ? (
            entries.map((entry, index) => (
              <Link
                key={`${section}-${entry.slug}`}
                href={getPublicContentUrl(entry)}
                className="group grid gap-3 border-b border-[#2A4B3C]/8 py-7 transition-colors hover:bg-[#EDE5D6]/40 sm:grid-cols-[4rem_1fr_auto] sm:items-start sm:gap-6 sm:px-3"
              >
                <span className="text-sm tabular-nums tracking-[0.15em] text-[#98783E]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-2xl leading-8 text-[#203D31] transition-all duration-300 group-hover:translate-x-1.5 group-hover:text-[#98783E]">
                    {entry.title}
                  </h3>
                  <p className="mt-3 max-w-2xl text-base leading-7 text-[#2A4B3C]/62">
                    {entry.description}
                  </p>
                </div>
                <span aria-hidden="true" className="hidden pt-1 text-xl text-[#98783E] transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 sm:block">↗</span>
              </Link>
            ))
          ) : (
            <p className="py-8 text-[#2A4B3C]/65">内容正在整理。</p>
          )}
        </div>
      </main>
    </PublicSiteFrame>
  )
}
