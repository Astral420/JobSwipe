import React, { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabBarHeight } from '../../hooks/useTabBarHeight';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  StatusBar,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
  LayoutChangeEvent,
  Switch,
  ActivityIndicator,
  type ImageSourcePropType,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import {
  SwipeLabel,
  MatchBadge,
  TagBadge,
  PrimaryButton,
  SecondaryButton,
  OutlineButton,
  GhostButton,
  SuperButton,
  Colors,
  Typography,
  Spacing,
  Radii,
  Shadows,
} from '../../components/ui';

const { width: SW, height: SH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SW * 0.20;

// ── Layout constants at module level — never change, never move with the card ──
const ACTIONS_BOTTOM = Platform.OS === 'ios' ? 72 : 100;
const ACTIONS_HEIGHT = 80;
const OVERLAY_BOTTOM = ACTIONS_BOTTOM + ACTIONS_HEIGHT + 8;  // company info strip
const BADGE_BOTTOM   = OVERLAY_BOTTOM + 92;                  // match badge sits here
const PANEL_HEIGHT   = SH * 0.62;
const BOTTOM_NAV     = Platform.OS === 'ios' ? 84 : 64;      // tab bar clearance

// ── API deck types ──────────────────────────────────────────────────────────
type DeckJob = {
  id: string;
  company: { name: string; logo_url?: string; abbr: string };
  role: string;
  salary_range: string;
  location: string;
  tags: { label: string; variant: 'primary' | 'success' | 'warning' | 'neutral' | 'remote' }[];
  match_percent: number;
  distance_km: number;
  about_role: string;
  requirements: string;
  company_photos: string[];
  reviews: { name?: string; author?: string; role?: string; date?: string; rating: number; text: string }[];
  // legacy compat shims used inside the render
  position: string;
  salary: string;
  description: string;
  lookingFor: string;
  distanceKm: number;
  matchPercent: number;
  photos: ImageSourcePropType[];
  logoColor: string;
  rating: number;
};

type ApiDeckJob = Partial<DeckJob> & {
  id: number | string;
  title?: string;
  work_type?: string;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_is_hidden?: boolean;
  company?: {
    name?: string;
    company_name?: string;
    logo_url?: string;
    abbr?: string;
    office_images?: string[];
  };
  skills?: Array<{ name?: string; skill_name?: string }>;
  relevance_score?: number;
};
type SwipeLimitsResponse = {
  used?: number;
  limit?: number;
  resets_at?: string;
  daily_swipes_used?: number;
  daily_swipe_limit?: number;
  swipe_reset_at?: string;
};

const PLACEHOLDER_JOBS: DeckJob[] = [];

// ── Legacy JOBS constant removed — now fetched from API ────────────────────
const JOBS = PLACEHOLDER_JOBS; // kept so filteredJobs refs compile; replaced at runtime
/*
  Original JOBS = [
  {
    id: 1,
    company: 'TechFlow Inc',
    logoColor: Colors.primary,
    rating: 4.8,
    position: 'Senior React Native Engineer',
    salary: '$120k - $150k / yr',
    location: 'San Francisco, CA · Remote',
    tags: [
      { label: 'Remote',    variant: 'primary'  as const },
      { label: 'Full-time', variant: 'success'  as const },
      { label: 'Startup',   variant: 'warning'  as const },
    ],
    description: 'Build cutting-edge mobile experiences for 2M+ users. Lead a team of 4 engineers shipping weekly releases. You will own the entire mobile stack and work closely with design and product.',
    matchPercent: 92,
    photos: [
      require('../assets/images/accenture.jpg'),
      require('../assets/images/accenture2.jpg'),
      require('../assets/images/accenture3.jpg'),
    ],
    lookingFor: 'React Native · TypeScript · 5+ yrs',
    distanceKm: 3.9,
    reviews: [
      { author: 'Sarah M.',  role: 'Software Engineer',    rating: 5, date: 'Mar 2024', text: 'Amazing culture and work-life balance. The team is brilliant and leadership actually listens. Shipped some of the most impactful features of my career here.' },
      { author: 'James K.',  role: 'Senior Developer',     rating: 5, date: 'Jan 2024', text: 'Best engineering environment I have worked in. Strong processes, fast feedback loops, and real ownership over the product.' },
      { author: 'Priya L.',  role: 'Mobile Engineer',      rating: 4, date: 'Nov 2023', text: 'Great pay and perks. Occasional crunch around big releases but the team is supportive and management is transparent.' },
    ],
  },
  {
    id: 2,
    company: 'Alorica',
    logoColor: Colors.warning,
    rating: 4.6,
    position: 'Product Designer',
    salary: '$100k - $130k / yr',
    location: 'New York, NY · Hybrid',
    tags: [
      { label: 'Hybrid',    variant: 'primary' as const },
      { label: 'Full-time', variant: 'success' as const },
      { label: 'Scaleup',   variant: 'neutral' as const },
    ],
    description: 'Design beautiful interfaces for next-gen SaaS products. Work with a world-class design system team. Own end-to-end product design from research to delivery.',
    matchPercent: 78,
    photos: [
      require('../assets/images/alorica.jpg'),
      require('../assets/images/alorica2.jpg'),
      require('../assets/images/alorica3.jpg'),
    ],
    lookingFor: 'Figma · UX Research · 3+ yrs',
    distanceKm: 8.2,
    reviews: [
      { author: 'Elena R.',  role: 'UX Designer',          rating: 5, date: 'Feb 2024', text: 'Love the creative freedom here. The design system is world-class and your work genuinely reaches millions of users every day.' },
      { author: 'Tom B.',    role: 'Product Designer',     rating: 4, date: 'Dec 2023', text: 'Collaborative team and strong mentorship. Hybrid setup works really well — good balance of in-office energy and remote flexibility.' },
      { author: 'Nina C.',   role: 'UI Designer',          rating: 5, date: 'Oct 2023', text: 'One of the most design-forward companies I have seen. Leadership invests heavily in tooling, learning budgets, and the team.' },
    ],
  },
  {
    id: 3,
    company: 'Socia',
    logoColor: Colors.success,
    rating: 4.9,
    position: 'ML Engineer',
    salary: '$140k - $180k / yr',
    location: 'Boston, MA · On-site',
    tags: [
      { label: 'On-site',    variant: 'warning' as const },
      { label: 'Full-time',  variant: 'success' as const },
      { label: 'Enterprise', variant: 'neutral' as const },
    ],
    description: "Vivamus commodo, sem ac tincidunt vulputate, neque purus interdum enim, id feugiat ante magna sit amet nisl. Aliquam erat volutpat. Duis ut justo efficitur, convallis metus sollicitudin, elementum nibh. Donec pellentesque tempus dui, in tristique dui cursus et. Donec ultricies vehicula risus, nec sollicitudin nulla suscipit a. Vestibulum tincidunt diam at dui sollicitudin, vel facilisis nisl laoreet.",
    matchPercent: 85,
    photos: [
      require('../assets/images/socia.png'),
      require('../assets/images/socia2.jpg'),
      require('../assets/images/socia3.jpg'),
    ],
    lookingFor: 'Python · PyTorch · MLOps · 4+ yrs',
    distanceKm: 20.4,
    reviews: [
      { author: 'David W.',  role: 'ML Engineer',          rating: 5, date: 'Mar 2024', text: 'Cutting-edge research environment. You will work on problems that truly push the field forward. The calibre of colleagues is outstanding.' },
      { author: 'Aisha T.',  role: 'Data Scientist',       rating: 5, date: 'Feb 2024', text: 'Exceptional resources and compute budget. Leadership encourages publishing and the internal knowledge sharing culture is incredible.' },
      { author: 'Leo S.',    role: 'Research Engineer',    rating: 4, date: 'Jan 2024', text: 'Great place if you want to grow fast. On-site requirement is a trade-off but the office and perks more than compensate.' },
    ],
  },
  {
    id: 4,
    company: 'NovaPay',
    logoColor: '#6366F1',
    rating: 4.7,
    position: 'Backend Engineer',
    salary: '$110k - $140k / yr',
    location: 'Austin, TX · Remote',
    tags: [
      { label: 'Remote',    variant: 'primary'  as const },
      { label: 'Full-time', variant: 'success'  as const },
      { label: 'Fintech',   variant: 'warning'  as const },
    ],
    description: 'Power the financial infrastructure for millions of users. Design and scale high-throughput payment APIs processing billions in transactions. You will work across Go, Postgres, and Kafka in a cloud-native stack.',
    matchPercent: 88,
    photos: [
      require('../assets/images/accenture.jpg'),
      require('../assets/images/accenture2.jpg'),
      require('../assets/images/accenture3.jpg'),
    ],
    lookingFor: 'Go · Kafka · PostgreSQL · 4+ yrs',
    distanceKm: 12.1,
    reviews: [
      { author: 'Marcus T.', role: 'Backend Engineer',   rating: 5, date: 'Feb 2024', text: 'Best engineering culture I have experienced. Ownership is real, on-call is manageable, and the pay is top of market.' },
      { author: 'Yuki S.',   role: 'Platform Engineer',  rating: 4, date: 'Jan 2024', text: 'Challenging problems and a genuinely smart team. Rapid career growth if you show initiative.' },
      { author: 'Chloe R.',  role: 'Software Engineer',  rating: 5, date: 'Dec 2023', text: 'Remote-first done right. Great async culture, no micromanagement, and actually interesting work.' },
    ],
  },
  {
    id: 5,
    company: 'HelixAI',
    logoColor: '#EC4899',
    rating: 4.5,
    position: 'AI Product Manager',
    salary: '$130k - $160k / yr',
    location: 'Seattle, WA · Hybrid',
    tags: [
      { label: 'Hybrid',    variant: 'primary' as const },
      { label: 'Full-time', variant: 'success' as const },
      { label: 'AI/ML',     variant: 'warning' as const },
    ],
    description: 'Define the roadmap for AI-powered products used by 5M+ professionals. Partner with research, engineering, and design to ship intelligent features from concept to launch.',
    matchPercent: 81,
    photos: [
      require('../assets/images/socia.png'),
      require('../assets/images/socia2.jpg'),
      require('../assets/images/socia3.jpg'),
    ],
    lookingFor: 'Product Strategy · AI/ML · 4+ yrs',
    distanceKm: 6.7,
    reviews: [
      { author: 'Amara J.',  role: 'Senior PM',          rating: 5, date: 'Mar 2024', text: 'Incredible place to be at the frontier of AI products. Leadership is transparent and the mission is real.' },
      { author: 'Ben F.',    role: 'Product Manager',    rating: 4, date: 'Jan 2024', text: 'Fast-paced and demanding, but you ship things that actually matter. Great learning environment.' },
      { author: 'Rina M.',   role: 'Associate PM',       rating: 5, date: 'Nov 2023', text: 'Collaborative culture with real autonomy. The calibre of people here is exceptional.' },
    ],
  },
  {
    id: 6,
    company: 'Orbis Cloud',
    logoColor: '#0EA5E9',
    rating: 4.6,
    position: 'DevOps Engineer',
    salary: '$105k - $135k / yr',
    location: 'Denver, CO · Remote',
    tags: [
      { label: 'Remote',    variant: 'primary'  as const },
      { label: 'Full-time', variant: 'success'  as const },
      { label: 'Cloud',     variant: 'neutral'  as const },
    ],
    description: 'Build and maintain the cloud infrastructure powering critical enterprise workloads. Drive automation, reliability, and cost efficiency across AWS and Kubernetes at scale.',
    matchPercent: 76,
    photos: [
      require('../assets/images/alorica.jpg'),
      require('../assets/images/alorica2.jpg'),
      require('../assets/images/alorica3.jpg'),
    ],
    lookingFor: 'AWS · Kubernetes · Terraform · 3+ yrs',
    distanceKm: 30.2,
    reviews: [
      { author: 'Tariq L.',  role: 'DevOps Engineer',    rating: 4, date: 'Feb 2024', text: 'Solid remote culture, good tooling budget, and interesting infrastructure challenges. Leadership listens to engineers.' },
      { author: 'Keiko P.',  role: 'SRE',                rating: 5, date: 'Dec 2023', text: 'Best on-call experience I have had. Blameless culture and genuinely supportive team.' },
      { author: 'Sam W.',    role: 'Cloud Architect',    rating: 4, date: 'Oct 2023', text: 'Great scope of work and a real say in architectural decisions. Pay is competitive.' },
    ],
  },
  {
    id: 7,
    company: 'Vantage Health',
    logoColor: '#10B981',
    rating: 4.8,
    position: 'Full-Stack Engineer',
    salary: '$115k - $145k / yr',
    location: 'Chicago, IL · Hybrid',
    tags: [
      { label: 'Hybrid',    variant: 'primary' as const },
      { label: 'Full-time', variant: 'success' as const },
      { label: 'HealthTech',variant: 'warning' as const },
    ],
    description: 'Build software that improves patient outcomes for 3M+ users. Own features end-to-end across React, Node, and AWS. Work in a mission-driven team where every release matters.',
    matchPercent: 90,
    photos: [
      require('../assets/images/accenture.jpg'),
      require('../assets/images/accenture2.jpg'),
      require('../assets/images/accenture3.jpg'),
    ],
    lookingFor: 'React · Node.js · AWS · 4+ yrs',
    distanceKm: 9.5,
    reviews: [
      { author: 'Grace N.',  role: 'Full-Stack Engineer', rating: 5, date: 'Mar 2024', text: 'Working here feels meaningful. The tech stack is modern and the team is collaborative and kind.' },
      { author: 'Omar A.',   role: 'Software Engineer',   rating: 5, date: 'Feb 2024', text: 'Mission-driven work with strong engineering standards. Best team culture I have been part of.' },
      { author: 'Lily C.',   role: 'Frontend Engineer',   rating: 4, date: 'Jan 2024', text: 'Great work-life balance for healthcare tech. Thoughtful leadership and clear career paths.' },
    ],
  },
  {
    id: 8,
    company: 'Stratum Data',
    logoColor: '#F59E0B',
    rating: 4.4,
    position: 'Data Engineer',
    salary: '$100k - $125k / yr',
    location: 'Atlanta, GA · On-site',
    tags: [
      { label: 'On-site',   variant: 'warning' as const },
      { label: 'Full-time', variant: 'success' as const },
      { label: 'Analytics', variant: 'neutral' as const },
    ],
    description: 'Design and operate data pipelines that process 10TB+ daily across retail and logistics clients. Own the full data lifecycle from ingestion to BI dashboards.',
    matchPercent: 73,
    photos: [
      require('../assets/images/alorica.jpg'),
      require('../assets/images/alorica2.jpg'),
      require('../assets/images/alorica3.jpg'),
    ],
    lookingFor: 'Spark · dbt · Snowflake · 3+ yrs',
    distanceKm: 45.0,
    reviews: [
      { author: 'Priya S.',  role: 'Data Engineer',      rating: 4, date: 'Jan 2024', text: 'Solid data problems and a team that really knows its stuff. On-site works well given the collaborative nature of the work.' },
      { author: 'Josh M.',   role: 'Analytics Engineer', rating: 4, date: 'Nov 2023', text: 'Good pay and interesting data challenges. Management is supportive of learning and development.' },
      { author: 'Fiona K.',  role: 'Data Analyst',       rating: 5, date: 'Sep 2023', text: 'The data infrastructure here is impressive. Great place to level up your engineering skills.' },
    ],
  },
  {
    id: 9,
    company: 'Luminary UX',
    logoColor: '#8B5CF6',
    rating: 4.7,
    position: 'UX Researcher',
    salary: '$90k - $115k / yr',
    location: 'Portland, OR · Remote',
    tags: [
      { label: 'Remote',    variant: 'primary'  as const },
      { label: 'Full-time', variant: 'success'  as const },
      { label: 'Research',  variant: 'neutral'  as const },
    ],
    description: 'Lead qualitative and quantitative research that shapes products used daily by millions. Run usability studies, interviews, and surveys to surface insights that drive roadmap decisions.',
    matchPercent: 79,
    photos: [
      require('../assets/images/socia.png'),
      require('../assets/images/socia2.jpg'),
      require('../assets/images/socia3.jpg'),
    ],
    lookingFor: 'User Research · Mixed Methods · 3+ yrs',
    distanceKm: 18.3,
    reviews: [
      { author: 'Zara P.',   role: 'UX Researcher',      rating: 5, date: 'Mar 2024', text: 'Research is genuinely valued here — findings actually influence product decisions. Rare and refreshing.' },
      { author: 'Ian T.',    role: 'Product Researcher',  rating: 4, date: 'Feb 2024', text: 'Flexible remote setup and a team that takes user empathy seriously. Great leadership.' },
      { author: 'Mei L.',    role: 'UX Designer',         rating: 5, date: 'Dec 2023', text: 'Collaborative and research-driven culture. You will have real impact on what gets built.' },
    ],
  },
  {
    id: 10,
    company: 'FortressAI',
    logoColor: '#EF4444',
    rating: 4.5,
    position: 'Security Engineer',
    salary: '$125k - $155k / yr',
    location: 'Washington, DC · Hybrid',
    tags: [
      { label: 'Hybrid',    variant: 'primary' as const },
      { label: 'Full-time', variant: 'success' as const },
      { label: 'Security',  variant: 'warning' as const },
    ],
    description: 'Secure AI systems trusted by government and enterprise clients. Lead threat modelling, pen testing, and security architecture reviews across a cutting-edge platform stack.',
    matchPercent: 83,
    photos: [
      require('../assets/images/accenture.jpg'),
      require('../assets/images/accenture2.jpg'),
      require('../assets/images/accenture3.jpg'),
    ],
    lookingFor: 'AppSec · Pen Testing · Cloud Security · 4+ yrs',
    distanceKm: 22.8,
    reviews: [
      { author: 'Ray K.',    role: 'Security Engineer',   rating: 5, date: 'Feb 2024', text: 'High-stakes, high-reward work. The team is sharp and the mission matters. Pay reflects the seniority of the problems.' },
      { author: 'Sana B.',   role: 'AppSec Engineer',     rating: 4, date: 'Jan 2024', text: 'Great place to deepen security expertise. Leadership understands the domain and gives engineers real authority.' },
      { author: 'Deco M.',   role: 'Red Team Lead',       rating: 5, date: 'Nov 2023', text: 'Best security culture I have seen outside a top-tier bank. Blameless, rigorous, and genuinely collaborative.' },
    ],
  },
  {
    id: 11,
    company: 'Sprout Commerce',
    logoColor: '#22C55E',
    rating: 4.6,
    position: 'iOS Engineer',
    salary: '$115k - $140k / yr',
    location: 'Miami, FL · Remote',
    tags: [
      { label: 'Remote',    variant: 'primary'  as const },
      { label: 'Full-time', variant: 'success'  as const },
      { label: 'E-commerce',variant: 'neutral'  as const },
    ],
    description: 'Build the iOS shopping experience for 4M+ customers. Own feature delivery from design hand-off to App Store release. Work in Swift with a world-class mobile team.',
    matchPercent: 87,
    photos: [
      require('../assets/images/alorica.jpg'),
      require('../assets/images/alorica2.jpg'),
      require('../assets/images/alorica3.jpg'),
    ],
    lookingFor: 'Swift · UIKit · SwiftUI · 4+ yrs',
    distanceKm: 5.4,
    reviews: [
      { author: 'Tyler G.',  role: 'iOS Engineer',        rating: 5, date: 'Mar 2024', text: 'Fast-moving and fun team. Shipping to millions of users every sprint is genuinely exciting.' },
      { author: 'Hana R.',   role: 'Mobile Engineer',     rating: 4, date: 'Feb 2024', text: 'Great Swift codebase, sensible architecture, and a product team that works well with engineering.' },
      { author: 'Joel P.',   role: 'Senior iOS Dev',      rating: 5, date: 'Jan 2024', text: 'Best mobile job I have had. Autonomy, good pay, and a product people actually love.' },
    ],
  },
  {
    id: 12,
    company: 'Axiom Robotics',
    logoColor: '#64748B',
    rating: 4.9,
    position: 'Embedded Systems Engineer',
    salary: '$130k - $165k / yr',
    location: 'Detroit, MI · On-site',
    tags: [
      { label: 'On-site',   variant: 'warning' as const },
      { label: 'Full-time', variant: 'success' as const },
      { label: 'Robotics',  variant: 'neutral' as const },
    ],
    description: 'Design and ship firmware for next-generation industrial robots deployed in smart factories worldwide. Work close to the metal on real-time systems with a team of world-class engineers.',
    matchPercent: 77,
    photos: [
      require('../assets/images/socia.png'),
      require('../assets/images/socia2.jpg'),
      require('../assets/images/socia3.jpg'),
    ],
    lookingFor: 'C/C++ · RTOS · Embedded Linux · 5+ yrs',
    distanceKm: 38.6,
    reviews: [
      { author: 'Viktor H.', role: 'Firmware Engineer',   rating: 5, date: 'Feb 2024', text: 'Working on real robots in the real world is incredibly motivating. Hard problems, great team, and top-notch equipment.' },
      { author: 'Nia S.',    role: 'Embedded Engineer',   rating: 5, date: 'Jan 2024', text: 'The engineering rigour here is exceptional. You will learn more in six months than most places in two years.' },
      { author: 'Carlos M.', role: 'Systems Engineer',    rating: 4, date: 'Dec 2023', text: 'On-site is worth it given the lab access and hardware. Best embedded role on the market.' },
    ],
  },
  {
    id: 13,
    company: 'Pulse Analytics',
    logoColor: '#F97316',
    rating: 4.5,
    position: 'Growth Engineer',
    salary: '$105k - $130k / yr',
    location: 'Los Angeles, CA · Hybrid',
    tags: [
      { label: 'Hybrid',    variant: 'primary' as const },
      { label: 'Full-time', variant: 'success' as const },
      { label: 'Growth',    variant: 'warning' as const },
    ],
    description: 'Own the experimentation platform and growth loops driving user acquisition for a consumer app with 8M MAUs. Run A/B tests, build attribution pipelines, and partner with marketing and product.',
    matchPercent: 80,
    photos: [
      require('../assets/images/accenture.jpg'),
      require('../assets/images/accenture2.jpg'),
      require('../assets/images/accenture3.jpg'),
    ],
    lookingFor: 'Growth Engineering · SQL · A/B Testing · 3+ yrs',
    distanceKm: 14.7,
    reviews: [
      { author: 'Alicia F.', role: 'Growth Engineer',     rating: 4, date: 'Mar 2024', text: 'Great mix of product thinking and engineering. The impact of your work is directly measurable, which is motivating.' },
      { author: 'Marco D.',  role: 'Data Engineer',       rating: 5, date: 'Feb 2024', text: 'Fast experimentation culture, strong data foundations, and a team that celebrates wins together.' },
      { author: 'Petra L.',  role: 'Analytics Engineer',  rating: 4, date: 'Dec 2023', text: 'Good scope and autonomy. The hybrid setup works well and the office days are genuinely productive.' },
    ],
  },
  {
    id: 14,
    company: 'Crestline EdTech',
    logoColor: '#06B6D4',
    rating: 4.7,
    position: 'Platform Engineer',
    salary: '$108k - $132k / yr',
    location: 'Nashville, TN · Remote',
    tags: [
      { label: 'Remote',    variant: 'primary'  as const },
      { label: 'Full-time', variant: 'success'  as const },
      { label: 'EdTech',    variant: 'neutral'  as const },
    ],
    description: 'Build the platform powering online learning for 6M+ students globally. Own core infrastructure, developer tooling, and reliability initiatives across a modern cloud-native stack.',
    matchPercent: 84,
    photos: [
      require('../assets/images/alorica.jpg'),
      require('../assets/images/alorica2.jpg'),
      require('../assets/images/alorica3.jpg'),
    ],
    lookingFor: 'Platform Engineering · GCP · Go · 4+ yrs',
    distanceKm: 27.3,
    reviews: [
      { author: 'Sophie K.', role: 'Platform Engineer',   rating: 5, date: 'Mar 2024', text: 'Mission-driven company with genuinely modern engineering practices. Remote culture is one of the best I have seen.' },
      { author: 'Ravi P.',   role: 'SRE',                 rating: 4, date: 'Feb 2024', text: 'Great scope and trust in engineers. The infra problems are interesting and the team is supportive.' },
      { author: 'Dana W.',   role: 'Backend Engineer',    rating: 5, date: 'Jan 2024', text: 'Flexible, well-run, and impactful. Knowing your work helps students learn makes a real difference.' },
    ],
  },
  {
    id: 15,
    company: 'ZenithPay',
    logoColor: '#A855F7',
    rating: 4.8,
    position: 'Android Engineer',
    salary: '$112k - $142k / yr',
    location: 'Phoenix, AZ · Remote',
    tags: [
      { label: 'Remote',    variant: 'primary'  as const },
      { label: 'Full-time', variant: 'success'  as const },
      { label: 'Fintech',   variant: 'warning'  as const },
    ],
    description: 'Ship Android experiences for a payments app trusted by 7M+ users. Own the full feature lifecycle in Kotlin, collaborate closely with product and design, and drive a zero-crash culture.',
    matchPercent: 89,
    photos: [
      require('../assets/images/socia.png'),
      require('../assets/images/socia2.jpg'),
      require('../assets/images/socia3.jpg'),
    ],
    lookingFor: 'Kotlin · Jetpack Compose · Android SDK · 4+ yrs',
    distanceKm: 11.9,
    reviews: [
      { author: 'Finn O.',   role: 'Android Engineer',    rating: 5, date: 'Mar 2024', text: 'Best Android codebase I have worked in. Modern Compose architecture, sensible processes, and great pay.' },
      { author: 'Asha N.',   role: 'Mobile Engineer',     rating: 5, date: 'Feb 2024', text: 'The team is collaborative, the product is used by millions, and leadership genuinely cares about quality.' },
      { author: 'Luke B.',   role: 'Senior Android Dev',  rating: 4, date: 'Jan 2024', text: 'Challenging and rewarding. Remote culture is well established and the work-life balance is real.' },
    ],
  },
] as const;
*/

export default function HomeTab() {
  const T = useTheme();
  const tabBarHeight = useTabBarHeight();
  const { top: topInset } = useSafeAreaInsets();
  const navigation = useNavigation();
  // Dynamic bottom positions — keep buttons above tab bar on all devices
  const actionsBottom  = tabBarHeight + 20;
  const overlayBottom  = actionsBottom + ACTIONS_HEIGHT + 8;
  const badgeBottom    = overlayBottom + 92;

  const MAX_SWIPES = 15;
  const [deckJobs, setDeckJobs]     = useState<DeckJob[]>([]);
  const [deckLoading, setDeckLoading] = useState(true);
  const [swipesUsed, setSwipesUsed] = useState(0);
  const [swipeLimit, setSwipeLimit] = useState(MAX_SWIPES);
  const [index, setIndex]           = useState(0);
  const indexRef = useRef(0);  // always reflects latest index for use inside closures
  const growingJobRef = useRef<DeckJob | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [timerKey, setTimerKey]     = useState(0);
  const [liked, setLiked]           = useState<string[]>([]);
  const [expanded, setExpanded]     = useState(false);
  const [history, setHistory]       = useState<{ id: string; dir: number }[]>([]);
  const [cardSize, setCardSize]     = useState({ width: SW, height: SH });
  const [topBarHeight, setTopBarHeight] = useState(0);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [galleryFullscreen, setGalleryFullscreen] = useState(false);

  // ── Settings state ───────────────────────────────────────────────────────────
  const [settingsOpen, setSettingsOpen]   = useState(false);
  const [useKm, setUseKm]                 = useState(true);
  const [maxDistanceKm, setMaxDistanceKm] = useState(50);       // applied value
  const [draftDistance, setDraftDistance] = useState(50);       // in-panel draft
  const [draftUseKm, setDraftUseKm]       = useState(true);     // in-panel draft
  const [sliderTrackWidth, setSliderTrackWidth] = useState(SW - 40);
  const sliderWrapperX = useRef(0);  // page-level x offset of the slider wrapper
  const settingsAnim = useRef(new Animated.Value(0)).current;

  const openSettings = () => {
    settingsOpenRef.current = true;
    // seed draft from current applied values each time panel opens
    setDraftDistance(maxDistanceKm);
    setDraftUseKm(useKm);
    setSettingsOpen(true);
    Animated.spring(settingsAnim, { toValue: 1, bounciness: 3, useNativeDriver: false }).start();
  };
  const closeSettings = () => {
    settingsOpenRef.current = false;
    Animated.timing(settingsAnim, { toValue: 0, duration: 220, useNativeDriver: false }).start(() => setSettingsOpen(false));
  };
  // ── Fetch deck + limits from API ────────────────────────────────────
  const loadDeck = useCallback(async () => {
    setDeckLoading(true);
    try {
      const [deck, limits] = await Promise.all([
        api.get('/applicant/swipe/deck') as Promise<{ jobs?: ApiDeckJob[] } | ApiDeckJob[]>,
        api.get('/applicant/swipe/limits') as Promise<SwipeLimitsResponse>,
      ]);
      const deckItems = Array.isArray(deck) ? deck : (deck?.jobs ?? []);
      // Normalise API shape → legacy render field names
      const normalised = deckItems.map((j) => {
        const companyName = j.company?.name ?? j.company?.company_name ?? 'Company';
        const companyAbbr = j.company?.abbr ?? companyName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
        const sourcePhotos = j.company_photos ?? j.company?.office_images ?? [];
        const photos = sourcePhotos
          .filter((uri): uri is string => Boolean(uri))
          .map((uri) => ({ uri }));
        const tagList = j.tags ?? [
          { label: j.work_type === 'on_site' ? 'On-site' : (j.work_type ?? 'Flexible').toString().replace(/^./, (c) => c.toUpperCase()), variant: 'primary' as const },
          { label: ({ full_time: 'Full-time', part_time: 'Part-time', contract: 'Contract', internship: 'Internship' } as Record<string, string>)[j.employment_type ?? 'full_time'] ?? 'Full-time', variant: 'success' as const },
          { label: 'Active', variant: 'neutral' as const },
        ];
        const derivedRequirements = j.requirements
          ?? (Array.isArray(j.skills) ? j.skills.map((s) => s.skill_name ?? s.name).filter(Boolean).join(' · ') : '')
          ?? '';
        const matchScore = j.match_percent
          ?? (typeof j.relevance_score === 'number' ? Math.max(1, Math.min(99, Math.round(j.relevance_score * 100))) : 75);
        const distance = j.distance_km ?? 0;

        // Build salary display from backend fields
        let salaryDisplay = 'Compensation discussed in interview';
        if (!j.salary_is_hidden && (j.salary_min || j.salary_max)) {
          const fmtMin = j.salary_min ? `₱${Number(j.salary_min).toLocaleString()}` : null;
          const fmtMax = j.salary_max ? `₱${Number(j.salary_max).toLocaleString()}` : null;
          const periodLabel = j.salary_period === 'yearly' ? 'yr' : 'mo';
          if (fmtMin && fmtMax) salaryDisplay = `${fmtMin} - ${fmtMax} / ${periodLabel}`;
          else if (fmtMin) salaryDisplay = `${fmtMin}+ / ${periodLabel}`;
          else if (fmtMax) salaryDisplay = `Up to ${fmtMax} / ${periodLabel}`;
        }

        return {
          ...j,
          id: String(j.id),
          company: {
            name: companyName,
            logo_url: j.company?.logo_url,
            abbr: companyAbbr || 'CO',
          },
          role: j.role ?? j.title ?? 'Open Role',
          salary_range: salaryDisplay,
          location: j.location ?? 'Location not specified',
          tags: tagList,
          match_percent: matchScore,
          distance_km: distance,
          about_role: j.about_role ?? j.description ?? 'No role summary provided yet.',
          requirements: derivedRequirements || 'General professional experience',
          company_photos: sourcePhotos,
          reviews: j.reviews ?? [],
          position: j.role ?? j.title ?? 'Open Role',
          salary: salaryDisplay,
          description: j.about_role ?? j.description ?? 'No role summary provided yet.',
          lookingFor: derivedRequirements || 'General professional experience',
          distanceKm: distance,
          matchPercent: matchScore,
          photos,
          logoColor: Colors.primary,
          rating: 0,
        };
      });
      setDeckJobs(normalised);
      if (limits) {
        setSwipesUsed(limits.daily_swipes_used ?? limits.used ?? 0);
        setSwipeLimit(limits.daily_swipe_limit ?? limits.limit ?? MAX_SWIPES);
      }
    } catch {
      // network error — keep empty deck, user sees empty state
    } finally {
      setDeckLoading(false);
    }
  }, []);

  useEffect(() => { void loadDeck(); }, [loadDeck]);

  const applySettings = () => {
    setMaxDistanceKm(draftDistance);
    setUseKm(draftUseKm);
    setIndex(0); indexRef.current = 0;
    setPhotoIndex(0);
    closeSettings();
  };

  // km ↔ miles display helper
  const formatDistance = (km: number) => {
    if (km < 0) return 'Distance unavailable';
    if (km === 0) return 'Same city';
    if (useKm) return `~${km.toFixed(0)} km away`;
    return `~${(km * 0.621371).toFixed(0)} mi away`;
  };

  // Label shown in the panel header uses the draft value
  const draftLabel = draftUseKm ? `${draftDistance} km` : `${(draftDistance * 0.621371).toFixed(0)} mi`;
  // Preview count using draft (shown before Apply)
  const draftFilteredCount = deckJobs.filter(j => j.distance_km <= draftDistance).length;

  // Filtered jobs use the committed/applied value
  const filteredJobs = deckJobs.filter(j => j.distance_km <= maxDistanceKm);
  const filteredJobsRef = useRef(filteredJobs);
  filteredJobsRef.current = filteredJobs; // always up to date, safe inside stale closures

  const position      = useRef(new Animated.ValueXY()).current;
  const cardOpacity   = useRef(new Animated.Value(1)).current;
  const expandAnim    = useRef(new Animated.Value(0)).current;
  // 0 = next card at rest scale/dim (0.93, dark overlay), 1 = full size/undimmed
  const nextCardAnim  = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const photoScrollRef = useRef<ScrollView>(null);

  // ── Timer pause/resume tracking ──────────────────────────────────────────────
  const TIMER_DURATION   = 5000;
  const isDraggingRef    = useRef(false);
  const pausedElapsedRef = useRef(0);
  const dragStartRef     = useRef(0);

  // Auto-cycle photos every 5 seconds — pauses while card is being dragged
  useEffect(() => {
    const total = filteredJobs[index]?.photos.length ?? 1;
    if (total <= 1) return;

    let accumulatedMs = pausedElapsedRef.current;
    let lastTick      = Date.now();

    // Drive progressAnim directly from accumulatedMs every tick.
    // This way pausing is just "stop incrementing" — no Animated.timing involved,
    // so there is no async mismatch between the animation clock and real elapsed time.
    const id = setInterval(() => {
      const now = Date.now();

      if (!isDraggingRef.current) {
        accumulatedMs += now - lastTick;
      }
      lastTick = now;

      progressAnim.setValue(Math.min(accumulatedMs / TIMER_DURATION, 1));

      if (accumulatedMs >= TIMER_DURATION) {
        pausedElapsedRef.current = 0;
        clearInterval(id);
        progressAnim.setValue(0);
        setPhotoIndex(p => {
          const isLast = p === total - 1;
          const next   = isLast ? 0 : p + 1;
          if (isLast) {
            photoScrollRef.current?.scrollTo({ x: total * cardSize.width, animated: true });
            setTimeout(() => photoScrollRef.current?.scrollTo({ x: 0, animated: false }), 400);
          } else {
            photoScrollRef.current?.scrollTo({ x: next * cardSize.width, animated: true });
          }
          return next;
        });
        setTimerKey(k => k + 1);
      }
    }, 100);

    return () => clearInterval(id);
  }, [index, cardSize.width, timerKey, filteredJobs.length]);

  const onCardLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) setCardSize({ width, height });
  };

  const likeOpacity        = position.x.interpolate({ inputRange: [0, 80],              outputRange: [0, 1],       extrapolate: 'clamp' });
  const nopeOpacity        = position.x.interpolate({ inputRange: [-80, 0],             outputRange: [1, 0],       extrapolate: 'clamp' });
  const rotate             = position.x.interpolate({ inputRange: [-SW, 0, SW],         outputRange: ['-28deg', '0deg', '28deg'] });
  const likeOverlayOpacity = position.x.interpolate({ inputRange: [0, SWIPE_THRESHOLD], outputRange: [0, 0.45],    extrapolate: 'clamp' });
  const nopeOverlayOpacity = position.x.interpolate({ inputRange: [-SWIPE_THRESHOLD, 0],outputRange: [0.45, 0],    extrapolate: 'clamp' });
  // Used for the post-swipe settle animation on the next card
  // Back card starts small and dim, grows to full size as it becomes the new front card
  const nextCardSettleScale         = nextCardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] });
  const nextCardSettleOverlay       = nextCardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.70, 0] });
  const nextCardSettleImageOpacity  = nextCardAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.7, 1] });
  const panelTranslateY    = expandAnim.interpolate({ inputRange: [0, 1],               outputRange: [PANEL_HEIGHT, 0] });

  const settingsOpenRef = useRef(false);
  const expandedRef     = useRef(false);
  const isHoldingRef    = useRef(false);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (_e, { dx, dy }) => !expandedRef.current && !settingsOpenRef.current && Math.abs(dx) > Math.abs(dy),
      onMoveShouldSetPanResponder:  (_e, { dx, dy }) => !expandedRef.current && !settingsOpenRef.current && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 5,
      onPanResponderGrant: () => {
        isDraggingRef.current = true;},
      onPanResponderMove: (_e, { dx, dy }) => {
        isDraggingRef.current = true;
        position.setValue({ x: dx * 1.08, y: dy * 0.45 });
      },
      onPanResponderRelease: (_e, { dx, vx }) => {
        isDraggingRef.current = false;
        isHoldingRef.current = false;
        if (Math.abs(dx) > SWIPE_THRESHOLD || Math.abs(vx) > 0.4) {
          pausedElapsedRef.current = 0;
          commitSwipe(dx > 0 ? 1 : -1);
        } else {
          resetCard();
        }
      },
    })
  ).current;

  const commitSwipe = (dir: number) => {
    if (swipesUsed >= swipeLimit) return;
    collapsePanel();
    const upcomingJob = filteredJobsRef.current[indexRef.current + 1] ?? null;
    Animated.timing(position, {
      toValue: { x: dir * SW * 1.5, y: 0 },
      duration: 280,
      useNativeDriver: false,
    }).start(() => {
      cardOpacity.setValue(0);
      position.setValue({ x: 0, y: 0 });
      const currentJob = filteredJobsRef.current[indexRef.current];
      if (currentJob) {
        // Fire-and-forget swipe action
        const endpoint = dir > 0 ? `/applicant/swipe/right/${currentJob.id}` : `/applicant/swipe/left/${currentJob.id}`;
        api.post(endpoint, {}).catch(() => {});
      }
      if (currentJob && dir > 0) setLiked(prev => [...prev, currentJob.id]);
      if (currentJob) setHistory(prev => [...prev, { id: currentJob.id, dir }]);
      setPhotoIndex(0);
      setGalleryIndex(0);
      photoScrollRef.current?.scrollTo({ x: 0, animated: false });
      setIndex(i => { indexRef.current = i + 1; return i + 1; });
      setSwipesUsed(s => s + 1);
      // Step 4: pin the growing card to the snapshot so it doesn't flicker
      // to a different job when index changes
      growingJobRef.current = upcomingJob;
      requestAnimationFrame(() =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            nextCardAnim.stopAnimation();
            nextCardAnim.setValue(0);
            cardOpacity.setValue(0);
            // Back card (snapshot) grows into full size
            Animated.timing(nextCardAnim, {
              toValue: 1,
              duration: 420,
              useNativeDriver: false,
            }).start(() => {
              // Front card fades in on top, then reset back card to hidden
              Animated.timing(cardOpacity, {
                toValue: 1,
                duration: 180,
                useNativeDriver: false,
              }).start(() => {
                growingJobRef.current = null;
                nextCardAnim.setValue(0); // hide back card so it doesn't show on next swipe
              });
            });
          })
        )
      );
    });
  };

  const resetCard = () => Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: false, bounciness: 10, speed: 8 }).start();
  const collapsePanel = () => {
    expandedRef.current = false;
    setExpanded(false);
    Animated.timing(expandAnim, { toValue: 0, duration: 250, useNativeDriver: false }).start();
  };
  const openPanel = () => {
    expandedRef.current = true;
    setExpanded(true);
    Animated.spring(expandAnim, { toValue: 1, bounciness: 3, useNativeDriver: false }).start();
  };
  // const undo = () => {
  //   if (!history.length) return;
  //   const last = history[history.length - 1];
  //   setHistory(h => h.slice(0, -1));
  //   setLiked(l => l.filter(id => id !== last.id));
  //   setPhotoIndex(0);
  //   pausedElapsedRef.current = 0;
  //   collapsePanel();
  //   setIndex(i => { const n = Math.max(0, i - 1); indexRef.current = n; return n; });
  // };
  const handleImageTap = (evt: any) => {
    if (expanded) return;
    const x     = evt.nativeEvent.locationX;
    const total = filteredJobs[index].photos.length;
    if (x < SW * 0.35 || x > SW * 0.65) {
      setPhotoIndex(p => {
        const next = x < SW * 0.35
          ? (p === 0 ? total - 1 : p - 1)
          : (p === total - 1 ? 0 : p + 1);
        photoScrollRef.current?.scrollTo({ x: next * cardSize.width, animated: true });
        return next;
      });
      setTimerKey(k => k + 1); // resets the interval
      pausedElapsedRef.current = 0;
    }
  };

  // ── Loading state ────────────────────────────────────────────────────────────
  if (deckLoading) {
    return (
      <View style={s.emptyScreen}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={[s.emptySub, { marginTop: 16 }]}>Loading your job matches…</Text>
      </View>
    );
  }

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (filteredJobs.length === 0) {
    // No jobs match the current distance filter
    return (
      <View style={s.emptyScreen}>
        <StatusBar barStyle="dark-content" />
        <View style={s.emptyIconWrap}>
          <MaterialCommunityIcons name="map-marker-off-outline" size={40} color={Colors.primary} />
        </View>
        <Text style={s.emptyTitle}>No jobs nearby</Text>
        <Text style={s.emptySub}>{deckJobs.length === 0 ? 'No job listings available right now. Check back soon!' : 'There are no listings within your current distance. Try increasing the range in filters.'}</Text>
        <TouchableOpacity style={s.refreshBtn} onPress={deckJobs.length === 0 ? loadDeck : openSettings} activeOpacity={0.85}>
          <Text style={s.refreshBtnText}>{deckJobs.length === 0 ? 'Refresh' : 'Adjust filters'}</Text>
        </TouchableOpacity>
        {settingsOpen && (
          <TouchableOpacity style={s.settingsBackdrop} activeOpacity={1} onPress={closeSettings} />
        )}
        <Animated.View
          style={[
            s.settingsPanel,
            {
              backgroundColor: T.surface,
              paddingBottom: tabBarHeight + 16,
              transform: [{ translateY: settingsAnim.interpolate({ inputRange: [0, 1], outputRange: [500, 0] }) }],
            },
          ]}
          pointerEvents={settingsOpen ? 'box-none' : 'none'}
        >
          <View style={[s.panelHandle, { backgroundColor: T.borderFaint }]} />
          <TouchableOpacity style={[s.panelCloseBtn, { backgroundColor: T.surfaceHigh }]} onPress={closeSettings} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
            <MaterialCommunityIcons name="chevron-down" size={24} color={T.textSub} />
          </TouchableOpacity>
          <View style={s.settingsContent}>
            <Text style={[s.settingsTitle, { color: T.textPrimary }]}>Filters</Text>
            <View style={s.settingsSection}>
              <View style={s.settingsLabelRow}>
                <MaterialCommunityIcons name="map-marker-radius-outline" size={16} color={T.textSub} />
                <Text style={[s.settingsLabel, { color: T.textSub }]}>Max Distance</Text>
                <Text style={[s.settingsValue, { color: T.primary }]}>{draftLabel}</Text>
              </View>
              <View
                style={s.sliderWrapper}
                onLayout={(e) => setSliderTrackWidth(e.nativeEvent.layout.width)}
                ref={(ref) => {
                  if (ref) ref.measure((_x, _y, _w, _h, pageX) => { sliderWrapperX.current = pageX; });
                }}
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderGrant={(e) => {
                  const pct = Math.max(0, Math.min(1, (e.nativeEvent.pageX - sliderWrapperX.current) / sliderTrackWidth));
                  setDraftDistance(Math.max(1, Math.round(pct * 100)));
                }}
                onResponderMove={(e) => {
                  const pct = Math.max(0, Math.min(1, (e.nativeEvent.pageX - sliderWrapperX.current) / sliderTrackWidth));
                  setDraftDistance(Math.max(1, Math.round(pct * 100)));
                }}
              >
                <View style={[s.sliderTrack, { backgroundColor: T.borderFaint }]} pointerEvents="none">
                  <View style={[s.sliderFill, { width: `${(draftDistance / 100) * 100}%`, backgroundColor: T.primary }]} />
                </View>
                <View style={[s.sliderThumb, { left: (draftDistance / 100) * sliderTrackWidth - 10 }]} pointerEvents="none" />
              </View>
              <View style={s.sliderLabels}>
                <Text style={[s.sliderMin, { color: T.textHint }]}>1 {draftUseKm ? 'km' : 'mi'}</Text>
                <Text style={[s.sliderMax, { color: T.textHint }]}>100 {draftUseKm ? 'km' : 'mi'}</Text>
              </View>
            </View>
            <View style={[s.exDivider, { backgroundColor: T.borderFaint }]} />
            <View style={s.settingsSection}>
              <View style={s.settingsLabelRow}>
                <MaterialCommunityIcons name="map-outline" size={16} color={T.textSub} />
                <Text style={[s.settingsLabel, { color: T.textSub }]}>Distance Unit</Text>
              </View>
              <View style={s.unitToggleRow}>
                <Text style={[s.unitLabel, { color: T.textHint }, !draftUseKm && { color: T.textPrimary }]}>Miles</Text>
                <Switch value={draftUseKm} onValueChange={setDraftUseKm} trackColor={{ false: T.borderFaint, true: T.primary + '88' }} thumbColor={T.primary} ios_backgroundColor={T.borderFaint} />
                <Text style={[s.unitLabel, { color: T.textHint }, draftUseKm && { color: T.textPrimary }]}>Kilometres</Text>
              </View>
            </View>
            <View style={[s.exDivider, { backgroundColor: T.borderFaint }]} />
            <View style={s.settingsResultRow}>
              <MaterialCommunityIcons name="briefcase-search-outline" size={15} color={T.primary} />
              <Text style={[s.settingsResultText, { color: T.textSub }]}>{draftFilteredCount} job{draftFilteredCount !== 1 ? 's' : ''} within {draftLabel}</Text>
            </View>
            <TouchableOpacity style={[s.applyFiltersBtn, { backgroundColor: T.primary }]} onPress={applySettings} activeOpacity={0.85}>
              <Text style={s.applyFiltersBtnText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    );
  }

  if (swipesUsed >= MAX_SWIPES) {
    return (
      <View style={s.emptyScreen}>
        <StatusBar barStyle="dark-content" />
        <View style={s.emptyIconWrap}>
          <MaterialCommunityIcons name="lightning-bolt" size={40} color={Colors.primary} />
        </View>
        <Text style={s.emptyTitle}>No swipes left</Text>
        <Text style={s.emptySub}>You no longer have any swipes left. Upgrade to Pro for unlimited swipes.</Text>
        <TouchableOpacity
          style={s.refreshBtn}
          onPress={() => navigation.navigate('subscription' as never)}
        >
          <Text style={s.refreshBtnText}>Upgrade to Pro</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (index >= filteredJobs.length) {
    // All cards in range have been swiped
    return (
      <View style={s.emptyScreen}>
        <StatusBar barStyle="dark-content" />
        <View style={s.emptyIconWrap}>
          <MaterialCommunityIcons name="rocket-launch-outline" size={40} color={Colors.primary} />
        </View>
        <Text style={s.emptyTitle}>You're all caught up!</Text>
        <Text style={s.emptySub}>New jobs are added daily — check back soon.</Text>
        <TouchableOpacity
          style={s.refreshBtn}
          onPress={() => { setIndex(0); indexRef.current = 0; setLiked([]); setHistory([]); setPhotoIndex(0); nextCardAnim.setValue(0); cardOpacity.setValue(1); }}
        >
          <Text style={s.refreshBtnText}>Refresh deck</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const job     = filteredJobs[index];
  // During the grow animation use the snapshot; otherwise show the real next card
  const nextJob = growingJobRef.current ?? filteredJobs[index + 1];

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <View style={s.screen} onLayout={onCardLayout}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Layer 0 — solid background always present so nothing bleeds through mid-swipe */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0f0a1e' }]} pointerEvents="none" />

      {/* Layer 0b — next card, only visible after swipe commits (nextCardAnim > 0) */}
      {nextJob && (
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: nextCardSettleScale }], opacity: nextCardSettleImageOpacity }]} pointerEvents="none">
          <Animated.Image source={nextJob.photos[0]} style={{ width: cardSize.width, height: cardSize.height }} resizeMode="cover" fadeDuration={0} />
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: nextCardSettleOverlay }]} />
        </Animated.View>
      )}

      {/* Layer 1 — swipeable card: photo + gradients + stamps + company info */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: cardOpacity, transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }] }]}
        {...panResponder.panHandlers}
      >
        {/* Photo scroll */}
        <TouchableOpacity
          activeOpacity={1}
          style={StyleSheet.absoluteFill}
          onPress={handleImageTap}
          onPressIn={() => {
            isHoldingRef.current = true;
            isDraggingRef.current = true;
          }}
          onPressOut={() => {
            isHoldingRef.current = false;
            isDraggingRef.current = false;
          }}
        >
          <ScrollView
            ref={photoScrollRef}
            horizontal
            pagingEnabled
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            style={StyleSheet.absoluteFill}
            onMomentumScrollEnd={(e) => {
              const offsetX = e.nativeEvent.contentOffset.x;
              const total = job.photos.length;
              if (offsetX >= total * cardSize.width) {
                photoScrollRef.current?.scrollTo({ x: 0, animated: false });
                setPhotoIndex(0);
              }
            }}
          >
            {job.photos.map((p, i) => (
              <Image key={i} source={p} style={{ width: cardSize.width, height: cardSize.height }} resizeMode="cover" fadeDuration={0} />
            ))}
            <Image source={job.photos[0]} style={{ width: cardSize.width, height: cardSize.height }} resizeMode="cover" fadeDuration={0} />
          </ScrollView>
        </TouchableOpacity>

        {/* Colour tints */}
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#10B981', opacity: likeOverlayOpacity, zIndex: 5 }]} pointerEvents="none" />
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#EF4444', opacity: nopeOverlayOpacity, zIndex: 5 }]} pointerEvents="none" />

        {/* Stamps */}
        <Animated.View style={[s.stampWrap, { alignSelf: 'center', opacity: likeOpacity }]} pointerEvents="none"><SwipeLabel type="like" visible /></Animated.View>
        <Animated.View style={[s.stampWrap, { alignSelf: 'center', opacity: nopeOpacity }]} pointerEvents="none"><SwipeLabel type="pass" visible /></Animated.View>

        {/* Top gradient scrim */}
        <LinearGradient
          colors={['rgba(15,10,30,1)', 'rgba(15,10,30,1)', 'rgba(15,10,30,0.85)', 'rgba(15,10,30,0.3)', 'transparent']}
          style={[StyleSheet.absoluteFill, { bottom: '75%', zIndex: 3 }]}
          pointerEvents="none"
        />

        {/* Bottom gradient scrim */}
        <LinearGradient
          colors={['transparent', 'rgba(15,10,30,0.3)', 'rgba(15,10,30,0.85)', 'rgba(15,10,30,1)', 'rgba(15,10,30,1)']}
          style={[StyleSheet.absoluteFill, { top: '75%', zIndex: 3 }]}
          pointerEvents="none"
        />

        {/* Top bar — inside card, swipes with it */}
        <View style={[s.topBar, { paddingTop: topInset > 0 ? topInset + 8 : (Platform.OS === 'ios' ? 54 : 40) }]} pointerEvents="box-none" onLayout={e => setTopBarHeight(e.nativeEvent.layout.height)}>
          <View style={s.tabRow}>
            <TouchableOpacity style={s.iconPill} onPress={openSettings}><MaterialCommunityIcons name="tune-variant" size={19} color={Colors.white} /></TouchableOpacity>
            <TouchableOpacity style={s.iconPill} onPress={() => navigation.navigate('subscription' as never)}><MaterialCommunityIcons name="lightning-bolt" size={19} color="#A78BFA" /></TouchableOpacity>
          </View>
          <View style={s.dotsRow}>
            {job.photos.map((_, i) => (
              <View key={i} style={s.dot}>
                {i === photoIndex ? (
                  <Animated.View style={[s.dotFill, { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
                ) : (
                  <View style={[s.dotFill, { width: i < photoIndex ? '100%' : '0%' }]} />
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Company info strip — pinned to bottom of card, travels with swipe */}
        <View style={[s.bottomOverlay, { position: 'absolute', bottom: overlayBottom, left: 0, right: 0 }]} pointerEvents="box-none">
          <View style={s.nameRow}>
            <View style={{ flex: 1 }}>
              <View style={s.companyNameRow}>
                <Text style={s.companyName}>{job.company.name}</Text>
                <MaterialCommunityIcons name="check-decagram" size={22} color="#60A5FA" style={s.verifiedIcon} />
              </View>
              <View style={s.verifiedRow}>
                <Text style={s.salaryInline}>{job.salary}</Text>
              </View>
              <View style={s.cardDistanceRow}>
                <MaterialCommunityIcons name="map-marker-distance" size={13} color="rgba(255,255,255,0.65)" />
                <Text style={s.cardDistanceText}>{formatDistance(job.distanceKm)}</Text>
              </View>
            </View>
            {!expanded && (
              <TouchableOpacity style={s.expandBtn} onPress={openPanel} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
                <MaterialCommunityIcons name="chevron-up" size={22} color={Colors.white} />
              </TouchableOpacity>
            )}
          </View>
          <View style={s.lookingRow}>
            <MaterialCommunityIcons name="magnify" size={14} color="rgba(255,255,255,0.75)" />
            <Text style={s.lookingLabel}>Looking for</Text>
          </View>
          <Text style={s.positionText}>{job.position}</Text>
        </View>

      </Animated.View>
      {/* END layer 1 */}

      {/* Skip / Apply buttons — outside card, stay fixed on screen */}
      <View style={[s.actionsRow, { position: 'absolute', bottom: actionsBottom, left: 0, right: 0, zIndex: 40 }]}>
        <TouchableOpacity style={s.btnDark} onPress={() => commitSwipe(-1)} activeOpacity={0.8}>
          <MaterialCommunityIcons name="close" size={32} color={Colors.white} />
        </TouchableOpacity>
        <PrimaryButton icon="heart" iconSize={32} onPress={() => commitSwipe(1)} style={s.btnHeart} />
      </View>





      {/*
        Layer 3 — Expand panel (bottom sheet)
        ======================================
        Completely outside the swipeable card so it's never constrained
        by the card's height or overflow. Height = 62 % of screen.

        ScrollView paddingBottom = BOTTOM_NAV + 32 so the last item
        always scrolls fully clear of the tab bar.
      */}
      <Animated.View
        style={[s.expandPanel, { height: PANEL_HEIGHT, backgroundColor: T.surface, transform: [{ translateY: panelTranslateY }] }]}
        pointerEvents={expanded ? 'box-none' : 'none'}
      >
        <View style={[s.panelHandle, { backgroundColor: T.borderFaint }]} />

        <TouchableOpacity style={[s.panelCloseBtn, { backgroundColor: T.surfaceHigh }]} onPress={collapsePanel} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
          <MaterialCommunityIcons name="chevron-down" size={24} color={T.textSub} />
        </TouchableOpacity>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[s.expandContent, { paddingBottom: tabBarHeight + 32 }]}
          showsVerticalScrollIndicator={false}
          bounces
          overScrollMode="always"
        >
          <Text style={[s.exRole, { color: T.textPrimary }]}>{job.position}</Text>
          <Text style={[s.exSalary, { color: T.primary }]}>{job.salary}</Text>

          <View style={s.exDistanceRow}>
            <MaterialCommunityIcons name="map-marker-distance" size={14} color={T.textHint} />
            <Text style={[s.exDistance, { color: T.textHint }]}>{formatDistance(job.distanceKm)}</Text>
          </View>

          <View style={s.exLocRow}>
            <MaterialCommunityIcons name="map-marker-outline" size={13} color={T.textSub} />
            <Text style={[s.exLoc, { color: T.textSub }]}>{job.location}</Text>
          </View>

          <View style={s.exTags}>
            {job.tags.map((tag, i) => <TagBadge key={i} label={tag.label} variant={tag.variant} />)}
          </View>

          <View style={[s.exDivider, { backgroundColor: T.borderFaint }]} />
          <Text style={[s.exSectionTitle, { color: T.textHint }]}>About the role</Text>
          <Text style={[s.exDesc, { color: T.textSub }]}>{job.description}</Text>

          {/* ── Company photo gallery ── */}
          <View style={[s.exDivider, { backgroundColor: T.borderFaint }]} />
          <Text style={[s.exSectionTitle, { color: T.textHint }]}>Company photos</Text>
          {/* Main large preview */}
          <TouchableOpacity
            activeOpacity={0.92}
            style={s.galleryMain}
            onPress={() => setGalleryFullscreen(true)}
          >
            <Image
              source={job.photos[galleryIndex]}
              style={s.galleryMainImg}
              resizeMode="cover"
            />
            <View style={s.galleryMainOverlay}>
              <MaterialCommunityIcons name="magnify-plus-outline" size={22} color="rgba(255,255,255,0.85)" />
            </View>
            {/* Dot indicators */}
            <View style={s.galleryDots}>
              {job.photos.map((_, i) => (
                <View key={i} style={[s.galleryDot, i === galleryIndex && s.galleryDotActive]} />
              ))}
            </View>
          </TouchableOpacity>
          {/* Thumbnail strip */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={s.galleryStrip}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}
          >
            {job.photos.map((p, i) => (
              <TouchableOpacity
                key={i}
                activeOpacity={0.8}
                onPress={() => setGalleryIndex(i)}
                style={[s.galleryThumb, i === galleryIndex && s.galleryThumbActive]}
              >
                <Image source={p} style={s.galleryThumbImg} resizeMode="cover" />
                {i === galleryIndex && <View style={s.galleryThumbOverlay} />}
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={[s.exDivider, { backgroundColor: T.borderFaint }]} />
          <Text style={[s.exSectionTitle, { color: T.textHint }]}>Requirements</Text>
          <View style={s.exMetaRow}>
            <MaterialCommunityIcons name="briefcase-outline" size={14} color={T.textHint} />
            <Text style={[s.exMeta, { color: T.textSub }]}>{job.lookingFor}</Text>
          </View>

          <View style={[s.exDivider, { backgroundColor: T.borderFaint }]} />
          <Text style={[s.exSectionTitle, { color: T.textHint }]}>Company rating</Text>
          <View style={s.exMetaRow}>
            <MaterialCommunityIcons name="star" size={14} color={T.gold} />
            <Text style={[s.exMeta, { color: T.textSub }]}>{job.rating} · Glassdoor</Text>
          </View>

          {/* ── Employee reviews ── */}
          <View style={[s.exDivider, { backgroundColor: T.borderFaint }]} />
          <View style={s.reviewsTitleRow}>
            <Text style={[s.exSectionTitle, { color: T.textHint }]}>Employee reviews</Text>
            <Text style={[s.reviewsCount, { color: T.textHint }]}>{job.reviews.length} reviews</Text>
          </View>
          <View style={{ gap: 10 }}>
            {job.reviews.slice(0, 3).map((review, i) => {
              const reviewerName = review.author ?? review.name ?? 'Anonymous';
              const reviewerRole = review.role ?? 'Employee';
              const reviewDate = review.date ?? 'Recent';

              return (
                <View key={i} style={[s.reviewCard, { backgroundColor: T.surfaceHigh, borderColor: T.borderFaint }, i === 2 && s.reviewCardFaded]}>
                  <View style={s.reviewHeader}>
                    <View style={[s.reviewAvatar, { backgroundColor: T.primary + '25', borderColor: T.primary + '55' }]}>
                      <Text style={[s.reviewAvatarText, { color: T.primary }]}>{reviewerName.charAt(0)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.reviewAuthor, { color: T.textPrimary }]}>{reviewerName}</Text>
                      <Text style={[s.reviewRole, { color: T.textHint }]}>{reviewerRole}</Text>
                    </View>
                    <View style={s.reviewMeta}>
                      <View style={s.reviewStars}>
                        {Array.from({ length: 5 }).map((_, si) => (
                          <MaterialCommunityIcons
                            key={si}
                            name={si < review.rating ? 'star' : 'star-outline'}
                            size={11}
                            color={si < review.rating ? T.gold : T.borderFaint}
                          />
                        ))}
                      </View>
                      <Text style={[s.reviewDate, { color: T.textHint }]}>{reviewDate}</Text>
                    </View>
                  </View>
                  <Text style={[s.reviewText, { color: T.textSub }, i === 2 && { opacity: 0.35 }]}>{review.text}</Text>
                </View>
              );
            })}
          </View>

          {/* Locked "View more reviews" button */}
          <TouchableOpacity style={[s.viewMoreBtn, { borderColor: T.gold + '44', backgroundColor: T.gold + '0d' }]} activeOpacity={0.8} onPress={() => navigation.navigate('subscription' as never)}>
            <View style={[s.viewMoreLockBadge, { backgroundColor: T.gold + '33', borderColor: T.gold + '55' }]}>
              <MaterialCommunityIcons name="lock" size={11} color={T.gold} />
            </View>
            <Text style={[s.viewMoreText, { color: T.textSub }]}>View all reviews</Text>
            <View style={s.viewMorePremiumBadge}>
              <MaterialCommunityIcons name="lightning-bolt" size={10} color="#0f0a1e" />
              <Text style={s.viewMorePremiumText}>Premium</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={16} color={T.textHint} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>

      {/* Tap outside panel to close */}
      {expanded && (
        <TouchableOpacity style={s.panelBackdrop} activeOpacity={1} onPress={collapsePanel} />
      )}

      {/* ── Fullscreen gallery lightbox ───────────────────────────────────── */}
      {galleryFullscreen && (
        <View style={s.lightbox}>
          <TouchableOpacity style={s.lightboxClose} onPress={() => setGalleryFullscreen(false)} hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
            <MaterialCommunityIcons name="close" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Image
            source={job.photos[galleryIndex]}
            style={s.lightboxImg}
            resizeMode="contain"
          />
          {/* Prev / Next */}
          {galleryIndex > 0 && (
            <TouchableOpacity style={[s.lightboxArrow, s.lightboxArrowLeft]} onPress={() => setGalleryIndex(i => i - 1)}>
              <MaterialCommunityIcons name="chevron-left" size={32} color={Colors.white} />
            </TouchableOpacity>
          )}
          {galleryIndex < job.photos.length - 1 && (
            <TouchableOpacity style={[s.lightboxArrow, s.lightboxArrowRight]} onPress={() => setGalleryIndex(i => i + 1)}>
              <MaterialCommunityIcons name="chevron-right" size={32} color={Colors.white} />
            </TouchableOpacity>
          )}
          <Text style={s.lightboxCounter}>{galleryIndex + 1} / {job.photos.length}</Text>
        </View>
      )}

      {/* ── Settings panel ─────────────────────────────────────────────────── */}
      {settingsOpen && (
        <TouchableOpacity style={s.settingsBackdrop} activeOpacity={1} onPress={closeSettings} />
      )}
      <Animated.View
        style={[
          s.settingsPanel,
          {
            backgroundColor: T.surface,
            paddingBottom: tabBarHeight + 16,
            transform: [{ translateY: settingsAnim.interpolate({ inputRange: [0, 1], outputRange: [500, 0] }) }],
          },
        ]}
        pointerEvents={settingsOpen ? 'box-none' : 'none'}
      >
        <View style={[s.panelHandle, { backgroundColor: T.borderFaint }]} />
        <TouchableOpacity style={[s.panelCloseBtn, { backgroundColor: T.surfaceHigh }]} onPress={closeSettings} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
          <MaterialCommunityIcons name="chevron-down" size={24} color={T.textSub} />
        </TouchableOpacity>

        <View style={s.settingsContent}>
          <Text style={[s.settingsTitle, { color: T.textPrimary }]}>Filters</Text>

          {/* Distance slider */}
          <View style={s.settingsSection}>
            <View style={s.settingsLabelRow}>
              <MaterialCommunityIcons name="map-marker-radius-outline" size={16} color={T.textSub} />
              <Text style={[s.settingsLabel, { color: T.textSub }]}>Max Distance</Text>
              <Text style={[s.settingsValue, { color: T.primary }]}>{draftLabel}</Text>
            </View>

            {/* Slider wrapper — tall touch target, visual track centred inside */}
            <View
              style={s.sliderWrapper}
              onLayout={(e) => {
                setSliderTrackWidth(e.nativeEvent.layout.width);
              }}
              ref={(ref) => {
                if (ref) ref.measure((_x, _y, _w, _h, pageX) => { sliderWrapperX.current = pageX; });
              }}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={(e) => {
                const pct = Math.max(0, Math.min(1, (e.nativeEvent.pageX - sliderWrapperX.current) / sliderTrackWidth));
                setDraftDistance(Math.max(1, Math.round(pct * 100)));
              }}
              onResponderMove={(e) => {
                const pct = Math.max(0, Math.min(1, (e.nativeEvent.pageX - sliderWrapperX.current) / sliderTrackWidth));
                setDraftDistance(Math.max(1, Math.round(pct * 100)));
              }}
            >
              {/* Visual track */}
              <View style={[s.sliderTrack, { backgroundColor: T.borderFaint }]} pointerEvents="none">
                <View style={[s.sliderFill, { width: `${(draftDistance / 100) * 100}%`, backgroundColor: T.primary }]} />
              </View>
              {/* Thumb — positioned relative to wrapper */}
              <View
                style={[s.sliderThumb, { left: (draftDistance / 100) * sliderTrackWidth - 10 }]}
                pointerEvents="none"
              />
            </View>

            <View style={s.sliderLabels}>
              <Text style={[s.sliderMin, { color: T.textHint }]}>1 {draftUseKm ? 'km' : 'mi'}</Text>
              <Text style={[s.sliderMax, { color: T.textHint }]}>100 {draftUseKm ? 'km' : 'mi'}</Text>
            </View>
          </View>

          <View style={[s.exDivider, { backgroundColor: T.borderFaint }]} />

          {/* Unit toggle */}
          <View style={s.settingsSection}>
            <View style={s.settingsLabelRow}>
              <MaterialCommunityIcons name="map-outline" size={16} color={T.textSub} />
              <Text style={[s.settingsLabel, { color: T.textSub }]}>Distance Unit</Text>
            </View>
            <View style={s.unitToggleRow}>
              <Text style={[s.unitLabel, { color: T.textHint }, !draftUseKm && { color: T.textPrimary }]}>Miles</Text>
              <Switch
                value={draftUseKm}
                onValueChange={setDraftUseKm}
                trackColor={{ false: T.borderFaint, true: T.primary + '88' }}
                thumbColor={T.primary}
                ios_backgroundColor={T.borderFaint}
              />
              <Text style={[s.unitLabel, { color: T.textHint }, draftUseKm && { color: T.textPrimary }]}>Kilometres</Text>
            </View>
          </View>

          <View style={[s.exDivider, { backgroundColor: T.borderFaint }]} />

          {/* Preview count */}
          <View style={s.settingsResultRow}>
            <MaterialCommunityIcons name="briefcase-search-outline" size={15} color={T.primary} />
            <Text style={[s.settingsResultText, { color: T.textSub }]}>
              {draftFilteredCount} job{draftFilteredCount !== 1 ? 's' : ''} within {draftLabel}
            </Text>
          </View>

          {/* Apply button */}
          <TouchableOpacity style={[s.applyFiltersBtn, { backgroundColor: T.primary }]} onPress={applySettings} activeOpacity={0.85}>
            <Text style={s.applyFiltersBtnText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },

  
  stampWrap: { position: 'absolute', top: 90, zIndex: 20 },

  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingHorizontal: Spacing['4'],
    zIndex: 10,
  },
  tabRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing['3'] },
  iconPill: {
    width: 38, height: 38, borderRadius: Radii.full,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  tabPills: {
    flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: Radii.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    padding: 3, gap: 2,
  },
  tabPill:       { paddingHorizontal: Spacing['4'], paddingVertical: 7, borderRadius: Radii.full },
  tabPillActive: { backgroundColor: Colors.white },
  tabText:       { fontSize: Typography.base, fontWeight: Typography.medium, color: 'rgba(255,255,255,0.7)' },
  tabTextActive: { fontSize: Typography.base, fontWeight: Typography.bold,   color: Colors.gray900 },

  dotsRow:  { flexDirection: 'row', gap: 5, paddingHorizontal: Spacing['1'] },
  dot:      { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' },
  dotActive:{ backgroundColor: Colors.white },
  dotFill:  { height: '100%', borderRadius: 2, backgroundColor: Colors.white },

  cardInfoGroup: {
    position: 'absolute', left: 0, right: 0,
    zIndex: 10,
  },
  bottomOverlay: { paddingHorizontal: Spacing['5'], marginBottom: Spacing['3'] },
  nameRow:       { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 4 },
  companyNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  companyName: {
    fontSize: 34, fontWeight: Typography.bold, color: Colors.white, letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.85)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 10,
  },
  verifiedIcon: { marginTop: 2 },
  verifiedRow:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  salaryInline: {
    fontSize: Typography.md, fontWeight: Typography.semibold, color: 'rgba(255,255,255,0.95)',
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6,
  },
  expandBtn: {
    width: 40, height: 40, borderRadius: Radii.full,
    backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  lookingRow:   { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: Spacing['3'], marginBottom: 3 },
  lookingLabel: {
    fontSize: Typography.base, color: 'rgba(255,255,255,0.9)', fontWeight: Typography.medium,
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6,
  },
  positionText: {
    fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.white,
    textShadowColor: 'rgba(0,0,0,0.85)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8,
  },



  actionsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing['5'], paddingVertical: Spacing['2'],
  },
  btnDark: {
    width: 70, height: 70,
    backgroundColor: '#EF4444',
    borderWidth: 0, borderColor: 'transparent', borderRadius: Radii.full,
    shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  btnSm:   {},
  btnHeart:{ width: 70, height: 70, backgroundColor: Colors.success, borderRadius: Radii.full, ...Shadows.colored(Colors.success) },

  // Expand panel
  expandPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    zIndex: 60,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    overflow: 'hidden',
  },
  panelBackdrop: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 55 },
  panelHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  panelCloseBtn: {
    position: 'absolute', top: 10, right: Spacing['4'],
    width: 36, height: 36, borderRadius: Radii.full,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center', zIndex: 70,
  },
  expandContent: { paddingHorizontal: Spacing['5'], paddingTop: Spacing['3'] },

  exRole:        { fontSize: Typography['2xl'], fontWeight: Typography.bold,    color: Colors.white,             marginBottom: 4 },
  exSalary:      { fontSize: Typography.lg,    fontWeight: Typography.semibold, color: '#818CF8',                marginBottom: Spacing['2'] },
  exDistanceRow: { flexDirection: 'row', alignItems: 'center', gap: 4,          marginBottom: Spacing['3'] },
  exDistance:    { fontSize: Typography.base,  color: 'rgba(255,255,255,0.5)' },

  // Always-visible distance on card
  cardDistanceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  cardDistanceText: {
    fontSize: Typography.sm, color: 'rgba(255,255,255,0.7)',
    textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  exLocRow:      { flexDirection: 'row', alignItems: 'center', gap: 4,          marginBottom: Spacing['3'] },
  exLoc:         { fontSize: Typography.base,  color: 'rgba(255,255,255,0.6)' },
  exTags:        { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing['2'],   marginBottom: Spacing['4'] },
  exDivider:     { height: 1, backgroundColor: 'rgba(255,255,255,0.1)',          marginBottom: Spacing['3'], marginTop: Spacing['1'] },
  exSectionTitle:{ fontSize: Typography.sm,    fontWeight: Typography.semibold, color: 'rgba(255,255,255,0.4)', marginBottom: Spacing['2'], textTransform: 'uppercase', letterSpacing: 1 },
  exDesc:        { fontSize: Typography.md,    color: 'rgba(255,255,255,0.78)', lineHeight: Typography.md * 1.65, marginBottom: Spacing['2'] },
  exMetaRow:     { flexDirection: 'row', alignItems: 'center', gap: 6,          marginBottom: Spacing['2'] },
  exMeta:        { fontSize: Typography.md,    color: 'rgba(255,255,255,0.7)' },

  // Gallery
  galleryMain: {
    borderRadius: Radii.lg, overflow: 'hidden',
    height: 180, marginBottom: Spacing['3'], position: 'relative',
  },
  galleryMainImg:     { width: '100%', height: '100%' },
  galleryMainOverlay: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: Radii.full, padding: 6,
  },
  galleryDots: {
    position: 'absolute', bottom: 10, alignSelf: 'center',
    flexDirection: 'row', gap: 5, left: 0, right: 0, justifyContent: 'center',
  },
  galleryDot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  galleryDotActive: { backgroundColor: Colors.white, width: 18 },
  galleryStrip:     { marginBottom: Spacing['2'] },
  galleryThumb: {
    width: 72, height: 56, borderRadius: Radii.md, overflow: 'hidden',
    borderWidth: 2, borderColor: 'transparent',
  },
  galleryThumbActive: { borderColor: Colors.primary },
  galleryThumbImg:    { width: '100%', height: '100%' },
  galleryThumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(99,102,241,0.18)',
  },

  // Lightbox
  lightbox: {
    position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.96)', zIndex: 100,
    alignItems: 'center', justifyContent: 'center',
  },
  lightboxImg:   { width: SW, height: SH * 0.7 },
  lightboxClose: {
    position: 'absolute', top: 52, right: Spacing['5'],
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: Radii.full, padding: 8, zIndex: 101,
  },
  lightboxArrow: {
    position: 'absolute', top: '50%', marginTop: -24,
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: Radii.full, padding: 8,
  },
  lightboxArrowLeft:  { left: Spacing['4'] },
  lightboxArrowRight: { right: Spacing['4'] },
  lightboxCounter: {
    position: 'absolute', bottom: 60,
    fontSize: Typography.md, color: 'rgba(255,255,255,0.6)', fontWeight: Typography.medium,
  },

  emptyScreen:   { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, padding: Spacing['8'] },
  emptyIconWrap: { width: 80, height: 80, borderRadius: Radii.full, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing['5'] },
  emptyTitle:    { fontSize: Typography['2xl'], fontWeight: Typography.bold, color: Colors.gray900, marginBottom: Spacing['2'], textAlign: 'center' },
  emptySub:      { fontSize: Typography.md, color: Colors.gray500, textAlign: 'center', lineHeight: 22, marginBottom: Spacing['6'] },
  refreshBtn:    { backgroundColor: Colors.primary, paddingHorizontal: Spacing['8'], paddingVertical: Spacing['3'] + 1, borderRadius: Radii.lg },
  refreshBtnText:{ fontSize: Typography.md, fontWeight: Typography.semibold, color: Colors.white },

  // Settings panel
  settingsBackdrop: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 65, backgroundColor: 'rgba(0,0,0,0.5)' },
  settingsPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    zIndex: 70,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
    overflow: 'hidden',
  },
  settingsContent: { paddingHorizontal: Spacing['5'], paddingTop: Spacing['2'] },
  settingsTitle: {
    fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.white,
    marginBottom: Spacing['5'], marginTop: Spacing['2'],
  },
  settingsSection: { marginBottom: Spacing['4'] },
  settingsLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing['3'] },
  settingsLabel: { flex: 1, fontSize: Typography.md, color: 'rgba(255,255,255,0.75)', fontWeight: Typography.medium },
  settingsValue: { fontSize: Typography.md, fontWeight: Typography.semibold, color: Colors.primary },

  // Slider
  sliderWrapper: {
    height: 32,                              // tall touch target
    justifyContent: 'center',               // visually centres the 4px track
    position: 'relative',
    marginBottom: 16,
  },
  sliderTrack: {
    height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.12)',
    position: 'relative',
    overflow: 'visible',
  },
  sliderFill: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    backgroundColor: Colors.primary, borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute', top: 6,           // (32px wrapper / 2) - (20px thumb / 2) = 6
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.white,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  sliderMin: { fontSize: Typography.sm, color: 'rgba(255,255,255,0.35)' },
  sliderMax: { fontSize: Typography.sm, color: 'rgba(255,255,255,0.35)' },

  // Unit toggle
  unitToggleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'] },
  unitLabel: { fontSize: Typography.md, color: 'rgba(255,255,255,0.35)', fontWeight: Typography.medium },
  unitLabelActive: { color: Colors.white },

  // Results count
  settingsResultRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing['1'] },
  settingsResultText: { fontSize: Typography.sm, color: 'rgba(255,255,255,0.5)' },

  // Apply button
  applyFiltersBtn: {
    marginTop: Spacing['4'],
    backgroundColor: Colors.primary,
    borderRadius: Radii.lg,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyFiltersBtnText: {
    fontSize: Typography.md,
    fontWeight: Typography.bold,
    color: Colors.white,
    letterSpacing: 0.3,
  },

  // Reviews
  reviewsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing['3'],
  },
  reviewsCount: {
    fontSize: Typography.xs,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: Typography.medium,
  },
  reviewCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: Spacing['4'],
    gap: 10,
  },
  reviewCardFaded: {
    opacity: 0.5,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reviewAvatar: {
    width: 34,
    height: 34,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(99,102,241,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewAvatarText: {
    fontSize: Typography.md,
    fontWeight: Typography.bold,
    color: Colors.primary,
  },
  reviewAuthor: {
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
    color: Colors.white,
  },
  reviewRole: {
    fontSize: Typography.xs,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 1,
  },
  reviewMeta: {
    alignItems: 'flex-end',
    gap: 3,
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewDate: {
    fontSize: Typography.xs,
    color: 'rgba(255,255,255,0.3)',
  },
  reviewText: {
    fontSize: Typography.sm,
    color: 'rgba(255,255,255,0.65)',
    lineHeight: Typography.sm * 1.6,
  },

  // View more locked button
  viewMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
    paddingVertical: 13,
    paddingHorizontal: Spacing['4'],
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.25)',
    backgroundColor: 'rgba(245,158,11,0.06)',
  },
  viewMoreLockBadge: {
    width: 24,
    height: 24,
    borderRadius: Radii.full,
    backgroundColor: 'rgba(245,158,11,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewMoreText: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: 'rgba(255,255,255,0.65)',
    flex: 1,
  },
  viewMorePremiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.warning,
    borderRadius: Radii.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  viewMorePremiumText: {
    fontSize: 10,
    fontWeight: Typography.bold,
    color: '#0f0a1e',
    letterSpacing: 0.3,
  },
});
