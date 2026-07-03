import type { Metadata } from "next"
import { PublicContentIndex } from "@/components/content/PublicContentIndex"
import { getAllPublicContentMeta } from "@/lib/public-content"

export const metadata: Metadata = {
  title: "阿斯汤加体式科普｜名称、图片与序列位置",
  description: "面向普通练习者认识阿斯汤加体式的梵文名称、中文叫法、图片和所在序列；只做科普，不提供体式教学。",
  alternates: { canonical: "/poses" },
}

export default function PosesIndexPage() {
  const entries = getAllPublicContentMeta().filter((meta) => meta.section === "poses")
  return (
    <PublicContentIndex
      eyebrow="小白科普"
      title="认识阿斯汤加体式"
      description="用中文名、梵文名、图片和序列位置帮你认识体式。这里不是线上课程，也不教动作。"
      section="poses"
      entries={entries}
    >
      <section>
        <h2 className="text-2xl font-semibold text-[#203d31]">这个页面能帮你做什么</h2>
        <p className="mt-3">
          看到一个体式却不知道叫什么时，可以在这里把图片、中文名称和梵文名称对应起来；记不清它属于站立、坐立还是结束序列时，也可以快速查找。
        </p>
      </section>
      <section>
        <h2 className="text-2xl font-semibold text-[#203d31]">这个页面不做什么</h2>
        <p className="mt-3">
          不教你怎样进入体式，不评价动作是否标准，也不根据一张照片判断身体问题。图片只是识别资料，不是练习目标；真正的动作学习和调整应当交给老师。
        </p>
      </section>
    </PublicContentIndex>
  )
}
