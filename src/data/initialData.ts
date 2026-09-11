import { Project, Enquiry, ServiceItem } from '../types';

export const INITIAL_PROJECTS: Project[] = [];
export const INITIAL_ENQUIRIES: Enquiry[] = [];

export const PROFILE_INFO = {
  name: 'Chintapalli Pavan Kumar',
  shortName: 'Pavan Kumar',
  initials: 'PK',
  title: 'Software Developer & Freelancer.',
  roleHeadline: 'React • Spring Boot • Cloud',
  email: 'chintapallipavankumar2004@gmail.com',
  github: 'https://github.com/chintapallipavankumar2004',
  githubDisplay: 'github.com/chintapallipavankumar2004',
  linkedin: 'https://linkedin.com/in/chintapalli-pavan-kumar',
  linkedinDisplay: 'linkedin.com/in/chintapalli-pavan-kumar',
  location: 'Based in Andhra Pradesh, India',
  timezone: 'UTC+05:30',
  availability: '',
  bookingsWindow: '',
  responseWindow: '',
  headshot:
    'https://res.cloudinary.com/dj4g3bvsb/image/upload/v1789114437/portfolio_hybq1j.png',
};

export const SERVICES: ServiceItem[] = [
  {
    id: 'website',
    title: 'Website Development',
    description:
      'Business websites, portfolios, landing pages, and responsive customer experiences built with modern front-end frameworks.',
    iconName: 'laptop',
    features: [
      'Modern React & Tailwind UI',
      'Mobile-First Optimization',
      'SEO & Speed Best Practices',
    ],
  },
  {
    id: 'webapp',
    title: 'Web Applications',
    description:
      'Custom web applications, dashboards, admin panels, and interactive web tools engineered for security and data resilience.',
    iconName: 'terminal',
    features: [
      'Robust Backend (Spring Boot/Java)',
      'Authentication & RBAC Control',
      'RESTful API Integrations',
    ],
  },
  {
    id: 'branding',
    title: 'Design & Branding',
    description:
      'Brand logos, promotional poster design, marketing creatives, and complete digital design systems that speak your value.',
    iconName: 'palette',
    features: [
      'Vector Logo Marks & Assets',
      'High-Impact Campaign Posters',
      'Social Media Design Kits',
    ],
  },
  {
    id: 'automation',
    title: 'Automation & Support',
    description:
      'Workflow automation, third-party integrations, maintenance, cloud hosting setup, and continuous technical improvements.',
    iconName: 'refresh-cw',
    features: [
      'Webhooks & Data Workflows',
      'Database & Cloud Migration',
      'Dedicated Retainer Support',
    ],
  },
];

export const TECHNICAL_TOOLKIT = {
  development: [
    'React',
    'JavaScript / TypeScript',
    'Java',
    'Spring Boot',
    'REST APIs',
    'MySQL',
    'Firebase',
    'HTML5 / CSS3',
  ],
  creative: [
    'Website Design',
    'Poster Design',
    'Logo Design',
    'Marketing Creatives',
    'Design Systems',
  ],
  tools: [
    'Git & GitHub',
    'Vercel',
    'Firebase Hosting',
    'Cloudinary',
    'Automation Tools',
    'Postman',
  ],
};

export const WORK_PROCESS_STEPS = [
  {
    step: '01',
    title: 'Discuss',
    description: 'We align on goals, target audience, technical scope, and project deliverables.',
  },
  {
    step: '02',
    title: 'Plan',
    description: 'Architecture blueprints, database schema design, and sprint milestones.',
  },
  {
    step: '03',
    title: 'Design & Build',
    description: 'Iterative front-end styling, responsive refinement, and robust back-end logic.',
  },
  {
    step: '04',
    title: 'Review',
    description: 'Comprehensive QA, browser testing, mobile audits, and client feedback cycles.',
  },
  {
    step: '05',
    title: 'Launch',
    description: 'Domain pointing, SSL deployment, analytics integration, and handover.',
  },
];
