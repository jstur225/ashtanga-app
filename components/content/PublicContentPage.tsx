import Link from "next/link"
import ReactMarkdown from "react-markdown"
import type { PublicContentDocument } from "@/lib/public-content"
import {
  AUTHOR_PATH,
  buildArticleJsonLd,
  buildBreadcrumbJsonLd,
} from "@/lib/seo-metadata"
import { JsonLd } from "@/components/content/JsonLd"
import { PublicSiteFrame } from "@/components/content/PublicSiteChrome"

export function PublicContentPage({ document }: { document: PublicContentDocument }) {
  const { meta, body } = document

  return (
    <PublicSiteFrame>
      <JsonLd data={buildArticleJsonLd(meta)} />
      <JsonLd data={buildBreadcrumbJsonLd(meta)} />
      <main className="mx-auto max-w-5xl px-5 py-12 sm:py-20">
        <article>
          <header className="grid gap-8 border-b border-[#2A4B3C]/20 pb-12 sm:grid-cols-[1fr_2.6fr] sm:gap-12 sm:pb-16">
            <div className="text-sm text-[#2A4B3C]/55">
              <p className="text-xs tracking-[0.22em] text-[#98783E]">JOURNAL · 2026</p>
              <p className="mt-4 tracking-[0.15em]">{meta.eyebrow}</p>
              <div className="mt-8 hidden border-t border-[#2A4B3C]/15 pt-5 leading-7 sm:block">
                <Link href={AUTHOR_PATH} className="text-[#203D31] underline decoration-[#C1A268] underline-offset-4">
                  {meta.author}
                </Link>
                <time className="block" dateTime={meta.updatedAt}>更新于 {meta.updatedAt}</time>
              </div>
            </div>
            <div>
              <h1 className="max-w-3xl text-4xl font-medium leading-[1.2] tracking-[-0.025em] text-[#203D31] sm:text-5xl">
                {meta.title}
              </h1>
              <p className="mt-7 max-w-2xl text-xl leading-9 text-[#2A4B3C]/72">{meta.description}</p>
              <div className="mt-7 flex items-center gap-3 text-sm text-[#2A4B3C]/55 sm:hidden">
                <Link href={AUTHOR_PATH} className="underline decoration-[#C1A268] underline-offset-4">
                  {meta.author}
                </Link>
                <span aria-hidden="true">·</span>
                <time dateTime={meta.updatedAt}>{meta.updatedAt}</time>
              </div>
            </div>
          </header>

          <div className="mx-auto mt-12 grid max-w-4xl gap-10 sm:mt-16 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-12">
            <aside className="hidden sm:block">
              <div className="sticky top-8 border-t border-[#98783E] pt-4 text-xs leading-6 tracking-[0.12em] text-[#2A4B3C]/50">
                <p>READING</p>
                <p className="mt-2 tracking-normal">约 4 分钟</p>
              </div>
            </aside>
            <div className="[&>p:first-of-type]:text-lg [&>p:first-of-type]:leading-9 [&>p:first-of-type]:text-[#203D31] [&>p:first-of-type]:first-letter:float-left [&>p:first-of-type]:first-letter:mr-2 [&>p:first-of-type]:first-letter:mt-2 [&>p:first-of-type]:first-letter:text-6xl [&>p:first-of-type]:first-letter:leading-[0.75] [&>p:first-of-type]:first-letter:text-[#98783E]">
              <ReactMarkdown
                components={{
                  h2: ({ children }) => (
                    <h2 className="mb-5 mt-14 border-t border-[#2A4B3C]/15 pt-7 text-2xl font-medium leading-9 text-[#203D31]">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="mb-4 mt-10 text-xl font-medium text-[#203D31]">{children}</h3>
                  ),
                  p: ({ children }) => (
                    <p className="my-5 text-[17px] leading-8 text-[#2A4B3C]/82">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="my-7 list-none space-y-3 border-y border-[#2A4B3C]/12 py-5 leading-8 text-[#2A4B3C]/82 [&>li]:relative [&>li]:pl-5 [&>li]:before:absolute [&>li]:before:left-0 [&>li]:before:text-[#98783E] [&>li]:before:content-['—']">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="my-7 list-decimal space-y-3 pl-6 leading-8 text-[#2A4B3C]/82 marker:text-[#98783E]">{children}</ol>
                  ),
                  a: ({ href, children }) => (
                    <a href={href} className="text-[#315F4A] underline decoration-[#C1A268] decoration-1 underline-offset-4 visited:text-[#6F5C45]">
                      {children}
                    </a>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="my-10 border-y border-[#C1A268]/60 py-7 text-center text-xl leading-9 text-[#203D31] [&_p]:my-0 [&_p]:text-xl [&_p]:leading-9">
                      {children}
                    </blockquote>
                  ),
                }}
              >
                {body}
              </ReactMarkdown>
            </div>
          </div>
        </article>

        <section className="mx-auto mt-20 grid max-w-4xl gap-7 border-y border-[#2A4B3C]/20 py-9 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <p className="text-xs tracking-[0.2em] text-[#98783E]">FROM READING TO PRACTICE</p>
            <h2 className="mt-3 text-3xl text-[#203D31]">把今天的练习留下来</h2>
            <p className="mt-3 max-w-lg text-sm leading-7 text-[#2A4B3C]/65">
              无需下载，打开网页即可计时、打卡并记录身体觉察。
            </p>
          </div>
          <Link
            href={meta.ctaHref}
            className="inline-flex min-h-11 items-center justify-center border border-[#2A4B3C] px-7 py-3 text-sm text-[#203D31] transition-colors hover:bg-[#203D31] hover:text-[#F9F7F2]"
          >
            {meta.ctaLabel}
          </Link>
        </section>
      </main>
    </PublicSiteFrame>
  )
}
