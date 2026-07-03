import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { PublicContentPage } from "@/components/content/PublicContentPage"
import { getAllPublicContentMeta, getPublicContent } from "@/lib/public-content"
import { buildContentMetadata } from "@/lib/seo-metadata"

interface ContentPageProps {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return getAllPublicContentMeta()
    .filter((meta) => meta.section === "poses")
    .map((meta) => ({ slug: meta.slug }))
}

export async function generateMetadata({ params }: ContentPageProps): Promise<Metadata> {
  const { slug } = await params
  const document = getPublicContent("poses", slug)
  return document ? buildContentMetadata(document.meta) : {}
}

export default async function PoseContentPage({ params }: ContentPageProps) {
  const { slug } = await params
  const document = getPublicContent("poses", slug)
  if (!document) notFound()
  return <PublicContentPage document={document} />
}
