import { createClient } from '@supabase/supabase-js';

const env = import.meta.env as Record<string, string | undefined>;
const url = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  env.VITE_SUPABASE_ANON_KEY ||
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const configured = Boolean(url && key);

export const db = configured
  ? createClient(url!, key!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export type Status = 'yes' | 'no' | 'partial' | null;

export const dailyActivities = [
  'Maṅgala Ārati',
  'Bhāgavatam Class 1',
  'Bhāgavatam Class 2',
  'Bhagavad-gītā Reading',
] as const;

export const questions = [
  'Did I engage my mind in remembering Krishna?',
  'Did I use my words to glorify Krishna or encourage another devotee?',
  'Did I perform any service for Krishna?',
  'Did I help another devotee or living being?',
  'Did I control my senses instead of acting according to my desires?',
  'Did I offer my activities to Krishna?',
  'Did I follow the instructions of Srila Prabhupada and my spiritual authorities?',
] as const;

export const journalPrompts = [
  'What did I learn from Srimad Bhagavatam?',
  'What did I learn from Bhagavad-gītā?',
  'What did I understand from Srila Prabhupada’s lecture?',
  'Which instruction touched my heart today?',
  'What did I realise about Krishna consciousness?',
] as const;

export type TempleEventType =
  | 'visit'
  | 'service'
  | 'contribution'
  | 'bhagavatam_sets'
  | 'gita_books'
  | 'other_books';

export interface TempleEventMeta {
  key: TempleEventType;
  label: string;
  unit: string;
  pluralUnit: string;
  allowDecimals: boolean;
}

export const templeEventTypes: TempleEventMeta[] = [
  { key: 'visit', label: 'Temple visit', unit: 'visit', pluralUnit: 'visits', allowDecimals: false },
  { key: 'service', label: 'Temple service (hours)', unit: 'hr', pluralUnit: 'hrs', allowDecimals: true },
  { key: 'contribution', label: 'Contribution (INR)', unit: 'INR', pluralUnit: 'INR', allowDecimals: true },
  { key: 'bhagavatam_sets', label: 'Bhāgavatam sets distributed', unit: 'set', pluralUnit: 'sets', allowDecimals: false },
  { key: 'gita_books', label: 'Bhagavad-gītā books distributed', unit: 'book', pluralUnit: 'books', allowDecimals: false },
  { key: 'other_books', label: 'Other books distributed', unit: 'book', pluralUnit: 'books', allowDecimals: false },
];

export const templeEventMetaMap: Record<string, TempleEventMeta> = Object.fromEntries(
  templeEventTypes.map((t) => [t.key, t])
);

export function formatEventQuantity(eventType: string, quantity: number, currency = 'INR'): string {
  const meta = templeEventMetaMap[eventType];
  if (!meta) return String(quantity);
  if (eventType === 'contribution') {
    return `${Number(quantity).toLocaleString('en-IN', { maximumFractionDigits: 2 })} ${currency || 'INR'}`;
  }
  const unit = Number(quantity) === 1 ? meta.unit : meta.pluralUnit;
  return `${Number(quantity)} ${unit}`;
}

export interface GoalDefinition {
  key: string;
  label: string;
  period: 'daily' | 'monthly';
  unit: string;
  defaultTarget: number | null;
  max: number;
}

export const goalDefinitions: GoalDefinition[] = [
  { key: 'japa_rounds', label: 'Daily Japa rounds', period: 'daily', unit: 'rounds', defaultTarget: 16, max: 1000 },
  { key: 'book_minutes', label: 'Daily book reading', period: 'daily', unit: 'minutes', defaultTarget: null, max: 1440 },
  { key: 'lecture_minutes', label: 'Daily lecture hearing', period: 'daily', unit: 'minutes', defaultTarget: null, max: 1440 },
  { key: 'monthly_service', label: 'Monthly temple service', period: 'monthly', unit: 'hours', defaultTarget: null, max: 1000 },
  { key: 'monthly_gita_books', label: 'Monthly Bhagavad-gītā distribution', period: 'monthly', unit: 'books', defaultTarget: null, max: 10000 },
  { key: 'monthly_bhagavatam_sets', label: 'Monthly Bhāgavatam sets', period: 'monthly', unit: 'sets', defaultTarget: null, max: 1000 },
];
