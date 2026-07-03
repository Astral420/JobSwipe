export type TagVariant = 'remote' | 'full' | 'hybrid' | 'contract' | 'onsite' | 'cloud';

export type JobTag = {
  label: string;
  variant: TagVariant;
};

export type Review = {
  name: string;
  role: string;
  rating: number;
  date: string;
  text: string;
};

export type Job = {
  id: number;
  abbr: string;
  company: string;
  role: string;
  salary: string;
  location: string;
  tags: JobTag[];
  match: number;
  posted: string;
  applicants: number;
  accentColor: string;
  distanceKm: number;
  image: any;
  aboutRole: string;
  requirements: string;
  glassdoorRating: number;
  companyPhotos: any[];
  reviews: Review[];
};

export const TAG_STYLES: Record<TagVariant, { bg: string; text: string; border: string }> = {
  remote: { bg: 'rgba(168,85,247,0.22)', text: '#d8b4fe', border: 'rgba(168,85,247,0.35)' },
  full: { bg: 'rgba(34,197,94,0.18)', text: '#86efac', border: 'rgba(34,197,94,0.28)' },
  hybrid: { bg: 'rgba(56,189,248,0.18)', text: '#7dd3fc', border: 'rgba(56,189,248,0.28)' },
  contract: { bg: 'rgba(251,191,36,0.18)', text: '#fde68a', border: 'rgba(251,191,36,0.28)' },
  onsite: { bg: 'rgba(251,113,133,0.18)', text: '#fda4af', border: 'rgba(251,113,133,0.28)' },
  cloud: { bg: 'rgba(56,189,248,0.18)', text: '#7dd3fc', border: 'rgba(56,189,248,0.28)' },
};

export const FILTERS = ['All', 'Remote', 'Hybrid', 'On-site', 'Startup', 'Enterprise'];

