import type { Education, SkillGroup } from './types';

/**
 * Mirrors "Technical Skills" on the résumé (public/Deepanshu_Gupta_Resume.pdf). The résumé's
 * two 10-item groups are split in two here, because each carousel card has a fixed height
 * and fits about six items.
 */
export const skills: SkillGroup[] = [
  { label: 'Languages', items: ['JavaScript (ES6+)', 'TypeScript', 'HTML5', 'CSS3'] },
  { label: 'Frameworks & state', items: ['React.js', 'Next.js', 'Redux', 'React Router', 'Zustand', 'SWR'] },
  {
    label: 'Styling & motion',
    items: ['Tailwind CSS', 'Styled Components', 'Chakra UI', 'GSAP (ScrollTrigger)', 'Motion', 'three.js'],
  },
  {
    label: 'APIs & data',
    items: ['GraphQL', 'REST APIs', 'Contentful (headless CMS)', 'Supabase (Postgres, RLS)'],
  },
  { label: 'Testing', items: ['Jest', 'Vitest', 'Playwright', 'Storybook'] },
  { label: 'Tools', items: ['Git', 'GitLab', 'CI/CD', 'Jira', 'Postman', 'Vercel'] },
  {
    label: 'AI',
    items: ['Vercel AI SDK (structured output, tool calling)', 'MCP', 'Claude', 'GitHub Copilot'],
  },
  {
    label: 'Concepts',
    items: ['SSR', 'Caching', 'Performance optimization', 'Component architecture', 'DSA'],
  },
];

export const education: Education = {
  degree: 'B.Tech in Computer Science & Engineering',
  school: 'Guru Nanak Dev University',
  location: 'Amritsar',
  start: '2017',
  end: '2021',
  grade: 'CGPA 8.95',
};
