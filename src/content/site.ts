import { PLACEHOLDER, type Site } from './types';

export const site: Site = {
  name: 'Deepanshu Gupta',
  shortName: 'Deepanshu',
  role: 'Senior Frontend Engineer',
  location: 'Gurugram, India',
  intro: 'I build fast, accessible interfaces for products people use every day.',
  summary: [
    'Frontend engineer with 5+ years building scalable, high-performance web applications with React, Next.js, TypeScript and GraphQL for Fortune 50 and global enterprise clients.',
    'I’ve built enterprise deal-management interfaces, CMS-driven component libraries, and AI-powered developer tooling on MCP that cut deployment lead time by 40%.',
  ],
  facts: [
    { value: '5+', label: 'years shipping production React' },
    { value: '1M+', label: 'customers on pages I built' },
    { value: '800+', label: 'stores running my inventory features' },
    { value: '40%', label: 'faster deploys with my MCP assistant' },
  ],
  email: 'deepanshug.707@gmail.com',
  links: {
    linkedin: PLACEHOLDER, // e.g. 'https://www.linkedin.com/in/your-handle'
    github: PLACEHOLDER, // e.g. 'https://github.com/your-handle'
    resume: PLACEHOLDER, // set to '/resume.pdf' once public/resume.pdf exists
  },
  // PLACEHOLDER: replace with your real domain once deployed.
  url: 'https://deepanshu-portfolio.vercel.app',
  seo: {
    title: 'Deepanshu Gupta: Senior Frontend Engineer',
    description:
      'Senior Frontend Engineer in Gurugram building fast, accessible React, Next.js and TypeScript interfaces for Fortune 50 and global enterprise clients.',
  },
};
