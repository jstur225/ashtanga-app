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
      <main className="mx-auto max-w-3xl px-5 py-10 sm:py-16">
        <article>
          <p className="text-sm tracking-[0.16em] text-[#98783e]">{meta.eyebrow}</p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight text-[#203d31] sm:text-4xl">
            {meta.title}
          </h1>
          <p className="mt-5 text-lg leading-8 text-[#2A4B3C]/75">{meta.description}</p>
          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#2A4B3C]/55">
            <Link href={AUTHOR_PATH} className="underline decoration-[#C1A268] underline-offset-4">
              {meta.author}
            </Link>
            <span aria-hidden="true">·</span>
            <time dateTime={meta.updatedAt}>更新于 {meta.updatedAt}</time>
          </div>

          {meta.image && (
            <img
              src={meta.image}
              alt={meta.title}
              className="mt-8 max-h-[520px] w-full rounded-2xl bg-white object-contain"
            />
          )}

          <div className="mt-10">
            <ReactMarkdown
              components={{
                h2: ({ children }) => (
                  <h2 className="mb-4 mt-10 text-2xl font-semibold text-[#203d31]">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="mb-3 mt-8 text-xl font-semibold text-[#203d31]">{children}</h3>
                ),
                p: ({ children }) => (
                  <p className="my-4 text-base leading-8 text-[#2A4B3C]/85">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="my-5 list-disc space-y-2 pl-6 leading-7 text-[#2A4B3C]/85">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="my-5 list-decimal space-y-2 pl-6 leading-7 text-[#2A4B3C]/85">{children}</ol>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    className="underline decoration-[#C1A268] underline-offset-4"
                  >
                    {children}
                  </a>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="my-6 border-l-4 border-[#C1A268] bg-white/70 px-5 py-2">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {body}
            </ReactMarkdown>
          </div>
        </article>

        <section className="mt-14 rounded-3xl bg-[#2A4B3C] px-6 py-8 text-center text-[#F9F7F2]">
          <h2 className="text-2xl">把今天的练习留下来</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#F9F7F2]/75">
            无需下载，打开网页即可计时、打卡并记录身体觉察。
          </p>
          <Link
            href={meta.ctaHref}
            className="mt-6 inline-flex rounded-full border border-[#C1A268] px-7 py-3 text-[#E5C585]"
          >
            {meta.ctaLabel}
          </Link>
        </section>
      </main>
    </PublicSiteFrame>
  )
}
