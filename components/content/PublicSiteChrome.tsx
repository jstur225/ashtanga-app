import Link from "next/link"
import type { ReactNode } from "react"

export function PublicSiteHeader() {
  return (
    <header className="border-b border-[#2A4B3C]/10 bg-[#F9F7F2]/95">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="flex shrink-0 items-center gap-2 whitespace-nowrap text-[#2A4B3C]">
          <img src="/icon.png" alt="" width={30} height={30} className="rounded-lg" />
          <span className="font-medium tracking-wide">熬汤日记</span>
        </Link>
        <nav
          aria-label="公开内容导航"
          className="flex w-full items-center justify-between gap-2 whitespace-nowrap text-xs text-[#2A4B3C]/70 sm:w-auto sm:justify-start sm:gap-4 sm:text-sm"
        >
          <Link href="/tools/ashtanga-practice-tracker">工具</Link>
          <Link href="/ashtanga">入门科普</Link>
          <Link href="/poses">体式科普</Link>
          <Link href="/authors/shao-bingbing">关于作者</Link>
        </nav>
      </div>
    </header>
  )
}

export function PublicSiteFooter() {
  return (
    <footer className="border-t border-[#2A4B3C]/10 bg-[#F9F7F2]">
      <div className="mx-auto grid max-w-3xl gap-6 px-5 py-10 sm:grid-cols-[1fr_auto]">
        <div>
          <p className="font-medium text-[#2A4B3C]">熬汤日记</p>
          <p className="mt-2 max-w-md text-sm leading-6 text-[#2A4B3C]/65">
            给阿斯汤加练习者的安静记录工具，也分享小白科普与个人感悟。本站不提供体式教学。
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-[#2A4B3C]/70">
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
            className="rounded-lg border border-[#2A4B3C]/10 bg-white p-1"
          />
          <p className="max-w-28 text-xs leading-5 text-[#2A4B3C]/60">
            微信扫码或长按识别
            <br />
            阿斯汤加-熬汤日记
          </p>
        </div>
      </div>
    </footer>
  )
}

export function PublicSiteFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen select-text bg-[#F9F7F2] text-[#2A4B3C]">
      <PublicSiteHeader />
      {children}
      <PublicSiteFooter />
    </div>
  )
}
