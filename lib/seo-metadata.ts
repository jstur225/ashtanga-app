import type { Metadata } from "next"
import type { PublicContentMeta } from "@/lib/public-content"
import { getPublicContentUrl } from "@/lib/public-content"

export const SITE_URL = "https://ash.ashtangalife.online"
export const SITE_NAME = "熬汤日记"
export const AUTHOR_NAME = "烧冰冰"
export const AUTHOR_PATH = "/authors/shao-bingbing"
export const XIAOHONGSHU_PROFILE =
  "https://www.xiaohongshu.com/user/profile/68330725000000000e01fd25"

export const buildContentMetadata = (meta: PublicContentMeta): Metadata => {
  const canonical = getPublicContentUrl(meta)
  const image = meta.image ?? "/icon.png"

  return {
    title: `${meta.title}｜${SITE_NAME}`,
    description: meta.description,
    keywords: meta.keywords,
    alternates: { canonical },
    openGraph: {
      type: "article",
      locale: "zh_CN",
      siteName: SITE_NAME,
      title: meta.title,
      description: meta.description,
      url: canonical,
      publishedTime: meta.publishedAt,
      modifiedTime: meta.updatedAt,
      authors: [AUTHOR_NAME],
      images: [{ url: image, alt: meta.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
      images: [image],
    },
  }
}

export const buildArticleJsonLd = (meta: PublicContentMeta) => {
  const url = `${SITE_URL}${getPublicContentUrl(meta)}`
  if (meta.schemaType === "SoftwareApplication") {
    return {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      applicationCategory: "HealthApplication",
      operatingSystem: "Web",
      url,
      description: meta.description,
      author: {
        "@type": "Person",
        name: AUTHOR_NAME,
        url: `${SITE_URL}${AUTHOR_PATH}`,
      },
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "CNY",
      },
    }
  }

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: meta.title,
    description: meta.description,
    datePublished: meta.publishedAt,
    dateModified: meta.updatedAt,
    mainEntityOfPage: url,
    image: `${SITE_URL}${meta.image ?? "/icon.png"}`,
    author: {
      "@type": "Person",
      name: AUTHOR_NAME,
      url: `${SITE_URL}${AUTHOR_PATH}`,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/icon.png`,
      },
    },
  }
}

export const buildBreadcrumbJsonLd = (meta: PublicContentMeta) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: SITE_NAME,
      item: SITE_URL,
    },
    {
      "@type": "ListItem",
      position: 2,
      name: meta.eyebrow,
      item: `${SITE_URL}/${meta.section}`,
    },
    {
      "@type": "ListItem",
      position: 3,
      name: meta.title,
      item: `${SITE_URL}${getPublicContentUrl(meta)}`,
    },
  ],
})
