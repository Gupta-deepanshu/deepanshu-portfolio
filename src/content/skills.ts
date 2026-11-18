import type { Education, SkillGroup } from './types';

export const skills: SkillGroup[] = [
  { label: 'Languages', items: ['JavaScript (ES6+)', 'TypeScript', 'HTML5', 'CSS3', 'C++'] },
  { label: 'Frameworks', items: ['React', 'Next.js', 'Redux', 'React Router'] },
  { label: 'Styling', items: ['Tailwind CSS', 'Styled Components', 'Chakra UI'] },
  { label: 'APIs & CMS', items: ['GraphQL', 'REST', 'Contentful'] },
  { label: 'Testing & tools', items: ['Jest', 'Storybook', 'Git', 'CI/CD', 'Vercel'] },
  { label: 'AI', items: ['Claude', 'GitHub Copilot', 'MCP'] },
];

export const education: Education = {
  degree: 'B.Tech in Computer Science & Engineering',
  school: 'Guru Nanak Dev University',
  location: 'Amritsar',
  start: '2017',
  end: '2021',
  grade: 'CGPA 8.95',
};
