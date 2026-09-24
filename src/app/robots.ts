import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  // A URL base idealmente viria de uma variável de ambiente, mas como fallback usamos o domínio em produção
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://entreluar.com.br'

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/_next/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
