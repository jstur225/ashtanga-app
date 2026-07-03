import type { Metadata } from "next"
import { PublicContentIndex } from "@/components/content/PublicContentIndex"
import { getAllPublicContentMeta } from "@/lib/public-content"

export const metadata: Metadata = {
  title: "阿斯汤加入门科普｜熬汤日记",
  description: "面向普通练习者认识 Mysore、一序列、月相日、唱诵和练习记录；分享工具、常识与个人感受，不提供体式教学。",
  alternates: { canonical: "/ashtanga" },
}

export default function AshtangaIndexPage() {
  const entries = getAllPublicContentMeta().filter((meta) => meta.section === "ashtanga")
  return (
    <PublicContentIndex
      eyebrow="阿斯汤加入门"
      title="普通练习者的阿斯汤加科普"
      description="用小白能读懂的话认识序列、Mysore、月相、唱诵和练习记录。这里分享工具、常识与个人感受，不提供体式教学。"
      section="ashtanga"
      entries={entries}
    >
      <section>
        <h2 className="text-2xl font-semibold text-[#203d31]">阿斯汤加是什么</h2>
        <p className="mt-3">
          阿斯汤加瑜伽以相对固定的体式顺序练习，把动作、呼吸和凝视点连接起来。常见学习方式包括老师统一计数的口令课，以及每个人按各自进度练习、老师逐一指导的 Mysore 课。
        </p>
      </section>
      <section>
        <h2 className="text-2xl font-semibold text-[#203d31]">刚听说阿斯汤加，可以先知道什么</h2>
        <p className="mt-3">
          不需要先背完整一序列，也不需要读懂所有梵文。先弄清 Mysore 和口令课是什么、为什么序列会重复、月相日为什么休息，就能理解大多数练习者日常聊天里的词。
        </p>
      </section>
      <section>
        <h2 className="text-2xl font-semibold text-[#203d31]">这个知识库提供什么</h2>
        <p className="mt-3">
          这里整理 Mysore、一序列、月相日、开篇唱诵、练习记录与觉察笔记等常见问题。想认体式名称时，可以查看体式科普；想留下自己的练习时，可以直接使用熬汤日记。
        </p>
      </section>
    </PublicContentIndex>
  )
}
