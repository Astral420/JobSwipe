export type Role = 'applicant' | 'hr';

export type Step =
  | 'email'
  | 'password'
  | 'basic'
  | 'resume'
  | 'skills'
  | 'experience'
  | 'photo'
  | 'social'
  | 'company_details'
  | 'company_docs'
  | 'company_media';

export type WorkEntry = {
  company: string;
  position: string;
  start_date: string;
  end_date: string;
  description: string;
};

export type EducationEntry = {
  school: string;
  degree: string;
  field_of_study: string;
  start_date: string;
  end_date: string;
};

export const APPLICANT_STEPS: Step[] = ['password', 'basic', 'resume', 'skills', 'experience', 'photo', 'social'];
export const HR_STEPS: Step[] = ['password', 'company_details', 'company_docs', 'company_media'];

export const STEP_LABELS: Record<Step, string> = {
  email: 'Email',
  password: 'Password',
  basic: 'Basic Info',
  resume: 'Resume',
  skills: 'Skills',
  experience: 'Experience',
  photo: 'Photo',
  social: 'Links',
  company_details: 'Company',
  company_docs: 'Verification',
  company_media: 'Media',
};

export const INDUSTRY_OPTIONS = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Retail',
  'Manufacturing',
  'Consulting',
  'Marketing',
  'Real Estate',
  'Other',
];

export const COMPANY_SIZE_OPTIONS = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];

export const JOB_TITLE_OPTIONS = [
  'HR Manager',
  'Recruiter',
  'Talent Acquisition Specialist',
  'HR Director',
  'Recruitment Manager',
  'Talent Partner',
  'People Operations Manager',
  'Custom',
];

export const HARD_SKILL_SUGGESTIONS = [
  'React',
  'React Native',
  'TypeScript',
  'JavaScript',
  'Node.js',
  'Python',
  'Java',
  'C#',
  'PHP',
  'Ruby',
  'Go',
  'SQL',
  'PostgreSQL',
  'MongoDB',
  'GraphQL',
  'REST APIs',
  'AWS',
  'Docker',
  'Kubernetes',
  'Git',
  'HTML',
  'CSS',
  'Tailwind CSS',
  'Figma',
  'UI Design',
  'UX Research',
  'Data Analysis',
  'Machine Learning',
  'Excel',
  'Financial Analysis',
  'Accounting',
  'Bookkeeping',
  'Sales',
  'Lead Generation',
  'CRM',
  'Customer Support',
  'Copywriting',
  'Content Writing',
  'SEO',
  'Social Media Marketing',
  'Project Coordination',
  'Recruitment',
  'Training',
  'Teaching',
  'Lesson Planning',
  'Nursing',
  'Patient Care',
  'Medical Coding',
  'Inventory Management',
  'Logistics',
  'Operations Management',
  'Procurement',
  'AutoCAD',
  'Video Editing',
  'Photography',
  'Public Speaking',
];

export const SOFT_SKILL_SUGGESTIONS = [
  'Communication',
  'Leadership',
  'Problem Solving',
  'Teamwork',
  'Adaptability',
  'Time Management',
  'Project Management',
  'Critical Thinking',
  'Creativity',
  'Empathy',
  'Collaboration',
  'Attention to Detail',
  'Decision Making',
  'Conflict Resolution',
  'Negotiation',
  'Resilience',
  'Work Ethic',
  'Active Listening',
  'Organization',
  'Emotional Intelligence',
  'Flexibility',
  'Accountability',
  'Initiative',
];
