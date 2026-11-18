import type { Role } from './types';

export const experience: Role[] = [
  {
    company: 'Accenture',
    location: 'Gurugram',
    title: 'Software Development Senior Analyst (Senior Frontend Engineer)',
    start: 'Sep 2024',
    end: 'Present',
    engagements: [
      {
        client: 'Leading US industrial gas distributor',
        context: 'Public website · 1M+ customers',
        current: true,
        achievements: [
          'Build reusable React and TypeScript page components for a public website serving 1M+ customers.',
          'Expose them as Contentful content models so the content team assembles pages without code changes.',
        ],
        tech: ['React', 'TypeScript', 'Contentful'],
      },
      {
        client: 'Fortune 50 technology company',
        context: 'Proposal & deal management platform',
        achievements: [
          'Independently built the end-to-end multi-step deal submission flow, consolidating up to 50 proposals per deal with hierarchical approvals.',
          'Built an AI-powered deployment assistant on MCP that triggers CI/CD pipelines from VS Code in natural language (build, test, BVT in sequence), cutting deployment lead time by 40%.',
          'Generalised the assistant so other teams could onboard their own apps.',
        ],
        tech: ['React', 'TypeScript', 'GraphQL', 'MCP'],
      },
      {
        client: 'Leading Australian supermarket chain',
        context: 'Store inventory web app · 800+ stores',
        achievements: [
          'Developed critical features for an internal app used for stock checks, inventory and stock bundling across 800+ stores.',
          'GraphQL data fetching, Jest tests and Storybook-documented components.',
        ],
        tech: ['React', 'Next.js', 'TypeScript', 'GraphQL', 'Jest', 'Storybook'],
      },
    ],
  },
  {
    company: 'Capgemini',
    location: 'Pune',
    title: 'Associate Consultant',
    progression: 'Software Engineer → Senior Software Engineer → Associate Consultant',
    start: 'Sep 2021',
    end: 'Aug 2024',
    engagements: [
      {
        client: 'Global pharmaceutical & life sciences company',
        context: 'Internal dashboards & enterprise apps',
        achievements: [
          'Built responsive, secure internal dashboards and enterprise apps.',
          'Migrated duplicated UI into a reusable component architecture (+40% code reusability).',
          'Refactored legacy code into modern React patterns.',
          'Mentored and onboarded junior developers.',
        ],
        tech: ['React', 'JavaScript', 'Redux'],
      },
    ],
  },
];
