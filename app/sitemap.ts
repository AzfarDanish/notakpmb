import type { MetadataRoute } from 'next';
import { getProgrammes } from '@/lib/subjects';

const BASE_URL = 'https://notakpmb.vercel.app';

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
  ];

  const programmes = await getProgrammes();

  for (const programme of programmes) {
    entries.push({
      url: `${BASE_URL}/programme/${programme.id}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    });

    for (const subject of programme.subjects) {
      entries.push({
        url: `${BASE_URL}/subject/${subject.id}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  }

  return entries;
}