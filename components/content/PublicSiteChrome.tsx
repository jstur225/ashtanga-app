import Link from "next/link"
import type { ReactNode } from "react"

export function PublicSiteHeader() {
  return (
    <header className="border-b border-[#2A4B3C]/15 bg-[#F6F1E7]/95">
      <div className="mx-auto max-w-5xl px-5">
        <div className="flex items-center justify-between border-b border-[#2A4B3C]/10 py-2 text-[10px] tracking-[0.22em] text-[#2A4B3C]/55 sm:text-xs">
          <span>呼吸 · 觉察</span>
          <span className="italic tracking-[0.12em]">Practice, practice, and all is coming.</span>
        </div>
        <div className="flex flex-col gap-4 py-5 sm:flex-row sm:items-end sm:justify-between">
          <Link href="/" className="flex shrink-0 items-center gap-3 whitespace-nowrap text-[#203D31]">
            <img src="/icon.png" alt="" width={36} height={36} className="rounded-full" />
            <div>
              <span className="block text-2xl tracking-[0.08em]">熬汤日记</span>
              <span className="block text-[10px] tracking-[0.15em] text-[#98783E]">阿斯汤加 Ashtanga</span>
            </div>
          </Link>
          <nav
            aria-label="公开内容导航"
            className="flex w-full items-center gap-6 whitespace-nowrap border-t border-[#2A4B3C]/10 pt-3 text-sm text-[#2A4B3C]/65 sm:w-auto sm:border-0 sm:pt-0"
          >
            <Link href="/tools/ashtanga-practice-tracker">记录工具</Link>
            <Link href="/ashtanga">阿斯汤加</Link>
            <Link href="/authors/shao-bingbing">关于作者</Link>
          </nav>
        </div>
      </div>
    </header>
  )
}

export function PublicSiteFooter() {
  return (
    <footer className="border-t border-[#2A4B3C]/15 bg-[#EDE5D6]">
      <div className="mx-auto max-w-5xl px-5 py-12">
        <div className="mb-9 flex items-end justify-between pb-4">
          <div className="h-px flex-1 bg-gradient-to-r from-[#2A4B3C]/25 to-transparent" />
          <p className="px-6 text-xs tracking-[0.2em] text-[#98783E]">ASHTANGA JOURNAL</p>
          <div className="h-px flex-1 bg-gradient-to-l from-[#2A4B3C]/25 to-transparent" />
        </div>
        <div className="grid gap-8 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <p className="max-w-lg text-base leading-7 text-[#2A4B3C]/70">
              给阿斯汤加练习者的安静记录工具，也分享入门科普与个人感悟。
            </p>
            <Link
              href="/practice"
              className="mt-6 inline-flex min-h-11 items-center justify-center border border-[#2A4B3C] px-7 py-3 text-sm text-[#203D31] transition-colors hover:bg-[#203D31] hover:text-[#F9F7F2]"
            >
              开始练习
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <img
              src="/social/wechat-ashtanga-journal.jpg"
              alt="公众号 阿斯汤加-熬汤日记 二维码"
              width={88}
              height={88}
              className="border border-[#2A4B3C]/15 bg-[#F9F7F2] p-1"
            />
            <p className="max-w-28 text-xs leading-5 text-[#2A4B3C]/60">
              微信扫码或长按识别
              <br />
              阿斯汤加-熬汤日记
            </p>
          </div>
        </div>
        <div className="mt-10 pt-6 text-xs tracking-[0.12em] text-[#2A4B3C]/35">
          <p>熬汤日记 · 阿斯汤加瑜伽练习记录工具 · {new Date().getFullYear()}</p>
        </div>
      </div>
    </footer>
  )
}

export function PublicSiteFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen select-text bg-[linear-gradient(180deg,#F9F7F2_0%,#F6F1E7_100%)] text-[#2A4B3C]">
      <PublicSiteHeader />
      {children}
      <PublicSiteFooter />
    </div>
  )
}