export const JOBS: Job[] = [
  {
    id: 1,
    abbr: 'TF',
    company: 'TechFlow Inc',
    role: 'Sr. React Native Engineer',
    salary: '$120k - $150k / yr',
    location: 'San Francisco - Remote',
    tags: [
      { label: 'Remote', variant: 'remote' },
      { label: 'Full-time', variant: 'full' },
    ],
    match: 92,
    posted: '2h ago',
    applicants: 34,
    accentColor: '#a855f7',
    distanceKm: 3.9,
    image: require('../app/assets/images/accenture.jpg') as any,
    aboutRole:
      'Lead the development of a high-impact React Native app used by millions. Own architecture decisions, mentor junior engineers, and collaborate closely with product and design.',
    requirements: 'React Native - TypeScript - GraphQL - 5+ yrs',
    glassdoorRating: 4.3,
    companyPhotos: [
      require('../app/assets/images/accenture.jpg') as any,
      require('../app/assets/images/accenture2.jpg') as any,
      require('../app/assets/images/accenture3.jpg') as any,
    ],
    reviews: [
      { name: 'Jordan M.', role: 'Senior Engineer', rating: 4, date: 'Mar 2024', text: 'Great engineering culture and real ownership over the product. Teams move fast.' },
      { name: 'Priya S.', role: 'Mobile Developer', rating: 5, date: 'Jan 2024', text: 'Excellent mentorship and growth opportunities. Best team I have worked with.' },
      { name: 'Alex R.', role: 'Tech Lead', rating: 4, date: 'Nov 2023', text: 'Challenging problems and competitive pay. Leadership is transparent.' },
    ],
  },
  {
    id: 2,
    abbr: 'DS',
    company: 'DataStream',
    role: 'ML Engineer',
    salary: '$140k - $180k / yr',
    location: 'Boston - On-site',
    tags: [
      { label: 'On-site', variant: 'onsite' },
      { label: 'Full-time', variant: 'full' },
    ],
    match: 85,
    posted: '1d ago',
    applicants: 22,
    accentColor: '#1e40af',
    distanceKm: 8.2,
    image: require('../app/assets/images/socia.png') as any,
    aboutRole:
      'Design and deploy production ML systems at scale. Work closely with data scientists and engineers to turn research into real-world impact across our core product.',
    requirements: 'Python - PyTorch - Spark - 4+ yrs',
    glassdoorRating: 4.1,
    companyPhotos: [
      require('../app/assets/images/socia.png') as any,
      require('../app/assets/images/socia2.jpg') as any,
      require('../app/assets/images/socia3.jpg') as any,
    ],
    reviews: [
      { name: 'Marcus T.', role: 'Data Scientist', rating: 4, date: 'Apr 2024', text: 'Strong technical team and cutting-edge projects. Great place to grow in ML.' },
      { name: 'Lin W.', role: 'ML Engineer', rating: 5, date: 'Feb 2024', text: 'Top-tier infrastructure and genuinely smart colleagues. Highly recommend.' },
      { name: 'Sofia K.', role: 'Research Engineer', rating: 3, date: 'Dec 2023', text: 'Interesting work, though the on-site requirement can be demanding at times.' },
    ],
  },
  {
    id: 3,
    abbr: 'IL',
    company: 'InnovateLabs',
    role: 'Product Designer',
    salary: '$100k - $130k / yr',
    location: 'New York - Hybrid',
    tags: [
      { label: 'Hybrid', variant: 'hybrid' },
      { label: 'Full-time', variant: 'full' },
    ],
    match: 78,
    posted: '5h ago',
    applicants: 61,
    accentColor: '#9f1239',
    distanceKm: 15.4,
    image: require('../app/assets/images/alorica.jpg') as any,
    aboutRole:
      'Shape the future of our product experience. Create user-centric designs from research to delivery, and work hand-in-hand with engineers to ship pixel-perfect interfaces.',
    requirements: 'Figma - Design Systems - Research - 3+ yrs',
    glassdoorRating: 4.5,
    companyPhotos: [
      require('../app/assets/images/alorica.jpg') as any,
      require('../app/assets/images/alorica2.jpg') as any,
      require('../app/assets/images/alorica3.jpg') as any,
    ],
    reviews: [
      { name: 'Tariq L.', role: 'Product Designer', rating: 4, date: 'Feb 2024', text: 'Solid creative culture and real collaboration with engineering. Leadership listens.' },
      { name: 'Keiko P.', role: 'UX Researcher', rating: 5, date: 'Dec 2023', text: 'Best design team I have worked in. Blameless culture and genuinely supportive.' },
      { name: 'Sam W.', role: 'Visual Designer', rating: 4, date: 'Oct 2023', text: 'Great scope of work and a real say in design decisions. Pay is competitive.' },
    ],
  },
  {
    id: 4,
    abbr: 'CP',
    company: 'CloudPeak',
    role: 'Backend Engineer',
    salary: '$110k - $140k / yr',
    location: 'Austin - Remote',
    tags: [
      { label: 'Remote', variant: 'remote' },
      { label: 'Contract', variant: 'contract' },
    ],
    match: 88,
    posted: '3h ago',
    applicants: 15,
    accentColor: '#166534',
    distanceKm: 20.1,
    image: require('../app/assets/images/accenture2.jpg') as any,
    aboutRole:
      'Build and scale robust backend systems that power our SaaS platform. Own services end-to-end in a microservices architecture with high reliability standards.',
    requirements: 'Go - PostgreSQL - Kafka - 4+ yrs',
    glassdoorRating: 4,
    companyPhotos: [
      require('../app/assets/images/accenture2.jpg') as any,
      require('../app/assets/images/accenture3.jpg') as any,
      require('../app/assets/images/accenture.jpg') as any,
    ],
    reviews: [
      { name: 'Omar F.', role: 'Backend Engineer', rating: 4, date: 'Mar 2024', text: 'Remote-first culture done right. Great async communication and clear expectations.' },
      { name: 'Mei L.', role: 'SRE', rating: 4, date: 'Jan 2024', text: 'Technically strong team. On-call is well-managed with solid runbooks.' },
      { name: 'Dave K.', role: 'Platform Engineer', rating: 4, date: 'Oct 2023', text: 'Interesting distributed systems challenges. Leadership is responsive to feedback.' },
    ],
  },
  {
    id: 5,
    abbr: 'NA',
    company: 'Nexus AI',
    role: 'AI Product Manager',
    salary: '$130k - $160k / yr',
    location: 'Seattle - Hybrid',
    tags: [
      { label: 'Hybrid', variant: 'hybrid' },
      { label: 'Full-time', variant: 'full' },
    ],
    match: 74,
    posted: '2d ago',
    applicants: 89,
    accentColor: '#7c3aed',
    distanceKm: 32.7,
    image: require('../app/assets/images/socia2.jpg') as any,
    aboutRole:
      'Define the product roadmap for AI-powered features. Collaborate with research, design, and engineering to bring cutting-edge AI capabilities into the hands of users.',
    requirements: 'AI/ML - Product Strategy - Roadmapping - 4+ yrs',
    glassdoorRating: 4.7,
    companyPhotos: [
      require('../app/assets/images/socia2.jpg') as any,
      require('../app/assets/images/socia3.jpg') as any,
      require('../app/assets/images/socia.png') as any,
    ],
    reviews: [
      { name: 'Rachel N.', role: 'Product Manager', rating: 5, date: 'Apr 2024', text: 'Incredible mission and talented team. High-velocity environment with real impact.' },
      { name: 'Chris B.', role: 'Senior PM', rating: 4, date: 'Feb 2024', text: 'Fast-moving and innovative. You need to be comfortable with ambiguity to thrive.' },
      { name: 'Aisha M.', role: 'Associate PM', rating: 5, date: 'Jan 2024', text: 'Best job I have had. The culture is genuinely collaborative and growth-focused.' },
    ],
  },
  {
    id: 6,
    abbr: 'PW',
    company: 'Pixel Works',
    role: 'iOS Engineer',
    salary: '$115k - $145k / yr',
    location: 'Los Angeles - Remote',
    tags: [
      { label: 'Remote', variant: 'remote' },
      { label: 'Full-time', variant: 'full' },
    ],
    match: 81,
    posted: '6h ago',
    applicants: 44,
    accentColor: '#be185d',
    distanceKm: 44,
    image: require('../app/assets/images/alorica2.jpg') as any,
    aboutRole:
      'Build beautiful, performant iOS experiences for a consumer app with millions of daily active users. Take ownership of entire features from architecture to App Store release.',
    requirements: 'Swift - UIKit - SwiftUI - 3+ yrs',
    glassdoorRating: 4.4,
    companyPhotos: [
      require('../app/assets/images/alorica2.jpg') as any,
      require('../app/assets/images/alorica3.jpg') as any,
      require('../app/assets/images/alorica.jpg') as any,
    ],
    reviews: [
      { name: 'Tyler J.', role: 'iOS Engineer', rating: 4, date: 'Mar 2024', text: 'Great product and tight-knit mobile team. Code reviews are thorough and helpful.' },
      { name: 'Nadia R.', role: 'Senior iOS Dev', rating: 5, date: 'Jan 2024', text: 'Remote culture is excellent. Flexible hours and strong engineering standards.' },
      { name: 'Ben H.', role: 'Staff Engineer', rating: 4, date: 'Nov 2023', text: 'Solid pay and interesting technical challenges. Management actually listens.' },
    ],
  },
];

