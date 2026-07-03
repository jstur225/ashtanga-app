import type { Metadata } from "next"
import Link from "next/link"
import { JsonLd } from "@/components/content/JsonLd"
import { PublicSiteFrame } from "@/components/content/PublicSiteChrome"
import {
  AUTHOR_PATH,
  SITE_NAME,
  SITE_URL,
  XIAOHONGSHU_PROFILE,
} from "@/lib/seo-metadata"

export const metadata: Metadata = {
  title: `烧冰冰｜${SITE_NAME}主理人`,
  description: "烧冰冰，阿斯汤加练习者、熬汤日记主理人和独立开发者。了解她为什么制作这款安静的练习记录工具。",
  alternates: { canonical: AUTHOR_PATH },
  openGraph: {
    type: "profile",
    title: `烧冰冰｜${SITE_NAME}主理人`,
    description: "阿斯汤加练习者、熬汤日记主理人和独立开发者。",
    url: AUTHOR_PATH,
    images: [{ url: "/icon.png", alt: "熬汤日记" }],
  },
}

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "烧冰冰",
  url: `${SITE_URL}${AUTHOR_PATH}`,
  jobTitle: `${SITE_NAME}主理人`,
  description: "阿斯汤加练习者、熬汤日记主理人和独立开发者。",
  sameAs: [XIAOHONGSHU_PROFILE],
  worksFor: {
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
  },
}

export default function AuthorPage() {
  return (
    <PublicSiteFrame>
      <JsonLd data={personJsonLd} />
      <main className="mx-auto max-w-5xl px-5 py-12 sm:py-20">
        <header className="grid gap-8 border-b border-[#2A4B3C]/20 pb-12 sm:grid-cols-[1fr_2.3fr] sm:gap-12 sm:pb-16">
          <div>
            <p className="text-xs tracking-[0.22em] text-[#98783E]">MASTHEAD · 主理人</p>
            <p className="mt-4 text-sm tracking-[0.14em] text-[#2A4B3C]/55">作者档案 001</p>
          </div>
          <div>
            <h1 className="text-5xl font-medium tracking-[-0.03em] text-[#203D31] sm:text-7xl">烧冰冰</h1>
            <p className="mt-6 text-xl leading-9 text-[#2A4B3C]/70">
              阿斯汤加练习者、熬汤日记主理人和独立开发者。
            </p>
          </div>
        </header>

        <div className="mx-auto mt-14 grid max-w-4xl gap-10 sm:grid-cols-[1fr_2.4fr] sm:gap-14">
          <aside className="text-xs leading-6 tracking-[0.12em] text-[#2A4B3C]/50">
            <div className="border-t border-[#98783E] pt-4">
              <p>ABOUT</p>
              <p className="mt-2 tracking-normal">练习四年</p>
              <p className="tracking-normal">独立开发</p>
            </div>
          </aside>
          <div className="space-y-6 text-[17px] leading-9 text-[#2A4B3C]/82">
            <p className="text-xl leading-10 text-[#203D31]">
              我一直想找一个安静、简单、真正理解练习者的记录工具。
            </p>
            <p>
              我练习阿斯汤加四年。想要的工具不需要课程、排名和社交，只需要帮我留下练习、呼吸和身体觉察。
            </p>
            <p>
              熬汤日记因此而生。它最初是我给自己写的工具，现在也开放给每一位想认真记录练习的人。
            </p>
            <p>
              这里写的是普通练习者用得上的工具、入门科普和我的个人感受，不是专业教学网站。我不是在网上教体式；动作学习和身体调整仍然应该交给合适的老师。
            </p>
          </div>
        </div>

        <section className="mx-auto mt-16 grid max-w-4xl gap-7 border-y border-[#2A4B3C]/20 py-8 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <p className="text-xs tracking-[0.2em] text-[#98783E]">FOLLOW THE JOURNAL</p>
            <h2 className="mt-3 text-2xl text-[#203D31]">找到烧冰冰</h2>
            <a
              href={XIAOHONGSHU_PROFILE}
              target="_blank"
              rel="me noopener noreferrer"
              className="mt-5 inline-block text-[#315F4A] underline decoration-[#C1A268] underline-offset-4"
            >
              小红书主页：烧冰冰
            </a>
            <p className="mt-3 text-sm leading-6 text-[#2A4B3C]/65">
              微信公众号：阿斯汤加-熬汤日记
            </p>
          </div>
          <img
            src="/social/wechat-ashtanga-journal.jpg"
            alt="微信公众号“阿斯汤加-熬汤日记”二维码"
            width={150}
            height={150}
            className="border border-[#2A4B3C]/15 bg-[#F9F7F2] p-1"
          />
        </section>

        <section className="mx-auto mt-16 max-w-4xl">
          <div className="flex items-end justify-between border-b border-[#2A4B3C]/20 pb-3">
            <h2 className="text-2xl text-[#203D31]">从这里开始</h2>
            <span className="text-xs tracking-[0.18em] text-[#98783E]">SELECTED</span>
          </div>
          <div>
            <Link href="/tools/ashtanga-practice-tracker" className="group grid gap-2 border-b border-[#2A4B3C]/12 py-7 sm:grid-cols-[4rem_1fr_auto] sm:items-center">
              <span className="text-sm text-[#98783E]">01</span>
              <span>
                <span className="block text-xl text-[#203D31]">了解熬汤日记</span>
                <span className="mt-2 block text-sm text-[#2A4B3C]/60">功能、使用方式与会员权益</span>
              </span>
              <span aria-hidden="true" className="hidden text-xl text-[#98783E] sm:block">↗</span>
            </Link>
            <Link href="/ashtanga/practice-record" className="group grid gap-2 border-b border-[#2A4B3C]/12 py-7 sm:grid-cols-[4rem_1fr_auto] sm:items-center">
              <span className="text-sm text-[#98783E]">02</span>
              <span>
                <span className="block text-xl text-[#203D31]">怎样记录一次练习</span>
                <span className="mt-2 block text-sm text-[#2A4B3C]/60">从打卡到身体觉察</span>
              </span>
              <span aria-hidden="true" className="hidden text-xl text-[#98783E] sm:block">↗</span>
            </Link>
          </div>
        </section>
      </main>
    </PublicSiteFrame>
  )
}
