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
      <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <p className="text-sm tracking-[0.16em] text-[#98783e]">作者与主理人</p>
        <h1 className="mt-4 text-4xl font-semibold text-[#203d31]">烧冰冰</h1>
        <p className="mt-5 text-lg leading-8 text-[#2A4B3C]/75">
          阿斯汤加练习者、熬汤日记主理人和独立开发者。
        </p>

        <div className="mt-10 space-y-5 text-base leading-8 text-[#2A4B3C]/85">
          <p>
            我练习阿斯汤加四年，一直想找一个安静、简单、真正理解练习者的记录工具。它不需要课程、排名和社交，只需要帮我留下练习、呼吸和身体觉察。
          </p>
          <p>
            熬汤日记因此而生。它最初是我给自己写的工具，现在也开放给每一位想认真记录练习的人。
          </p>
          <p>
            这里写的是普通练习者用得上的工具、入门科普和我的个人感受，不是专业教学网站。我不是在网上教体式；动作学习和身体调整仍然应该交给合适的老师。
          </p>
        </div>

        <section className="mt-12 grid gap-5 rounded-3xl bg-white p-6 sm:grid-cols-[1fr_auto] sm:items-center">
          <div>
            <h2 className="text-xl font-semibold text-[#203d31]">找到烧冰冰</h2>
            <a
              href={XIAOHONGSHU_PROFILE}
              target="_blank"
              rel="me noopener noreferrer"
              className="mt-4 inline-block underline decoration-[#C1A268] underline-offset-4"
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
            className="rounded-xl border border-[#2A4B3C]/10 bg-white p-1"
          />
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold text-[#203d31]">从这里开始</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Link href="/tools/ashtanga-practice-tracker" className="rounded-2xl bg-white p-5">
              <span className="font-medium">了解熬汤日记</span>
              <span className="mt-2 block text-sm text-[#2A4B3C]/60">功能、使用方式与会员权益</span>
            </Link>
            <Link href="/ashtanga/practice-record" className="rounded-2xl bg-white p-5">
              <span className="font-medium">怎样记录一次练习</span>
              <span className="mt-2 block text-sm text-[#2A4B3C]/60">从打卡到身体觉察</span>
            </Link>
          </div>
        </section>
      </main>
    </PublicSiteFrame>
  )
}