export const BASE_CAROUSEL = JOBS.slice(0, 5);
export const CAROUSEL_JOBS = [BASE_CAROUSEL[BASE_CAROUSEL.length - 1], ...BASE_CAROUSEL, BASE_CAROUSEL[0]];
export const CAROUSEL_START_INDEX = 1;
export const GRID_JOBS = JOBS.slice(1);

export type JobFilterOptions = {
  maxDistanceKm?: number;
  minSalaryK?: number;
};

export function parseSalaryMaxK(salary: string) {
  const matches = salary.match(/\$?(\d+(?:\.\d+)?)k/gi);
  if (!matches || matches.length === 0) return 0;
  const values = matches.map(match => Number(match.replace(/[^0-9.]/g, '')));
  return Math.max(...values);
}

export function filterJobs(jobs: Job[], activeFilter: string, search: string, options?: JobFilterOptions) {
  const normalizedSearch = search.trim().toLowerCase();

  return jobs.filter(job => {
    const matchesFilter =
      activeFilter === 'All' ||
      job.tags.some(tag => tag.label === activeFilter) ||
      job.location.includes(activeFilter);

    const matchesSearch =
      normalizedSearch.length === 0 ||
      job.role.toLowerCase().includes(normalizedSearch) ||
      job.company.toLowerCase().includes(normalizedSearch);

    const matchesDistance =
      options?.maxDistanceKm === undefined || job.distanceKm <= options.maxDistanceKm;

    const matchesSalary =
      options?.minSalaryK === undefined || parseSalaryMaxK(job.salary) >= options.minSalaryK;

    return matchesFilter && matchesSearch && matchesDistance && matchesSalary;
  });
}
