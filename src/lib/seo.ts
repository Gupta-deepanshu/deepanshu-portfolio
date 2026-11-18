import { site } from '@/content/site';
import { experience } from '@/content/experience';
import { education } from '@/content/skills';
import { hrefOf } from './placeholder';

/** schema.org Person, so search results can show name, role and links. */
export function personJsonLd() {
  const sameAs = [hrefOf(site.links.linkedin), hrefOf(site.links.github)].filter(Boolean);
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: site.name,
    jobTitle: site.role,
    url: site.url,
    email: `mailto:${site.email}`,
    address: { '@type': 'PostalAddress', addressLocality: 'Gurugram', addressCountry: 'IN' },
    worksFor: { '@type': 'Organization', name: experience[0].company },
    alumniOf: { '@type': 'CollegeOrUniversity', name: education.school },
    ...(sameAs.length ? { sameAs } : {}),
  };
}
