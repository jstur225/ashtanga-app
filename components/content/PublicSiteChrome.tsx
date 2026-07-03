import Link from "next/link"
import type { ReactNode } from "react"

export function PublicSiteHeader() {
  return (
    <header className="border-b border-[#2A4B3C]/15 bg-[#F6F1E7]/95">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
        <div className="animate-enter flex items-center gap-3 sm:gap-4">
          <div className="flex shrink-0 items-center gap-2 whitespace-nowrap text-[#203D31]">
            <img src="/icon.png" alt="" width={24} height={24} className="rounded-full ring-1 ring-[#C1A268]/20" />
            <span className="text-base tracking-[0.06em]">熬汤日记</span>
          </div>
          <span className="hidden text-base tracking-[0.2em] text-[#2A4B3C]/45 sm:inline">呼吸 · 觉察</span>
          <span className="hidden text-base italic tracking-[0.08em] text-[#2A4B3C]/35 md:inline">Practice, practice, and all is coming.</span>
        </div>
        <nav
          aria-label="公开内容导航"
          className="animate-enter animate-enter-delay-1 flex items-center gap-4 whitespace-nowrap text-base text-[#2A4B3C]/60 sm:gap-5"
        >
          <Link href="/tools/ashtanga-practice-tracker" className="transition-colors hover:text-[#98783E]">记录工具</Link>
          <Link href="/ashtanga" className="transition-colors hover:text-[#98783E]">阿斯汤加</Link>
          <Link href="/authors/shao-bingbing" className="transition-colors hover:text-[#98783E]">关于作者</Link>
        </nav>
      </div>
    </header>
  )
}

export function PublicSiteFooter() {
  return (
    <footer className="border-t border-[#2A4B3C]/15 bg-[#EDE5D6] bg-paper-dark">
      <div className="mx-auto max-w-5xl px-5 py-12">
        <div className="mb-9 flex items-end justify-between pb-4">
          <div className="h-px flex-1 bg-gradient-to-r from-[#2A4B3C]/25 to-transparent" />
          <p className="px-6 text-[10px] tracking-[0.25em] text-[#98783E]">ASHTANGA JOURNAL</p>
          <div className="h-px flex-1 bg-gradient-to-l from-[#2A4B3C]/25 to-transparent" />
        </div>
        <div className="animate-enter grid gap-8 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <p className="max-w-lg text-base leading-7 text-[#2A4B3C]/70">
              给阿斯汤加练习者的安静记录工具，也分享入门科普与个人感悟。
            </p>
            <Link
              href="/practice"
              className="mt-6 inline-flex min-h-11 items-center justify-center border border-[#2A4B3C] px-8 py-3 text-sm tracking-[0.08em] text-[#203D31] transition-all hover:bg-[#203D31] hover:text-[#F9F7F2]"
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
              className="img-warm-border"
            />
            <p className="max-w-28 text-xs leading-5 text-[#2A4B3C]/60">
              微信扫码或长按识别
              <br />
              阿斯汤加-熬汤日记
            </p>
          </div>
        </div>
        <div className="mt-10 pt-6 text-[10px] tracking-[0.18em] text-[#2A4B3C]/30">
          <p>熬汤日记 · 阿斯汤加瑜伽练习记录工具 · {new Date().getFullYear()}</p>
        </div>
      </div>
    </footer>
  )
}

export function PublicSiteFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen select-text bg-paper-pattern text-[#2A4B3C]">
      <PublicSiteHeader />
      {children}
      <PublicSiteFooter />
    </div>
  )
}
