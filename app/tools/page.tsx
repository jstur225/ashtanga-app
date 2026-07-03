import type { Metadata } from "next"
import { PublicContentIndex } from "@/components/content/PublicContentIndex"
import { getAllPublicContentMeta } from "@/lib/public-content"

export const metadata: Metadata = {
  title: "阿斯汤加练习工具｜熬汤日记",
  description: "使用熬汤日记记录阿斯汤加练习、时长、觉察、照片、月相日历和长期统计。",
  alternates: { canonical: "/tools" },
}

export default function ToolsIndexPage() {
  const entries = getAllPublicContentMeta().filter((meta) => meta.section === "tools")
  return (
    <PublicContentIndex
      eyebrow="在线工具"
      title="阿斯汤加练习工具"
      description="无需下载，打开网页即可开始计时、打卡并记录身体觉察。"
      section="tools"
      entries={entries}
    />
  )
}
