import { PLACEHOLDER, type Project } from './types';

/**
 * All six projects, in carousel order.
 *
 * Media: drop files in public/projects/<slug>/ and rebuild:
 *   poster.(avif|webp|jpg|png)  screenshot, ~1600×1000, used on cards, carousel and page hero
 *   loop.(webm|mp4)             optional short muted loop, only the active card plays it
 * Without a poster, a gradient poster is generated from `accent` + `title`.
 *
 * Copy marked `// DRAFT` was written as a starting point: edit it in your own words.
 */
export const projects: Project[] = [
  {
    slug: 'formsmith',
    title: 'Formsmith',
    category: 'featured',
    oneLiner: 'Describe a form in plain English. Get a working multi-step form.',
    description:
      'An AI-assisted form builder: describe a form and it generates a multi-step form with validation and conditional logic, which you refine with AI patches, undo/redo and versioned publishing.',
    highlights: [
      'AI edits applied as validated patches with full undo/redo',
      'Versioned publishing and autosave',
      'Responses dashboard with a drop-off funnel',
    ],
    tech: ['Next.js', 'TypeScript', 'Supabase', 'Zustand', 'Zod', 'Vercel AI SDK', 'Gemini'],
    links: { live: 'https://formsmith.vercel.app', github: 'https://github.com/Gupta-deepanshu/formsmith' },
    accent: '#9D8CFF',
    posterAlt: 'Formsmith form builder interface',
    caseStudy: {
      // DRAFT
      overview:
        'Formsmith turns a plain-English description into a multi-step form with validation and conditional logic. You keep editing with natural-language patches, publish versions, and watch where respondents drop off.',
      // DRAFT
      role: 'Solo project: product design, frontend architecture, AI integration and data model.',
      // DRAFT
      problem:
        'Form builders are either fast but rigid, or flexible but slow to set up. Letting an AI generate the whole form is quick, but regenerating it on every change throws away the user’s manual edits.',
      decisions: [
        {
          // DRAFT
          title: 'The form is a typed schema, and the AI edits it with patches',
          body: 'The form lives as a Zod-validated JSON schema. The model returns small patches against that schema instead of a whole new form, so every AI edit can be validated, previewed, undone and redone like any manual change.',
        },
        {
          // DRAFT
          title: 'Undo/redo as a command history in Zustand',
          body: 'Every change, whether manual or AI, goes through one command stack, so history behaves the same regardless of where an edit came from, and autosave only has to persist one thing.',
        },
        {
          // DRAFT
          title: 'Versioned publishing',
          body: 'Published forms are immutable snapshots in Supabase. Responses always point at the version they were collected on, so editing a live form never corrupts existing data.',
        },
      ],
      results: PLACEHOLDER,
    },
  },
  {
    slug: 'rewind',
    title: 'Rewind',
    category: 'featured',
    oneLiner: 'A film database where every movie is a VHS tape on a video-store shelf.',
    description:
      'A film database in the style of IMDb, where every film appears as a VHS tape with a code-generated spine and cover. Live TMDB data, genre aisles, decades, box sets, people pages and an AI clerk you can ask in plain English.',
    highlights: [
      'Code-generated VHS spines and covers for every film',
      '“Ask the clerk”: natural-language search with the Vercel AI SDK',
      'Daily picks, genre aisles, decades, box sets, people and upcoming releases',
    ],
    tech: ['Next.js 16', 'React', 'TypeScript', 'TMDB API', 'Vercel AI SDK', 'Jest'],
    links: { live: 'https://rewind-delta.vercel.app', github: 'https://github.com/Gupta-deepanshu/rewind' },
    accent: '#E4C25A',
    posterAlt: 'Rewind video-store shelf of VHS tapes',
    caseStudy: {
      // DRAFT
      overview:
        'Rewind reimagines a film database as a neighbourhood video store. Every title is rendered as a VHS tape, aisles are genres and decades, and a clerk answers questions like “something like Alien but funnier”.',
      // DRAFT
      role: 'Solo project: concept, visual system, data layer, AI search and tests.',
      // DRAFT
      problem:
        'Film databases are dense lists of posters and numbers. I wanted browsing to feel like wandering a shelf, without giving up the depth of real data.',
      decisions: [
        {
          // DRAFT
          title: 'Spines and covers generated in code',
          body: 'Each tape’s spine and cover is generated from TMDB metadata (title, year, palette, rating), so thousands of films get a unique, consistent look with no hand-made assets.',
        },
        {
          // DRAFT
          title: 'Server-side TMDB access with caching',
          body: 'All TMDB calls run on the server with cache lifetimes per data type: daily picks refresh daily, people pages rarely. The API key never reaches the browser.',
        },
        {
          // DRAFT
          title: 'AI search that returns structured queries',
          body: 'The clerk turns a question into structured TMDB discover parameters instead of free text, so results stay grounded in real data and are fast to fetch.',
        },
      ],
      results: PLACEHOLDER,
    },
  },
  {
    slug: 'soul-ledger',
    title: 'Soul Ledger',
    category: 'featured',
    oneLiner: 'Deadlock stats: meta, matches, live games and player deep-dives.',
    description:
      'A stats dashboard for the game Deadlock with meta, matches, live match, players and player detail pages.',
    highlights: [
      'Meta overview of heroes and items',
      'Live match view alongside match history',
      'Player search and detailed player pages',
    ],
    tech: ['Next.js', 'React', 'TypeScript'],
    links: { live: 'https://soul-ledger-taupe.vercel.app', github: 'https://github.com/Gupta-deepanshu/soul-ledger' },
    accent: '#7FD1C3',
    posterAlt: 'Soul Ledger Deadlock stats dashboard',
    caseStudy: {
      // DRAFT
      overview:
        'Soul Ledger is a stats companion for Deadlock: what’s strong in the current meta, what happened in a match, what’s happening live, and how a given player performs.',
      // DRAFT
      role: 'Solo project: information architecture, data fetching and UI.',
      // DRAFT
      problem:
        'Game stats are a firehose. The challenge is to make dense numbers scannable on any screen, and to keep live data fresh without hammering the API.',
      decisions: [
        {
          // DRAFT
          title: 'Different freshness per page',
          body: 'Meta pages are cached for hours, match pages are immutable once a match ends, and the live view polls on a short interval, so each page is only as fresh as it needs to be.',
        },
        {
          // DRAFT
          title: 'Tables designed for scanning',
          body: 'Numeric columns use tabular figures, sticky headers and restrained colour, so the eye lands on outliers instead of on decoration.',
        },
      ],
      results: PLACEHOLDER,
    },
  },
  {
    slug: 'real-estate',
    title: 'Real Estate E-commerce',
    category: 'earlier',
    oneLiner: 'Responsive apartment browsing, built with Next.js.',
    description:
      'Responsive apartment-browsing platform using Next.js and modular React.js components.',
    highlights: ['Responsive from phone to desktop', 'Modular, reusable React.js components', 'Listings data from RapidAPI'],
    tech: ['React', 'Next.js', 'Chakra UI', 'RapidAPI', 'Vercel'],
    links: { live: 'https://realestate-website-six.vercel.app' },
    accent: '#8FA8FF',
    posterAlt: 'Realtor home page: a “Rental Homes for Everyone” hero above a grid of apartment listings with monthly price, beds, baths and size',
    short: {
      overview:
        'A responsive apartment-browsing platform using Next.js and modular React.js components. Each listing shows its monthly price, beds, baths and size.',
      built: [
        'Listing and detail pages built with Next.js',
        'Filterable listings backed by a RapidAPI property feed',
        'A modular component set styled with Chakra UI',
      ],
    },
  },
  {
    slug: 'crypto-tracker',
    title: 'Cryptocurrency Tracker',
    category: 'earlier',
    oneLiner: 'Real-time crypto prices with React Hooks.',
    description: 'A real-time cryptocurrency price tracker built with React Hooks and async REST API fetching.',
    highlights: ['Live prices from a REST API', 'Custom hooks for async data', 'Search and sort across coins'],
    tech: ['React', 'JavaScript', 'REST API'],
    links: { live: PLACEHOLDER, github: PLACEHOLDER },
    accent: '#5BD68B',
    posterAlt: 'Cryptocurrency price table',
    short: {
      overview: 'A price tracker that keeps coin prices fresh using React Hooks and asynchronous REST calls.',
      built: ['Async data fetching with hooks and loading/error states', 'Searchable, sortable price table'],
    },
  },
  {
    slug: 'travel',
    title: 'Travel Website',
    category: 'earlier',
    oneLiner: 'A responsive multi-page travel site.',
    description: 'A responsive multi-page travel website with client-side routing via React Router.',
    highlights: ['Multi-page routing with React Router', 'Responsive layouts from mobile to desktop'],
    tech: ['React', 'React Router', 'JavaScript'],
    links: { live: PLACEHOLDER, github: PLACEHOLDER },
    accent: '#F28FB0',
    posterAlt: 'Travel website home page',
    short: {
      overview: 'A responsive travel site with several pages connected by client-side routing.',
      built: ['Client-side routing with React Router', 'Responsive layouts and reusable sections'],
    },
  },
];

export const getProject = (slug: string) => projects.find((p) => p.slug === slug);
