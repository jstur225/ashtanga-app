import Link from "next/link"
import type { ReactNode } from "react"

export function PublicSiteHeader() {
  return (
    <header className="border-b border-[#2A4B3C]/15 bg-[#F6F1E7]/95">
      <div className="mx-auto max-w-5xl px-5">
        <div className="flex items-center justify-between border-b border-[#2A4B3C]/10 py-2 text-[10px] tracking-[0.22em] text-[#2A4B3C]/55 sm:text-xs">
          <span>ASHTANGA JOURNAL</span>
          <span>工具 · 科普 · 练习随笔</span>
        </div>
        <div className="flex flex-col gap-4 py-5 sm:flex-row sm:items-end sm:justify-between">
          <Link href="/" className="flex shrink-0 items-center gap-3 whitespace-nowrap text-[#203D31]">
            <img src="/icon.png" alt="" width={36} height={36} className="rounded-full" />
            <span className="text-2xl tracking-[0.08em]">熬汤日记</span>
          </Link>
          <nav
            aria-label="公开内容导航"
            className="flex w-full items-center gap-6 whitespace-nowrap border-t border-[#2A4B3C]/10 pt-3 text-sm text-[#2A4B3C]/65 sm:w-auto sm:border-0 sm:pt-0"
          >
            <Link href="/tools/ashtanga-practice-tracker">工具</Link>
            <Link href="/ashtanga">入门科普</Link>
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
        <div className="mb-9 flex items-end justify-between border-b border-[#2A4B3C]/15 pb-4">
          <p className="text-3xl tracking-[0.08em] text-[#203D31]">熬汤日记</p>
          <p className="hidden text-xs tracking-[0.2em] text-[#98783E] sm:block">ASHTANGA JOURNAL</p>
        </div>
        <div className="grid gap-8 sm:grid-cols-[1fr_auto]">
          <div>
            <p className="max-w-lg text-base leading-7 text-[#2A4B3C]/70">
              给阿斯汤加练习者的安静记录工具，也分享小白科普与个人感悟。本站不提供体式教学。
            </p>
            <div className="mt-6 flex flex-wrap gap-5 text-sm text-[#2A4B3C]/70">
              <Link href="/practice">开始练习</Link>
              <Link href="/authors/shao-bingbing">烧冰冰</Link>
              <a
                href="https://www.xiaohongshu.com/user/profile/68330725000000000e01fd25"
                target="_blank"
                rel="me noopener noreferrer"
              >
                小红书
              </a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <img
              src="/social/wechat-ashtanga-journal.jpg"
              alt="微信公众号“阿斯汤加-熬汤日记”二维码"
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
