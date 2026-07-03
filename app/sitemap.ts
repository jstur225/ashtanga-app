import { MetadataRoute } from 'next'
import { getAllPublicContentMeta, getPublicContentUrl } from '@/lib/public-content'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://ash.ashtangalife.online'
  const contentPages = getAllPublicContentMeta().map((meta) => ({
    url: `${baseUrl}${getPublicContentUrl(meta)}`,
    lastModified: meta.updatedAt,
    changeFrequency: 'monthly' as const,
    priority: meta.section === 'tools' ? 0.9 : 0.7,
  }))

  return [
    {
      url: baseUrl,
      lastModified: '2026-07-03',
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/tools`,
      lastModified: '2026-07-03',
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/ashtanga`,
      lastModified: '2026-07-03',
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/authors/shao-bingbing`,
      lastModified: '2026-07-03',
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    ...contentPages,
  ]
}
