/**
 * Content types. Every piece of copy on the site lives in src/content/*.ts and is
 * typed here, so content can be edited without touching components.
 */

/** Sentinel for values you still need to fill in. Search the repo for PLACEHOLDER. */
export const PLACEHOLDER = 'PLACEHOLDER' as const;
export type Placeholder = typeof PLACEHOLDER;

/** A URL that may not exist yet. The UI never renders a placeholder as a live link. */
export type MaybeUrl = string | Placeholder;

export interface Site {
  name: string;
  /** Short form used in the nav and loader. */
  shortName: string;
  role: string;
  location: string;
  intro: string;
  /** Paragraphs. About splits them into rendered lines (GSAP SplitText) and reveals line by line. */
  summary: string[];
  /** Quick facts strip next to the summary: recruiters scan these first. */
  facts: { value: string; label: string }[];
  email: string;
  links: {
    linkedin: MaybeUrl;
    github: MaybeUrl;
    /** Path to the PDF in /public, e.g. "/resume.pdf". */
    resume: MaybeUrl;
  };
  /** Production URL, used for canonical URLs, sitemap and Open Graph. */
  url: string;
  seo: { title: string; description: string };
}

export interface ClientEngagement {
  client: string;
  /** What the product is, in a few words. */
  context: string;
  current?: boolean;
  achievements: string[];
  tech: string[];
}

export interface Role {
  company: string;
  location: string;
  title: string;
  /** Earlier titles at the same company, shown small. */
  progression?: string;
  start: string;
  end: string;
  engagements: ClientEngagement[];
}

export interface Decision {
  title: string;
  body: string;
}

export interface CaseStudy {
  overview: string;
  role: string;
  problem: string;
  decisions: Decision[];
  results: string | Placeholder;
}

export interface ShortStudy {
  overview: string;
  built: string[];
}

interface ProjectBase {
  slug: string;
  title: string;
  oneLiner: string;
  description: string;
  highlights: string[];
  tech: string[];
  /** Omit `github` for a project with no public source: no GitHub pill is shown. */
  links: { live: MaybeUrl; github?: MaybeUrl };
  /** Hex colour used for the generated poster and project page accents. */
  accent: `#${string}`;
  /** Alt text for the poster / screenshot. */
  posterAlt: string;
}

export interface FeaturedProject extends ProjectBase {
  category: 'featured';
  caseStudy: CaseStudy;
}

export interface EarlierProject extends ProjectBase {
  category: 'earlier';
  short: ShortStudy;
}

export type Project = FeaturedProject | EarlierProject;

export interface SkillGroup {
  label: string;
  items: string[];
}

export interface Education {
  degree: string;
  school: string;
  location: string;
  start: string;
  end: string;
  grade: string;
}

export interface ProjectMedia {
  poster?: string;
  video: { src: string; type: string }[];
}

export type MediaManifest = Record<string, ProjectMedia>;
