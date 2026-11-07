import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  format,
  addDays,
  addMonths,
  startOfMonth,
  endOfMonth,
  getDaysInMonth,
  getDay,
} from 'date-fns';
import {
  BookOpen,
  Heart,
  Home,
  Landmark,
  BarChart3,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Save,
  Plus,
  Trash2,
  Pencil,
  X,
  Flower2,
  NotebookPen,
  HandHeart,
  Target,
  ChevronDown,
  ChevronUp,
  Clock,
  Send,
} from 'lucide-react';
import {
  db,
  configured,
  dateKey,
  dailyActivities,
  journalPrompts,
  templeEventTypes,
  templeEventMetaMap,
  formatEventQuantity,
  goalDefinitions,
  type TempleEventType,
} from './lib';

type Tab = 'home' | 'daily' | 'journal' | 'reflection' | 'temple' | 'reports';

export interface ReflectionPost {
  id: string;
  entry_date: string;
  content: string;
  tag: string;
  created_at: string;
  updated_at?: string;
}

interface ReflectionRow {
  id?: string;
  entry_date: string;
  answers?: Record<string, unknown> | null;
  pleasure?: string | null;
  sense_gratification?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

const reflectionTags = ['Gratitude', 'Remembrance', 'Prayer', 'Realization', 'Seva'] as const;

function extractPostsFromReflectionRows(rows: ReflectionRow[]): ReflectionPost[] {
  const posts: ReflectionPost[] = [];

  for (const row of rows) {
    const ans = row.answers && typeof row.answers === 'object' ? row.answers : {};
    const rawPosts = (ans as { posts?: unknown }).posts;

    if (Array.isArray(rawPosts) && rawPosts.length > 0) {
      for (const item of rawPosts) {
        if (item && typeof item === 'object' && typeof (item as { content?: unknown }).content === 'string') {
          const p = item as Partial<ReflectionPost>;
          const trimmed = p.content?.trim() || '';
          if (trimmed) {
            posts.push({
              id: p.id || `${row.entry_date}_${ posts.length }`,
              entry_date: p.entry_date || row.entry_date,
              content: trimmed,
              tag: typeof p.tag === 'string' ? p.tag : 'Remembrance',
              created_at: p.created_at || row.created_at || `${row.entry_date}T20:00:00.000Z`,
              updated_at: p.updated_at,
            });
          }
        }
      }
      continue;
    }

    // Legacy reflection row compatibility so no previous reflection is ever hidden
    const legacyParts: string[] = [];
    if (typeof row.pleasure === 'string' && row.pleasure.trim()) {
      legacyParts.push(row.pleasure.trim());
    }
    if (typeof row.sense_gratification === 'string' && row.sense_gratification.trim()) {
      legacyParts.push(row.sense_gratification.trim());
    }
    for (const [k, v] of Object.entries(ans)) {
      if (k.startsWith('comment_') && typeof v === 'string' && v.trim()) {
        legacyParts.push(v.trim());
      }
    }

    if (legacyParts.length > 0) {
      posts.push({
        id: `legacy_${row.entry_date}`,
        entry_date: row.entry_date,
        content: legacyParts.join('\n\n'),
        tag: 'Remembrance',
        created_at: row.created_at || `${row.entry_date}T20:00:00.000Z`,
        updated_at: row.updated_at || undefined,
      });
    }
  }

  return posts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

function formatPostDateTime(isoString: string, fallbackDate: string): string {
  const parsed = new Date(isoString);
  if (!Number.isNaN(parsed.getTime())) {
    return format(parsed, 'd MMM yyyy • h:mm a');
  }
  const fallback = new Date(fallbackDate + 'T12:00:00');
  return !Number.isNaN(fallback.getTime()) ? format(fallback, 'd MMM yyyy') : fallbackDate;
}

type Daily = {
  japa_rounds: number | null;
  book_minutes: number | null;
  book_pages: number | null;
  lecture_minutes: number | null;
  other_service: string;
};

interface TempleEventRow {
  id: string;
  user_id: string;
  event_date: string;
  event_type: TempleEventType;
  quantity: number;
  currency: string;
  temple_name: string | null;
  description: string | null;
}

interface MonthlyReportData {
  days: number;
  japa: number;
  japaDays: number;
  reading: number;
  pages: number;
  hearing: number;
  arati: number;
  aratiPartial: number;
  classes: number;
  classesPartial: number;
  gita_reading: number;
  journal: number;
  realizations_count: number;
  reflection: number;
  other_service_days: number;
  other_service_notes: { date: string; text: string }[];
  visit: number;
  service: number;
  contribution: number;
  bhagavatam_sets: number;
  gita_books: number;
  other_books: number;
  japaByDate: Record<string, number | null>;
  sadhanaDates: Record<string, boolean>;
  innerDates: Record<string, boolean>;
}

const emptyDaily: Daily = {
  japa_rounds: null,
  book_minutes: null,
  book_pages: null,
  lecture_minutes: null,
  other_service: '',
};

const emptyMonthlyReport: MonthlyReportData = {
  days: 0,
  japa: 0,
  japaDays: 0,
  reading: 0,
  pages: 0,
  hearing: 0,
  arati: 0,
  aratiPartial: 0,
  classes: 0,
  classesPartial: 0,
  gita_reading: 0,
  journal: 0,
  realizations_count: 0,
  reflection: 0,
  other_service_days: 0,
  other_service_notes: [],
  visit: 0,
  service: 0,
  contribution: 0,
  bhagavatam_sets: 0,
  gita_books: 0,
  other_books: 0,
  japaByDate: {},
  sadhanaDates: {},
  innerDates: {},
};

const romanNumerals = ['I', 'II', 'III', 'IV', 'V'];
const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const navTabs: { id: Tab; label: string; Icon: typeof Home }[] = [
  { id: 'home', label: 'Darshan', Icon: Home },
  { id: 'daily', label: 'Sādhana', Icon: Flower2 },
  { id: 'journal', label: 'Journal', Icon: BookOpen },
  { id: 'temple', label: 'Seva', Icon: Landmark },
  { id: 'reports', label: 'Offerings', Icon: BarChart3 },
  { id: 'reflection', label: 'Reflect', Icon: Heart },
];

/* Bespoke Indian Heritage SVG Motifs (No emojis or generic clip art) */
function LotusMotif({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 5C13.2 10.2 12.2 15.2 16 22C19.8 15.2 18.8 10.2 16 5Z" />
      <path d="M16 22C11.5 20.5 7.5 16.5 6.5 11.5C10.5 12 13.2 14.8 16 22Z" />
      <path d="M16 22C20.5 20.5 24.5 16.5 25.5 11.5C21.5 12 18.8 14.8 16 22Z" />
      <path d="M8 24.5C11.5 26 20.5 26 24 24.5" />
    </svg>
  );
}

function JapaMalaMotif({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <circle cx="14" cy="4.5" r="2" />
      <path d="M14 1.5V2.5" strokeLinecap="round" />
      <circle cx="20.5" cy="6.8" r="1.6" />
      <circle cx="23.2" cy="13" r="1.6" />
      <circle cx="21.2" cy="19.5" r="1.6" />
      <circle cx="16.5" cy="23.2" r="1.6" />
      <circle cx="11.5" cy="23.2" r="1.6" />
      <circle cx="6.8" cy="19.5" r="1.6" />
      <circle cx="4.8" cy="13" r="1.6" />
      <circle cx="7.5" cy="6.8" r="1.6" />
    </svg>
  );
}

function TulsiSprigMotif({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 17V5" />
      <path d="M10 4C8.2 5.8 8.2 8.2 10 10C11.8 8.2 11.8 5.8 10 4Z" />
      <path d="M10 11C7.2 9.5 4.8 10.2 4 12.5C6.2 13.5 8.5 13 10 11Z" />
      <path d="M10 11C12.8 9.5 15.2 10.2 16 12.5C13.8 13.5 11.5 13 10 11Z" />
    </svg>
  );
}

function OrnamentRule() {
  return (
    <svg width="16" height="8" viewBox="0 0 16 8" fill="none" aria-hidden="true">
      <path d="M1 4H11" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.65" />
      <path d="M13 2L15 4L13 6L11 4L13 2Z" fill="currentColor" opacity="0.85" />
    </svg>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  min = 0,
  max,
}: {
  label: string;
  hint?: string;
  value: number | null;
  onChange: (n: number | null) => void;
  min?: number;
  max?: number;
}) {
  return (
    <label className="field">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
        <span>{label}</span>
        {hint && <small className="muted" style={{ fontSize: 12 }}>{hint}</small>}
      </div>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step="1"
        value={value ?? ''}
        placeholder="Not recorded"
        onChange={(e) => {
          const raw = e.target.value.trim();
          if (raw === '') {
            onChange(null);
            return;
          }
          const num = Number(raw);
          if (!Number.isNaN(num)) {
            onChange(num);
          }
        }}
      />
    </label>
  );
}

function Auth() {
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!db) return;
    setBusy(true);
    setMessage('');

    if (mode === 'signin') {
      const { error } = await db.auth.signInWithPassword({ email: email.trim(), password });
      setMessage(error ? error.message : 'Signed in');
    } else if (mode === 'signup') {
      const { data, error } = await db.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) {
        setMessage(error.message);
      } else if (data.session) {
        setMessage('Account created and signed in.');
      } else {
        setMessage('Account created. Please check your email inbox to confirm your account, then return here to sign in.');
        setMode('signin');
      }
    } else {
      const { error } = await db.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });
      setMessage(error ? error.message : 'Password reset link sent to your email.');
    }

    setBusy(false);
  }

  return (
    <main className="auth">
      <div className="auth-card">
        <div className="motif-mark">
          <LotusMotif size={36} />
        </div>
        <h1>My Krishna Journey</h1>
        <p className="muted" style={{ margin: '4px 0 0' }}>
          A personal offering to Sri Sri Radha Krishna.
        </p>

        <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signin'}
            className={mode === 'signin' ? 'active' : ''}
            onClick={() => {
              setMode('signin');
              setMessage('');
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            className={mode === 'signup' ? 'active' : ''}
            onClick={() => {
              setMode('signup');
              setMessage('');
            }}
          >
            First-time Setup
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="devotee@example.com"
            />
          </label>
          {mode !== 'reset' && (
            <label>
              Password
              <input
                type="password"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </label>
          )}
          <button type="submit" className="primary-btn" disabled={busy}>
            {busy
              ? 'Please wait…'
              : mode === 'signin'
              ? 'Enter Sanctuary'
              : mode === 'signup'
              ? 'Create Sanctuary Account'
              : 'Send Reset Link'}
          </button>
        </form>

        {message && (
          <p role="status" className="notice" style={{ textAlign: 'left', margin: '12px 0' }}>
            <span>{message}</span>
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
          {mode === 'signin' ? (
            <button
              type="button"
              onClick={() => {
                setMode('reset');
                setMessage('');
              }}
              style={{ background: 'transparent', color: '#48283F', minHeight: 32, padding: 4, fontSize: 13 }}
            >
              Forgot password?
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setMessage('');
              }}
              style={{ background: 'transparent', color: '#48283F', minHeight: 32, padding: 4, fontSize: 13 }}
            >
              Back to Sign in
            </button>
          )}
          <small className="muted" style={{ fontSize: 12 }}>
            Access is private and limited to the approved devotee account.
          </small>
        </div>
      </div>
    </main>
  );
}

export default function App() {
  const todayStr = dateKey(new Date());
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [memberLoading, setMemberLoading] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [schemaMissing, setSchemaMissing] = useState(false);

  const [tab, setTab] = useState<Tab>('home');
  const [date, setDate] = useState(todayStr);

  // Daily offerings state
  const [daily, setDaily] = useState<Daily>(emptyDaily);
  const [activities, setActivities] = useState<Record<string, string>>({});
  const [journal, setJournal] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);

  // Reflection Feed (X / Facebook status post timeline) state
  const [reflectionPosts, setReflectionPosts] = useState<ReflectionPost[]>([]);
  const [postContent, setPostContent] = useState('');
  const [postTag, setPostTag] = useState<string>('Gratitude');
  const [editingPost, setEditingPost] = useState<ReflectionPost | null>(null);
  const [postingReflection, setPostingReflection] = useState(false);

  // Temple & Seva state
  const [events, setEvents] = useState<TempleEventRow[]>([]);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventType, setEventType] = useState<TempleEventType>('visit');
  const [quantityInput, setQuantityInput] = useState('1');
  const [templeName, setTempleName] = useState('');
  const [description, setDescription] = useState('');

  // Goals (Personal Intentions) state
  const [goals, setGoals] = useState<Record<string, number | null>>({});
  const [showGoalsEditor, setShowGoalsEditor] = useState(false);
  const [savingGoals, setSavingGoals] = useState(false);

  // Status & loading state
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  // Monthly Offerings Report & Monthly Remembrance state
  const [report, setReport] = useState<MonthlyReportData>(emptyMonthlyReport);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [month, setMonth] = useState(dateKey(startOfMonth(new Date())).slice(0, 7));
  const [remembrance, setRemembrance] = useState('');
  const [savingRemembrance, setSavingRemembrance] = useState(false);

  function switchTab(nextTab: Tab) {
    setNotice('');
    setTab(nextTab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function changeDate(nextDate: string) {
    if (!nextDate || nextDate === date) return;
    if (isDirty && !window.confirm('You have unsaved changes for this date. Leave without saving?')) {
      return;
    }
    setIsDirty(false);
    setNotice('');
    setDate(nextDate);
  }

  // 1. Initialize Auth Session
  useEffect(() => {
    if (!db) {
      setAuthLoading(false);
      return;
    }
    db.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const {
      data: { subscription },
    } = db.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => subscription.unsubscribe();
  }, []);

  // 2. Check / Claim App Membership & Load Goals
  useEffect(() => {
    if (!db || !session) {
      setAllowed(false);
      setMemberLoading(false);
      return;
    }
    let cancelled = false;
    setMemberLoading(true);
    setSchemaMissing(false);

    async function verifyMembershipAndGoals() {
      if (!db || !session) return;
      const rpcRes = await db.rpc('ensure_app_member');
      let isMember = false;

      if (!rpcRes.error && typeof rpcRes.data === 'boolean') {
        isMember = rpcRes.data;
      } else {
        const { data, error } = await db
          .from('app_members')
          .select('user_id')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (error) {
          if (
            error.code === '42P01' ||
            error.code === 'PGRST205' ||
            error.message?.includes('schema cache') ||
            error.message?.includes('does not exist')
          ) {
            if (!cancelled) setSchemaMissing(true);
          }
        }
        isMember = Boolean(data);
      }

      if (cancelled) return;
      setAllowed(isMember);
      setMemberLoading(false);

      if (isMember) {
        const { data: goalsData } = await db.from('goals').select('goal_key, target');
        if (!cancelled && goalsData) {
          const loadedGoals: Record<string, number | null> = {};
          for (const g of goalsData) {
            loadedGoals[g.goal_key] = Number(g.target);
          }
          setGoals(loadedGoals);
        }
      }
    }

    verifyMembershipAndGoals();
    return () => {
      cancelled = true;
    };
  }, [session]);

  // 3. Load Records for Selected Date & Reflection Timeline Feed
  useEffect(() => {
    if (!db || !session || !allowed) return;
    let cancelled = false;
    setLoading(true);

    Promise.all([
      db.from('daily_records').select('*').eq('entry_date', date).maybeSingle(),
      db.from('activity_entries').select('*').eq('entry_date', date),
      db.from('journal_entries').select('*').eq('entry_date', date).maybeSingle(),
      db.from('reflections').select('*').order('entry_date', { ascending: false }).limit(100),
      db.from('temple_events').select('*').eq('event_date', date).order('created_at', { ascending: false }),
    ]).then(([d, a, j, r, t]) => {
      if (cancelled) return;
      const err = [d.error, a.error, j.error, r.error, t.error].find(Boolean);
      if (err) {
        setNotice(err.message);
        setLoading(false);
        return;
      }
      setDaily(
        d.data
          ? {
              japa_rounds: d.data.japa_rounds,
              book_minutes: d.data.book_minutes,
              book_pages: d.data.book_pages,
              lecture_minutes: d.data.lecture_minutes,
              other_service: d.data.other_service || '',
            }
          : { ...emptyDaily }
      );
      setActivities(Object.fromEntries((a.data || []).map((x) => [x.activity_key, x.status])));
      setJournal((j.data?.answers as Record<string, string>) || {});
      setReflectionPosts(extractPostsFromReflectionRows((r.data as ReflectionRow[]) || []));
      setEvents((t.data as TempleEventRow[]) || []);
      setEditingEventId(null);
      setIsDirty(false);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [session, allowed, date]);

  // 4. Save Daily Offering / Journal
  async function save(successMessage = 'Offering saved with gratitude.') {
    if (!db || !session) return;
    const ints = [daily.japa_rounds, daily.book_minutes, daily.book_pages, daily.lecture_minutes];
    if (ints.some((x) => x !== null && (!Number.isSafeInteger(x) || x < 0))) {
      setNotice('Please enter valid non-negative whole numbers.');
      return;
    }
    if (daily.japa_rounds !== null && daily.japa_rounds > 1000) {
      setNotice('Japa rounds must be 1000 or fewer.');
      return;
    }

    setBusy(true);
    setNotice('');

    const uid = session.user.id;
    const queries: PromiseLike<{ error: { message: string } | null }>[] = [];

    const hasDaily =
      daily.japa_rounds !== null ||
      daily.book_minutes !== null ||
      daily.book_pages !== null ||
      daily.lecture_minutes !== null ||
      daily.other_service.trim() !== '';

    if (hasDaily) {
      queries.push(
        db.from('daily_records').upsert(
          { user_id: uid, entry_date: date, ...daily },
          { onConflict: 'user_id,entry_date' }
        )
      );
    } else {
      queries.push(db.from('daily_records').delete().eq('user_id', uid).eq('entry_date', date));
    }

    const hasJournal = Object.values(journal).some((v) => String(v || '').trim() !== '');
    if (hasJournal) {
      queries.push(
        db.from('journal_entries').upsert(
          { user_id: uid, entry_date: date, answers: journal },
          { onConflict: 'user_id,entry_date' }
        )
      );
    } else {
      queries.push(db.from('journal_entries').delete().eq('user_id', uid).eq('entry_date', date));
    }

    for (const act of dailyActivities) {
      const status = activities[act];
      if (status) {
        queries.push(
          db.from('activity_entries').upsert(
            { user_id: uid, entry_date: date, activity_key: act, status },
            { onConflict: 'user_id,entry_date,activity_key' }
          )
        );
      } else {
        queries.push(
          db
            .from('activity_entries')
            .delete()
            .eq('user_id', uid)
            .eq('entry_date', date)
            .eq('activity_key', act)
        );
      }
    }

    const results = await Promise.all(queries);
    const failures = results.filter((x) => x.error).map((x) => x.error!.message);
    if (!failures.length) {
      setIsDirty(false);
    }
    setNotice(failures.length ? 'Some records could not be saved: ' + failures.join('; ') : successMessage);
    setBusy(false);
  }

  // 4b. Publish, Edit, or Delete a Reflection Status Post
  async function submitReflectionPost() {
    if (!db || !session) return;
    const trimmed = postContent.trim();
    if (!trimmed) {
      setNotice('Please write your reflection before posting.');
      return;
    }

    setPostingReflection(true);
    setNotice('');
    const uid = session.user.id;
    const nowIso = new Date().toISOString();
    const targetDate = editingPost ? editingPost.entry_date : dateKey(new Date());

    const existingForDate = reflectionPosts.filter((p) => p.entry_date === targetDate);
    let updatedPostsForDate: ReflectionPost[];
    let nextAllPosts: ReflectionPost[];

    if (editingPost) {
      const updatedPost: ReflectionPost = {
        ...editingPost,
        content: trimmed,
        tag: postTag,
        updated_at: nowIso,
      };
      updatedPostsForDate = existingForDate.map((p) => (p.id === editingPost.id ? updatedPost : p));
      nextAllPosts = reflectionPosts.map((p) => (p.id === editingPost.id ? updatedPost : p));
    } else {
      const newPost: ReflectionPost = {
        id:
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `post_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        entry_date: targetDate,
        content: trimmed,
        tag: postTag,
        created_at: nowIso,
      };
      updatedPostsForDate = [newPost, ...existingForDate];
      nextAllPosts = [newPost, ...reflectionPosts];
    }

    const { error } = await db.from('reflections').upsert(
      {
        user_id: uid,
        entry_date: targetDate,
        answers: { posts: updatedPostsForDate },
        pleasure: updatedPostsForDate.map((p) => p.content).join('\n\n'),
        sense_gratification: '',
      },
      { onConflict: 'user_id,entry_date' }
    );

    if (error) {
      setNotice('Could not publish reflection: ' + error.message);
    } else {
      setReflectionPosts(nextAllPosts);
      setPostContent('');
      setEditingPost(null);
      setNotice(editingPost ? 'Reflection post updated.' : 'Reflection posted to your sanctuary feed.');
    }
    setPostingReflection(false);
  }

  function startEditReflectionPost(post: ReflectionPost) {
    setEditingPost(post);
    setPostContent(post.content);
    setPostTag(post.tag || 'Gratitude');
    setNotice('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEditReflectionPost() {
    setEditingPost(null);
    setPostContent('');
    setPostTag('Gratitude');
    setNotice('');
  }

  async function deleteReflectionPost(target: ReflectionPost) {
    if (!db || !session || !window.confirm('Delete this reflection post?')) return;
    setPostingReflection(true);
    setNotice('');
    const uid = session.user.id;
    const remainingForDate = reflectionPosts.filter(
      (p) => p.entry_date === target.entry_date && p.id !== target.id
    );

    let err: { message: string } | null = null;
    if (remainingForDate.length > 0) {
      const res = await db.from('reflections').upsert(
        {
          user_id: uid,
          entry_date: target.entry_date,
          answers: { posts: remainingForDate },
          pleasure: remainingForDate.map((p) => p.content).join('\n\n'),
          sense_gratification: '',
        },
        { onConflict: 'user_id,entry_date' }
      );
      err = res.error;
    } else {
      const res = await db
        .from('reflections')
        .delete()
        .eq('user_id', uid)
        .eq('entry_date', target.entry_date);
      err = res.error;
    }

    if (err) {
      setNotice('Could not delete post: ' + err.message);
    } else {
      setReflectionPosts((prev) => prev.filter((p) => p.id !== target.id));
      if (editingPost?.id === target.id) {
        cancelEditReflectionPost();
      }
      setNotice('Reflection post removed.');
    }
    setPostingReflection(false);
  }

  // 5. Save Personal Intentions (Goals)
  async function saveGoals() {
    if (!db || !session) return;
    for (const def of goalDefinitions) {
      const val = goals[def.key];
      if (val !== undefined && val !== null) {
        if (!Number.isFinite(val) || val < 0 || val > def.max) {
          setNotice(`Please enter a valid target between 0 and ${def.max} for ${def.label}.`);
          return;
        }
      }
    }

    setSavingGoals(true);
    setNotice('');
    const uid = session.user.id;
    const ops: PromiseLike<{ error: { message: string } | null }>[] = [];

    for (const def of goalDefinitions) {
      const val = goals[def.key];
      if (val !== undefined && val !== null && val > 0) {
        ops.push(
          db.from('goals').upsert(
            { user_id: uid, goal_key: def.key, target: val },
            { onConflict: 'user_id,goal_key' }
          )
        );
      } else {
        ops.push(db.from('goals').delete().eq('user_id', uid).eq('goal_key', def.key));
      }
    }

    const res = await Promise.all(ops);
    const err = res.find((r) => r.error)?.error;
    if (err) {
      setNotice(err.message);
    } else {
      setNotice('Personal intentions saved.');
      setShowGoalsEditor(false);
    }
    setSavingGoals(false);
  }

  // 6. Add or Update Temple & Seva Event
  async function saveTempleEvent() {
    if (!db || !session) return;
    const meta = templeEventMetaMap[eventType];
    const parsedQty = Number(quantityInput);

    if (
      quantityInput.trim() === '' ||
      !Number.isFinite(parsedQty) ||
      parsedQty <= 0 ||
      !Number.isInteger(Math.round(parsedQty * 100))
    ) {
      setNotice('Please enter a positive quantity.');
      return;
    }

    if (!meta?.allowDecimals && !Number.isInteger(parsedQty)) {
      setNotice(`${meta?.label || 'This activity'} requires a whole number.`);
      return;
    }

    setBusy(true);
    setNotice('');

    if (editingEventId) {
      const { data, error } = await db
        .from('temple_events')
        .update({
          event_type: eventType,
          quantity: parsedQty,
          temple_name: templeName.trim() || null,
          description: description.trim() || null,
        })
        .eq('id', editingEventId)
        .eq('user_id', session.user.id)
        .select()
        .single();

      if (error) {
        setNotice(error.message);
      } else if (data) {
        setEvents((prev) => prev.map((ev) => (ev.id === editingEventId ? (data as TempleEventRow) : ev)));
        resetEventForm();
        setNotice('Temple record updated.');
      }
    } else {
      const { data, error } = await db
        .from('temple_events')
        .insert({
          user_id: session.user.id,
          event_date: date,
          event_type: eventType,
          quantity: parsedQty,
          temple_name: templeName.trim() || null,
          description: description.trim() || null,
        })
        .select()
        .single();

      if (error) {
        setNotice(error.message);
      } else if (data) {
        setEvents((prev) => [data as TempleEventRow, ...prev]);
        resetEventForm();
        setNotice('Temple record added.');
      }
    }

    setBusy(false);
  }

  function startEditEvent(ev: TempleEventRow) {
    setEditingEventId(ev.id);
    setEventType(ev.event_type);
    setQuantityInput(String(ev.quantity));
    setTempleName(ev.temple_name || '');
    setDescription(ev.description || '');
    setNotice('');
  }

  function resetEventForm() {
    setEditingEventId(null);
    setEventType('visit');
    setQuantityInput('1');
    setTempleName('');
    setDescription('');
  }

  async function deleteEvent(id: string) {
    if (!db || !session || !window.confirm('Delete this temple record?')) return;
    const { error } = await db.from('temple_events').delete().eq('id', id).eq('user_id', session.user.id);
    if (error) {
      setNotice(error.message);
    } else {
      setEvents((prev) => prev.filter((e) => e.id !== id));
      if (editingEventId === id) resetEventForm();
      setNotice('Temple record removed.');
    }
  }

  // 7. Load Monthly Offerings Report & Monthly Remembrance
  useEffect(() => {
    if (tab !== 'reports' || !db || !session || !allowed) return;
    let cancelled = false;
    setReportsLoading(true);
    const from = month + '-01';
    const to = dateKey(endOfMonth(new Date(from + 'T12:00:00')));

    Promise.all([
      db
        .from('daily_records')
        .select('japa_rounds,book_minutes,book_pages,lecture_minutes,other_service,entry_date')
        .gte('entry_date', from)
        .lte('entry_date', to)
        .order('entry_date', { ascending: true }),
      db
        .from('activity_entries')
        .select('activity_key,status,entry_date')
        .gte('entry_date', from)
        .lte('entry_date', to),
      db
        .from('temple_events')
        .select('event_type,quantity,event_date')
        .gte('event_date', from)
        .lte('event_date', to),
      db
        .from('journal_entries')
        .select('answers,entry_date')
        .gte('entry_date', from)
        .lte('entry_date', to),
      db
        .from('reflections')
        .select('answers,pleasure,sense_gratification,entry_date')
        .gte('entry_date', from)
        .lte('entry_date', to),
      db
        .from('monthly_remembrances')
        .select('content')
        .eq('month_key', month)
        .maybeSingle(),
    ]).then(([d, a, t, j, r, rem]) => {
      if (cancelled) return;
      setReportsLoading(false);
      const err = [d.error, a.error, t.error, j.error, r.error].find(Boolean);
      if (err) {
        setNotice(err.message);
        return;
      }

      const activeOfferingsDates = new Set<string>();
      const sadhanaDates: Record<string, boolean> = {};
      const innerDates: Record<string, boolean> = {};
      const japaByDate: Record<string, number | null> = {};
      const otherServiceNotes: { date: string; text: string }[] = [];

      let japaTotal = 0;
      let japaDaysCount = 0;
      let readingTotal = 0;
      let pagesTotal = 0;
      let hearingTotal = 0;

      for (const row of d.data || []) {
        const hasSadhanaField =
          row.japa_rounds !== null ||
          row.book_minutes !== null ||
          row.book_pages !== null ||
          row.lecture_minutes !== null ||
          Boolean(row.other_service?.trim());

        if (hasSadhanaField) {
          activeOfferingsDates.add(row.entry_date);
          sadhanaDates[row.entry_date] = true;
        }
        if (row.japa_rounds !== null) {
          japaByDate[row.entry_date] = row.japa_rounds;
          japaTotal += row.japa_rounds;
          japaDaysCount += 1;
        }
        readingTotal += row.book_minutes || 0;
        pagesTotal += row.book_pages || 0;
        hearingTotal += row.lecture_minutes || 0;
        if (row.other_service?.trim()) {
          otherServiceNotes.push({ date: row.entry_date, text: row.other_service.trim() });
        }
      }

      for (const act of a.data || []) {
        if (act.status) {
          activeOfferingsDates.add(act.entry_date);
          sadhanaDates[act.entry_date] = true;
        }
      }

      let journalDays = 0;
      let realizationsCount = 0;
      let fallbackRemembrance = '';

      for (const jRow of j.data || []) {
        const ans = (jRow.answers as Record<string, string>) || {};
        if (jRow.entry_date === from && typeof ans.__monthly_remembrance === 'string') {
          fallbackRemembrance = ans.__monthly_remembrance;
        }
        const promptKeys = ['0', '1', '2', '3', '4'];
        const nonEmptyCount = promptKeys.filter((k) => String(ans[k] || '').trim() !== '').length;
        if (nonEmptyCount > 0) {
          journalDays += 1;
          realizationsCount += nonEmptyCount;
          activeOfferingsDates.add(jRow.entry_date);
          innerDates[jRow.entry_date] = true;
        }
      }

      let reflectionDays = 0;
      for (const rRow of r.data || []) {
        const ans = (rRow.answers as Record<string, unknown>) || {};
        const postsArr = Array.isArray((ans as { posts?: unknown }).posts)
          ? (ans as { posts: unknown[] }).posts
          : [];
        const hasRefl =
          postsArr.length > 0 ||
          Object.values(ans).some((v) => typeof v === 'string' && v.trim() !== '') ||
          Boolean(rRow.pleasure?.trim()) ||
          Boolean(rRow.sense_gratification?.trim());
        if (hasRefl) {
          reflectionDays += 1;
          activeOfferingsDates.add(rRow.entry_date);
          innerDates[rRow.entry_date] = true;
        }
      }

      const eventTotals: Record<string, number> = {
        visit: 0,
        service: 0,
        contribution: 0,
        bhagavatam_sets: 0,
        gita_books: 0,
        other_books: 0,
      };

      for (const ev of t.data || []) {
        eventTotals[ev.event_type] =
          Math.round(((eventTotals[ev.event_type] || 0) + Number(ev.quantity)) * 100) / 100;
        if (ev.event_date) {
          activeOfferingsDates.add(ev.event_date);
          innerDates[ev.event_date] = true;
        }
      }

      setReport({
        days: activeOfferingsDates.size,
        japa: japaTotal,
        japaDays: japaDaysCount,
        reading: readingTotal,
        pages: pagesTotal,
        hearing: hearingTotal,
        arati: (a.data || []).filter((x) => x.activity_key === 'Maṅgala Ārati' && x.status === 'yes').length,
        aratiPartial: (a.data || []).filter((x) => x.activity_key === 'Maṅgala Ārati' && x.status === 'partial').length,
        classes: (a.data || []).filter((x) => x.activity_key.startsWith('Bhāgavatam Class') && x.status === 'yes')
          .length,
        classesPartial: (a.data || []).filter(
          (x) => x.activity_key.startsWith('Bhāgavatam Class') && x.status === 'partial'
        ).length,
        gita_reading: (a.data || []).filter(
          (x) => x.activity_key === 'Bhagavad-gītā Reading' && (x.status === 'yes' || x.status === 'partial')
        ).length,
        journal: journalDays,
        realizations_count: realizationsCount,
        reflection: reflectionDays,
        other_service_days: otherServiceNotes.length,
        other_service_notes: otherServiceNotes,
        visit: eventTotals.visit,
        service: eventTotals.service,
        contribution: eventTotals.contribution,
        bhagavatam_sets: eventTotals.bhagavatam_sets,
        gita_books: eventTotals.gita_books,
        other_books: eventTotals.other_books,
        japaByDate,
        sadhanaDates,
        innerDates,
      });

      if (!rem.error && rem.data) {
        setRemembrance(rem.data.content || '');
      } else {
        setRemembrance(fallbackRemembrance);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [tab, month, session, allowed]);

  // 8. Save Monthly Remembrance ("Looking Back with Gratitude")
  async function saveMonthlyRemembrance() {
    if (!db || !session) return;
    setSavingRemembrance(true);
    setNotice('');
    const uid = session.user.id;
    const trimmed = remembrance.trim();

    // Try dedicated monthly_remembrances table first
    const remRes = await db
      .from('monthly_remembrances')
      .upsert({ user_id: uid, month_key: month, content: trimmed }, { onConflict: 'user_id,month_key' });

    if (!remRes.error) {
      setNotice('Monthly remembrance saved with gratitude.');
      setSavingRemembrance(false);
      return;
    }

    // Safe fallback into journal_entries on YYYY-MM-01 so data is never lost even if migration 002 hasn't been run yet
    const firstDate = month + '-01';
    const existing = await db.from('journal_entries').select('answers').eq('entry_date', firstDate).maybeSingle();
    const currentAnswers = ((existing.data?.answers as Record<string, string>) || {});
    const updatedAnswers: Record<string, string> = {
      ...currentAnswers,
      __monthly_remembrance: trimmed,
    };

    const { error: fallbackErr } = await db
      .from('journal_entries')
      .upsert({ user_id: uid, entry_date: firstDate, answers: updatedAnswers }, { onConflict: 'user_id,entry_date' });

    if (fallbackErr) {
      setNotice(fallbackErr.message);
    } else {
      if (date === firstDate) {
        setJournal(updatedAnswers);
      }
      setNotice('Monthly remembrance saved with gratitude.');
    }
    setSavingRemembrance(false);
  }

  if (!configured) {
    return (
      <main className="auth">
        <div className="auth-card">
          <div className="motif-mark">
            <LotusMotif size={36} />
          </div>
          <h1>Configuration required</h1>
          <p>Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment before starting the app.</p>
        </div>
      </main>
    );
  }

  if (authLoading || memberLoading) {
    return (
      <main className="auth">
        <div className="auth-card">
          <div className="motif-mark">
            <LotusMotif size={36} />
          </div>
          <h2>Vrindavan Sanctuary</h2>
          <p className="muted">Entering your sacred space…</p>
        </div>
      </main>
    );
  }

  if (!session) {
    return <Auth />;
  }

  if (!allowed) {
    return (
      <main className="auth">
        <div className="auth-card">
          <div className="motif-mark">
            <LotusMotif size={36} />
          </div>
          <h1>{schemaMissing ? 'Database Setup Required' : 'Private Sanctuary'}</h1>
          {schemaMissing ? (
            <p>
              Your Supabase project is connected, but the database tables have not been created yet. Please run{' '}
              <code>supabase/migrations/001_initial.sql</code> in your Supabase SQL Editor, then click Retry below.
            </p>
          ) : (
            <>
              <p>
                This sanctuary is restricted to the approved devotee account. To approve this account (
                <code>{session.user.email}</code>), run the following in the Supabase SQL Editor:
              </p>
              <pre
                style={{
                  background: '#F3E5CB',
                  padding: 10,
                  borderRadius: 10,
                  fontSize: 11,
                  overflowX: 'auto',
                  textAlign: 'left',
                }}
              >
                {`insert into public.app_members(user_id)\nvalues ('${session.user.id}')\non conflict do nothing;`}
              </pre>
            </>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button className="secondary-btn" style={{ flex: 1 }} onClick={() => window.location.reload()}>
              Retry
            </button>
            <button style={{ flex: 1 }} onClick={() => db?.auth.signOut()}>
              Sign out
            </button>
          </div>
        </div>
      </main>
    );
  }

  const japaTarget = goals.japa_rounds || 16;
  const completedPracticesCount = dailyActivities.filter((a) => activities[a] === 'yes').length;
  const hasRealizationsToday = ['0', '1', '2', '3', '4'].some((k) => String(journal[k] || '').trim() !== '');
  const hasReflectionToday = reflectionPosts.some((p) => p.entry_date === date);

  function renderGoalsEditor() {
    return (
      <section className="card" style={{ borderColor: 'rgba(181, 139, 76, 0.5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h3 style={{ margin: 0 }}>Personal Intentions (Sankalpa)</h3>
          <button
            type="button"
            className="icon-button"
            aria-label="Close intentions editor"
            onClick={() => setShowGoalsEditor(false)}
          >
            <X size={18} />
          </button>
        </div>
        <p className="muted" style={{ marginTop: 0 }}>
          Set gentle personal intentions to guide your daily and monthly offerings. Leave blank if not needed.
        </p>
        {goalDefinitions.map((def) => (
          <Field
            key={def.key}
            label={`${def.label} (${def.unit})`}
            hint={def.defaultTarget ? `Default: ${def.defaultTarget}` : undefined}
            value={goals[def.key] ?? def.defaultTarget}
            max={def.max}
            onChange={(val) => setGoals((prev) => ({ ...prev, [def.key]: val }))}
          />
        ))}
        <button type="button" className="save" style={{ marginBottom: 4 }} disabled={savingGoals} onClick={saveGoals}>
          <Save size={18} /> {savingGoals ? 'Saving…' : 'Save Personal Intentions'}
        </button>
      </section>
    );
  }

  // Monthly calendar & Japa chart helpers
  const monthDateObj = new Date(month + '-01T12:00:00');
  const daysInSelectedMonth = getDaysInMonth(monthDateObj);
  const firstDayOffset = getDay(monthDateObj);
  const monthDayNumbers = Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1);
  const maxDailyJapa = Math.max(
    japaTarget,
    ...Object.values(report.japaByDate).map((v) => (typeof v === 'number' ? v : 0))
  );

  function shiftMonth(delta: number) {
    const next = addMonths(monthDateObj, delta);
    setMonth(dateKey(startOfMonth(next)).slice(0, 7));
    setNotice('');
  }

  return (
    <div className="app">
      <header>
        <div>
          <div className="header-ornament">
            <OrnamentRule />
            <span>A Personal Offering to Sri Krishna</span>
            <span style={{ transform: 'scaleX(-1)', display: 'inline-flex' }}>
              <OrnamentRule />
            </span>
          </div>
          <h1>My Krishna Journey</h1>
          <p>Vrindavan Sanctuary</p>
        </div>
        <button className="icon-button" title="Sign out" aria-label="Sign out" onClick={() => db?.auth.signOut()}>
          <LogOut size={18} />
        </button>
      </header>

      <main className="content">
        {tab !== 'reports' && tab !== 'reflection' && (
          <div className="date-row">
            <button
              type="button"
              aria-label="Previous day"
              onClick={() => changeDate(dateKey(addDays(new Date(date + 'T12:00:00'), -1)))}
            >
              <ChevronLeft size={18} />
            </button>
            <label>
              Devotional record date
              <input
                aria-label="Selected date"
                type="date"
                value={date}
                onChange={(e) => e.target.value && changeDate(e.target.value)}
              />
            </label>
            <button
              type="button"
              aria-label="Next day"
              onClick={() => changeDate(dateKey(addDays(new Date(date + 'T12:00:00'), 1)))}
            >
              <ChevronRight size={18} />
            </button>
            {date !== todayStr && (
              <button type="button" className="today-pill" onClick={() => changeDate(todayStr)}>
                Today
              </button>
            )}
          </div>
        )}

        {notice && (
          <div role="status" className="notice">
            <span>{notice}</span>
            <button type="button" aria-label="Dismiss notice" onClick={() => setNotice('')}>
              <X size={16} />
            </button>
          </div>
        )}

        {loading && tab !== 'reports' && (
          <p className="muted" style={{ textAlign: 'center', margin: '8px 0 14px' }}>
            Loading saved offerings…
          </p>
        )}

        {/* ==========================================
            1. DARSHAN HOME
           ========================================== */}
        {tab === 'home' && (
          <>
            <section className="darshan">
              <div className="darshan-top">
                <span className="eyebrow">ŚRĪ ŚRĪ RĀDHĀ KṚṢṆA</span>
                <h2>Hare Krishna</h2>
                <p>Welcome to your sacred space</p>
              </div>
              <img src="/radha-krishna-vrindavan.png" alt="Artistic illustration of Radha and Krishna in Vrindavan" />
              <div className="darshan-bottom">
                <div className="motif-mark">
                  <LotusMotif size={24} />
                </div>
                <h2>At Your Lotus Feet</h2>
                <p>May my thoughts, words and actions become a loving offering to You.</p>
              </div>
            </section>

            <div className="offering-intro">
              <span className="eyebrow">YOUR DAILY OFFERING</span>
              <h2>{format(new Date(date + 'T12:00:00'), 'EEEE, d MMMM')}</h2>
              <p>Every sincere effort is worth remembering.</p>
            </div>

            <div className="offering-grid">
              <button type="button" className="offering-tile" onClick={() => switchTab('daily')}>
                <Flower2 />
                <span className="tile-title">Today's Sādhana</span>
                <small>
                  {completedPracticesCount > 0
                    ? `${completedPracticesCount} of ${dailyActivities.length} practices offered`
                    : 'Record your practice'}
                </small>
              </button>

              <button type="button" className="offering-tile" onClick={() => switchTab('daily')}>
                <JapaMalaMotif size={24} />
                <span className="tile-title">Japa</span>
                <small>
                  {daily.japa_rounds === null ? 'Not recorded' : `${daily.japa_rounds} of ${japaTarget} rounds`}
                </small>
              </button>

              <button type="button" className="offering-tile" onClick={() => switchTab('journal')}>
                <NotebookPen />
                <span className="tile-title">Realizations</span>
                <small>{hasRealizationsToday ? 'Journal recorded' : 'Your private journal'}</small>
              </button>

              <button type="button" className="offering-tile" onClick={() => switchTab('reflection')}>
                <Heart />
                <span className="tile-title">Reflection</span>
                <small>
                  {hasReflectionToday
                    ? 'Reflection posted today'
                    : reflectionPosts.length > 0
                    ? `${reflectionPosts.length} reflection${reflectionPosts.length === 1 ? '' : 's'} in feed`
                    : 'Share a reflection'}
                </small>
              </button>
            </div>

            <button type="button" className="save offering-cta" onClick={() => switchTab('daily')}>
              <HandHeart size={19} /> Make Today's Offering
            </button>

            <div className="gentle-note">
              <TulsiSprigMotif size={16} />
              <span>No scores. No comparisons. Just your journey of remembrance and service.</span>
            </div>
          </>
        )}

        {/* ==========================================
            2. TODAY'S SĀDHANA
           ========================================== */}
        {tab === 'daily' && (
          <>
            <div className="section-heading">
              <div className="heading-motif">
                <Flower2 size={26} />
              </div>
              <span className="eyebrow">MY DAILY OFFERING</span>
              <h2>Today’s Sādhana</h2>
              <p>Each practice is a personal offering to Krishna.</p>
            </div>

            <p className="muted" style={{ marginTop: 0 }}>
              Select an offering status below, or tap an active choice again to leave it unrecorded.
            </p>

            {dailyActivities.map((a) => {
              const current = activities[a] || '';
              return (
                <div className="card practice-card" key={a}>
                  <div className="practice-header">
                    <strong>{a}</strong>
                    <small className="muted" style={{ fontSize: 11.5 }}>
                      {current === 'yes'
                        ? 'Completed'
                        : current === 'partial'
                        ? 'Partially'
                        : current === 'no'
                        ? 'Not completed'
                        : 'Not recorded'}
                    </small>
                  </div>
                  <div className="status-pills" role="group" aria-label={a}>
                    {(
                      [
                        { value: 'yes', label: 'Completed', activeClass: 'active-yes' },
                        { value: 'partial', label: 'Partially', activeClass: 'active-partial' },
                        { value: 'no', label: 'Not completed', activeClass: 'active-no' },
                      ] as const
                    ).map((opt) => {
                      const isActive = current === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          aria-pressed={isActive}
                          className={`status-pill ${isActive ? opt.activeClass : ''}`}
                          onClick={() => {
                            setIsDirty(true);
                            setActivities((prev) => ({
                              ...prev,
                              [a]: prev[a] === opt.value ? '' : opt.value,
                            }));
                          }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            <section className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h3 style={{ margin: 0 }}>Japa Meditation</h3>
                <small className="muted" style={{ fontSize: 12 }}>
                  Intention: {japaTarget} rounds
                </small>
              </div>
              <div className="japa-controls">
                <button
                  type="button"
                  className="step-btn"
                  aria-label="Decrease rounds by 1"
                  onClick={() => {
                    setIsDirty(true);
                    setDaily((x) => ({
                      ...x,
                      japa_rounds: x.japa_rounds === null || x.japa_rounds <= 0 ? 0 : x.japa_rounds - 1,
                    }));
                  }}
                >
                  −1
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  aria-label="Japa rounds completed"
                  min={0}
                  max={1000}
                  value={daily.japa_rounds ?? ''}
                  placeholder="Not recorded"
                  onChange={(e) => {
                    setIsDirty(true);
                    const raw = e.target.value.trim();
                    if (raw === '') {
                      setDaily((x) => ({ ...x, japa_rounds: null }));
                      return;
                    }
                    const num = Number(raw);
                    if (!Number.isNaN(num)) {
                      setDaily((x) => ({ ...x, japa_rounds: num }));
                    }
                  }}
                />
                <button
                  type="button"
                  className="step-btn"
                  aria-label="Increase rounds by 1"
                  onClick={() => {
                    setIsDirty(true);
                    setDaily((x) => ({
                      ...x,
                      japa_rounds: Math.min(1000, (x.japa_rounds ?? 0) + 1),
                    }));
                  }}
                >
                  +1
                </button>
                <button
                  type="button"
                  className="step-btn"
                  aria-label={`Set to ${japaTarget} rounds`}
                  onClick={() => {
                    setIsDirty(true);
                    setDaily((x) => ({ ...x, japa_rounds: japaTarget }));
                  }}
                >
                  {japaTarget}
                </button>
              </div>
              <div className="track">
                <div style={{ width: `${Math.min(100, ((daily.japa_rounds || 0) / Math.max(1, japaTarget)) * 100)}%` }} />
              </div>
              <div className="track-caption">
                <span>{daily.japa_rounds === null ? 'Not recorded yet' : `${daily.japa_rounds} rounds chanted`}</span>
                {daily.japa_rounds !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsDirty(true);
                      setDaily((x) => ({ ...x, japa_rounds: null }));
                    }}
                    style={{
                      background: 'transparent',
                      color: 'var(--muted-ink)',
                      minHeight: 24,
                      padding: '0 4px',
                      fontSize: 11.5,
                      textDecoration: 'underline',
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </section>

            <section className="card">
              <h3>Reading and Hearing</h3>
              <Field
                label="Book reading minutes"
                hint={goals.book_minutes ? `Intention: ${goals.book_minutes} min` : undefined}
                value={daily.book_minutes}
                onChange={(n) => {
                  setIsDirty(true);
                  setDaily((x) => ({ ...x, book_minutes: n }));
                }}
              />
              <Field
                label="Book reading pages"
                value={daily.book_pages}
                onChange={(n) => {
                  setIsDirty(true);
                  setDaily((x) => ({ ...x, book_pages: n }));
                }}
              />
              <Field
                label="Śrīla Prabhupāda lecture minutes"
                hint={goals.lecture_minutes ? `Intention: ${goals.lecture_minutes} min` : undefined}
                value={daily.lecture_minutes}
                onChange={(n) => {
                  setIsDirty(true);
                  setDaily((x) => ({ ...x, lecture_minutes: n }));
                }}
              />
              <label className="field">
                <span>Other devotional service</span>
                <textarea
                  rows={3}
                  placeholder="Any other service offered today…"
                  value={daily.other_service}
                  onChange={(e) => {
                    setIsDirty(true);
                    setDaily((x) => ({ ...x, other_service: e.target.value }));
                  }}
                />
              </label>
            </section>

            <button type="button" className="goals-toggle" onClick={() => setShowGoalsEditor((v) => !v)}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Target size={17} color="#B58B4C" />
                Personal Intentions (Japa & Reading Goals)
              </span>
              {showGoalsEditor ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {showGoalsEditor && renderGoalsEditor()}

            <button
              type="button"
              className="save"
              disabled={busy || loading}
              onClick={() => save('Daily sādhana offering saved.')}
            >
              <Save size={18} /> {busy ? 'Saving…' : 'Save My Offering'}
            </button>
          </>
        )}

        {/* ==========================================
            3. SPIRITUAL REALIZATIONS (JOURNAL)
           ========================================== */}
        {tab === 'journal' && (
          <>
            <div className="section-heading">
              <div className="heading-motif">
                <NotebookPen size={26} />
              </div>
              <span className="eyebrow">A SACRED JOURNAL</span>
              <h2>Spiritual Realizations</h2>
              <p>What did Krishna teach me on {format(new Date(date + 'T12:00:00'), 'd MMMM')}?</p>
            </div>

            {journalPrompts.map((q, i) => (
              <label className="journal-card field" key={q}>
                <div className="journal-prompt-head">
                  <span className="roman-index">{romanNumerals[i]}.</span>
                  <strong>{q}</strong>
                </div>
                <textarea
                  rows={4}
                  value={journal[String(i)] || ''}
                  onChange={(e) => {
                    setIsDirty(true);
                    setJournal((x) => ({ ...x, [String(i)]: e.target.value }));
                  }}
                  placeholder="Write your realization quietly…"
                />
              </label>
            ))}

            <button
              type="button"
              className="save"
              disabled={busy || loading}
              onClick={() => save('Spiritual realizations saved.')}
            >
              <Save size={18} /> {busy ? 'Saving…' : 'Save My Realizations'}
            </button>
          </>
        )}

        {/* ==========================================
            4. REFLECTION FEED (X / FACEBOOK STATUS TIMELINE)
           ========================================== */}
        {tab === 'reflection' && (
          <div className="evening-surface">
            <div className="section-heading evening">
              <div className="heading-motif">
                <LotusMotif size={26} />
              </div>
              <span className="eyebrow">SANCTUARY FEED</span>
              <h2>Heartfelt Reflections</h2>
              <p>Share your thoughts, prayers, and moments of gratitude with Sri Krishna.</p>
            </div>

            {/* X / Facebook Style Status Post Composer */}
            <section className="reflection-composer" aria-label="Create a reflection post">
              <div className="composer-top">
                <div className="post-avatar">
                  <LotusMotif size={20} />
                </div>
                <div className="composer-meta">
                  <strong>{editingPost ? 'Edit Reflection Post' : 'Share a Reflection'}</strong>
                  <span>
                    <Clock size={12} />
                    {editingPost
                      ? `Originally posted ${formatPostDateTime(editingPost.created_at, editingPost.entry_date)}`
                      : format(new Date(), 'd MMM yyyy • h:mm a')}
                  </span>
                </div>
              </div>

              <textarea
                className="composer-textarea"
                rows={4}
                aria-label="Reflection post content"
                placeholder="What is in your heart today? Write a reflection, prayer, or moment of gratitude for Sri Krishna…"
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
              />

              <div className="reflection-tags" role="group" aria-label="Reflection mood or topic">
                {reflectionTags.map((tag) => {
                  const isActive = postTag === tag;
                  return (
                    <button
                      key={tag}
                      type="button"
                      aria-pressed={isActive}
                      className={`reflection-tag-btn ${isActive ? 'active' : ''}`}
                      onClick={() => setPostTag((prev) => (prev === tag ? '' : tag))}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>

              <div className="composer-footer">
                {editingPost ? (
                  <button type="button" className="secondary-btn" onClick={cancelEditReflectionPost}>
                    Cancel Edit
                  </button>
                ) : (
                  <small className="muted" style={{ fontSize: 12 }}>
                    Private sanctuary feed • Saved with date & time
                  </small>
                )}

                <button
                  type="button"
                  className="composer-post-btn"
                  disabled={postingReflection || !postContent.trim()}
                  onClick={submitReflectionPost}
                >
                  <Send size={15} />
                  {postingReflection
                    ? 'Posting…'
                    : editingPost
                    ? 'Update Post'
                    : 'Post Reflection'}
                </button>
              </div>
            </section>

            {/* Chronological Feed of Posts */}
            <div className="reflection-feed-header">
              <h3>Your Reflection Timeline</h3>
              <span>
                {reflectionPosts.length} {reflectionPosts.length === 1 ? 'post' : 'posts'}
              </span>
            </div>

            {reflectionPosts.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '28px 18px' }}>
                <div className="motif-mark" style={{ marginBottom: 6 }}>
                  <LotusMotif size={24} />
                </div>
                <strong style={{ display: 'block', marginBottom: 4, color: 'var(--plum)' }}>
                  Your reflection feed is quiet
                </strong>
                <p className="muted" style={{ margin: 0 }}>
                  Write a status post above and tap <strong>Post Reflection</strong>. Every reflection you share will
                  appear right here with its date and time.
                </p>
              </div>
            ) : (
              reflectionPosts.map((post) => (
                <article className="reflection-post-card" key={post.id}>
                  <div className="post-header">
                    <div className="post-author-wrap">
                      <div className="post-avatar">
                        <LotusMotif size={18} />
                      </div>
                      <div className="post-author-info">
                        <div className="post-author-line">
                          <strong>Devotee Reflection</strong>
                          {post.tag && <span className="post-tag-badge">{post.tag}</span>}
                        </div>
                        <div className="post-timestamp">
                          <Clock size={12} />
                          <span>{formatPostDateTime(post.created_at, post.entry_date)}</span>
                          {post.updated_at && <span>• Edited</span>}
                        </div>
                      </div>
                    </div>

                    <div className="event-actions">
                      <button
                        type="button"
                        className="icon-button"
                        aria-label="Edit reflection post"
                        title="Edit post"
                        onClick={() => startEditReflectionPost(post)}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label="Delete reflection post"
                        title="Delete post"
                        onClick={() => deleteReflectionPost(post)}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>

                  <p className="post-body">{post.content}</p>
                </article>
              ))
            )}
          </div>
        )}

        {/* ==========================================
            5. TEMPLE & SEVA
           ========================================== */}
        {tab === 'temple' && (
          <>
            <div className="section-heading">
              <div className="heading-motif">
                <Landmark size={26} />
              </div>
              <span className="eyebrow">IN LOVING SERVICE</span>
              <h2>Temple & Seva</h2>
              <p>Offerings of time, devotion and book distribution.</p>
            </div>

            <section className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <h3 style={{ margin: 0 }}>{editingEventId ? 'Edit Seva Record' : 'Record an Offering'}</h3>
                {editingEventId && (
                  <button type="button" className="secondary-btn" onClick={resetEventForm}>
                    Cancel
                  </button>
                )}
              </div>

              <label className="field">
                <span>Seva / Activity</span>
                <select
                  value={eventType}
                  onChange={(e) => {
                    const nextType = e.target.value as TempleEventType;
                    setEventType(nextType);
                    if (!templeEventMetaMap[nextType]?.allowDecimals) {
                      const num = Number(quantityInput);
                      if (Number.isFinite(num) && num > 0) {
                        setQuantityInput(String(Math.max(1, Math.round(num))));
                      }
                    }
                  }}
                >
                  {templeEventTypes.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>
                  {eventType === 'contribution'
                    ? 'Contribution Amount (INR)'
                    : eventType === 'service'
                    ? 'Duration (hours)'
                    : 'Quantity'}
                </span>
                <input
                  type="number"
                  inputMode={templeEventMetaMap[eventType]?.allowDecimals ? 'decimal' : 'numeric'}
                  min={templeEventMetaMap[eventType]?.allowDecimals ? '0.01' : '1'}
                  step={templeEventMetaMap[eventType]?.allowDecimals ? '0.01' : '1'}
                  value={quantityInput}
                  placeholder="Enter quantity"
                  onChange={(e) => setQuantityInput(e.target.value)}
                />
              </label>

              <label className="field">
                <span>Temple or Sanctuary (optional)</span>
                <input
                  value={templeName}
                  placeholder="e.g. Sri Sri Radha Parthasarathi Mandir"
                  onChange={(e) => setTempleName(e.target.value)}
                />
              </label>

              <label className="field">
                <span>Notes / Seva remembrance (optional)</span>
                <textarea
                  rows={2}
                  value={description}
                  placeholder="Details about this service or offering…"
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>

              <button type="button" className="save" style={{ marginBottom: 4 }} disabled={busy} onClick={saveTempleEvent}>
                {editingEventId ? <Save size={18} /> : <Plus size={18} />}
                {busy ? 'Saving…' : editingEventId ? 'Update Seva Record' : 'Add to Today’s Seva'}
              </button>
            </section>

            <h3 style={{ marginTop: 20 }}>Recorded on {format(new Date(date + 'T12:00:00'), 'd MMMM yyyy')}</h3>
            {events.length === 0 ? (
              <p className="muted">No temple or seva records saved for this date.</p>
            ) : (
              events.map((e) => {
                const meta = templeEventMetaMap[e.event_type];
                return (
                  <div className="card event" key={e.id}>
                    <div>
                      <strong>{meta ? meta.label : e.event_type.replaceAll('_', ' ')}</strong>
                      <p>
                        {formatEventQuantity(e.event_type, e.quantity, e.currency)}
                        {e.temple_name ? ` • ${e.temple_name}` : ''}
                      </p>
                      {e.description && <small>{e.description}</small>}
                    </div>
                    <div className="event-actions">
                      <button
                        type="button"
                        className="icon-button"
                        aria-label="Edit record"
                        title="Edit record"
                        onClick={() => startEditEvent(e)}
                      >
                        <Pencil size={17} />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        aria-label="Delete record"
                        title="Delete record"
                        onClick={() => deleteEvent(e.id)}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}

        {/* ==========================================
            6. MONTHLY OFFERINGS (REDESIGNED)
           ========================================== */}
        {tab === 'reports' && (
          <>
            {/* A. Monthly Header */}
            <section className="monthly-header">
              <div className="motif-mark">
                <LotusMotif size={26} />
              </div>
              <span className="eyebrow">MONTHLY DEVOTIONAL JOURNAL</span>
              <h2>Monthly Offerings</h2>
              <p>A grateful remembrance of your service this month.</p>

              <div className="month-nav">
                <button type="button" aria-label="Previous month" onClick={() => shiftMonth(-1)}>
                  <ChevronLeft size={17} />
                </button>
                <label>
                  <span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
                    Select month and year
                  </span>
                  <input
                    aria-label="Select month and year"
                    type="month"
                    value={month}
                    onChange={(e) => e.target.value && setMonth(e.target.value)}
                  />
                </label>
                <button type="button" aria-label="Next month" onClick={() => shiftMonth(1)}>
                  <ChevronRight size={17} />
                </button>
              </div>
            </section>

            {reportsLoading ? (
              <p className="muted" style={{ textAlign: 'center', padding: '24px 0' }}>
                Gathering your monthly offerings…
              </p>
            ) : (
              <>
                {/* B. Composed Monthly Overview (3 distinct card styles) */}
                <section className="overview-feature" aria-label="Monthly offering highlights">
                  <div className="overview-feature-grid">
                    <div className="overview-stat">
                      <span className="stat-num">{report.days}</span>
                      <span className="stat-label">Days with Offerings</span>
                      <span className="stat-sub">
                        {report.days === 0
                          ? 'No offerings recorded yet'
                          : `in ${format(monthDateObj, 'MMMM yyyy')}`}
                      </span>
                    </div>
                    <div className="overview-divider" aria-hidden="true" />
                    <div className="overview-stat">
                      <span className="stat-num">{report.japa.toLocaleString('en-IN')}</span>
                      <span className="stat-label">Total Japa Rounds</span>
                      <span className="stat-sub">
                        {report.japaDays > 0
                          ? `Across ${report.japaDays} recorded ${report.japaDays === 1 ? 'day' : 'days'}`
                          : 'Not yet recorded'}
                      </span>
                    </div>
                  </div>
                </section>

                <div className="overview-pillars">
                  <div className="pillar-card arati-pillar">
                    <span className="pillar-eyebrow">Morning Devotion</span>
                    <strong className="pillar-value">
                      {report.arati} {report.arati === 1 ? 'day' : 'days'}
                    </strong>
                    <span className="pillar-desc">
                      Maṅgala Ārati offered
                      {report.aratiPartial > 0 ? ` (+${report.aratiPartial} partial)` : ''}
                    </span>
                  </div>

                  <div className="pillar-card sastra-pillar">
                    <span className="pillar-eyebrow">Śāstra & Śravaṇam</span>
                    <strong className="pillar-value">
                      {(report.reading + report.hearing).toLocaleString('en-IN')} min
                    </strong>
                    <span className="pillar-desc">
                      {report.reading}m reading • {report.hearing}m hearing
                    </span>
                  </div>
                </div>

                {/* C. Japa Overview Section */}
                <section className="japa-sanctuary-card" aria-label="Monthly Japa overview">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ color: 'var(--gold)', display: 'inline-flex' }}>
                      <JapaMalaMotif size={20} />
                    </span>
                    <h3 style={{ margin: 0 }}>Holy Name & Japa</h3>
                  </div>

                  <div className="japa-summary-row">
                    <div className="japa-total-block">
                      <div className="japa-big">{report.japa.toLocaleString('en-IN')} rounds</div>
                      <span>
                        {report.japaDays > 0
                          ? `Recorded on ${report.japaDays} ${report.japaDays === 1 ? 'day' : 'days'} this month`
                          : 'No japa rounds recorded for this month yet'}
                      </span>
                    </div>
                    <div className="japa-intention-badge">Intention: {japaTarget} / day</div>
                  </div>

                  <div className="japa-chart-wrap">
                    <div
                      className="japa-bars"
                      role="img"
                      aria-label={`Daily Japa chart for ${format(monthDateObj, 'MMMM yyyy')}`}
                    >
                      {monthDayNumbers.map((dayNum) => {
                        const dayKey = `${month}-${String(dayNum).padStart(2, '0')}`;
                        const rounds = report.japaByDate[dayKey];
                        const isRecorded = rounds !== undefined && rounds !== null;
                        const pct =
                          isRecorded && rounds > 0
                            ? Math.max(12, Math.min(100, Math.round((rounds / Math.max(1, maxDailyJapa)) * 100)))
                            : 0;

                        return (
                          <button
                            key={dayKey}
                            type="button"
                            className="japa-bar-col"
                            title={
                              !isRecorded
                                ? `${dayNum} ${format(monthDateObj, 'MMM')}: Not recorded`
                                : `${dayNum} ${format(monthDateObj, 'MMM')}: ${rounds} rounds`
                            }
                            aria-label={
                              !isRecorded
                                ? `${dayNum} ${format(monthDateObj, 'MMMM')}: Not recorded`
                                : `${dayNum} ${format(monthDateObj, 'MMMM')}: ${rounds} rounds`
                            }
                            onClick={() => {
                              setDate(dayKey);
                              switchTab('daily');
                            }}
                          >
                            {!isRecorded ? (
                              <span className="japa-unrecorded-tick" />
                            ) : rounds === 0 ? (
                              <span className="japa-zero-dot" />
                            ) : (
                              <span
                                className={`japa-bar-fill ${rounds >= japaTarget ? 'met' : 'recorded'}`}
                                style={{ height: `${pct}%` }}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="japa-axis">
                      <span>1 {format(monthDateObj, 'MMM')}</span>
                      <span>15 {format(monthDateObj, 'MMM')}</span>
                      <span>
                        {daysInSelectedMonth} {format(monthDateObj, 'MMM')}
                      </span>
                    </div>

                    <div className="japa-legend">
                      <span className="japa-legend-item">
                        <span className="legend-swatch" style={{ background: 'var(--tulsi)' }} />
                        Intention met ({japaTarget}+)
                      </span>
                      <span className="japa-legend-item">
                        <span className="legend-swatch" style={{ background: 'var(--gold)' }} />
                        Recorded rounds
                      </span>
                      <span className="japa-legend-item">
                        <span
                          className="legend-swatch"
                          style={{ border: '1.5px solid var(--gold)', background: 'var(--cream)' }}
                        />
                        Recorded 0
                      </span>
                      <span className="japa-legend-item">
                        <span className="legend-swatch" style={{ background: '#DFD2BC', height: 3, borderRadius: 1 }} />
                        Unrecorded
                      </span>
                    </div>
                  </div>
                </section>

                {/* D. Devotional Calendar */}
                <section className="calendar-card" aria-label="Monthly devotional calendar">
                  <div className="ledger-head" style={{ marginBottom: 10 }}>
                    <h3>Devotional Calendar</h3>
                    <small className="muted" style={{ fontSize: 11.5 }}>
                      Tap any date to open
                    </small>
                  </div>

                  <div className="calendar-weekdays">
                    {weekdayLabels.map((w) => (
                      <span key={w}>{w}</span>
                    ))}
                  </div>

                  <div className="calendar-grid">
                    {Array.from({ length: firstDayOffset }, (_, idx) => (
                      <div key={`pad-${idx}`} aria-hidden="true" />
                    ))}
                    {monthDayNumbers.map((dayNum) => {
                      const dayKey = `${month}-${String(dayNum).padStart(2, '0')}`;
                      const hasSadhana = Boolean(report.sadhanaDates[dayKey]);
                      const hasInner = Boolean(report.innerDates[dayKey]);
                      const hasAny = hasSadhana || hasInner;
                      const isToday = dayKey === todayStr;
                      const isSelected = dayKey === date;
                      const japaVal = report.japaByDate[dayKey];

                      return (
                        <button
                          key={dayKey}
                          type="button"
                          className={`calendar-day ${hasAny ? 'has-offering' : ''} ${isToday ? 'is-today' : ''} ${
                            isSelected ? 'is-selected' : ''
                          }`}
                          aria-label={`${dayNum} ${format(monthDateObj, 'MMMM yyyy')}${
                            hasAny ? ', offerings recorded' : ''
                          }`}
                          title={
                            japaVal !== undefined && japaVal !== null
                              ? `${dayNum} ${format(monthDateObj, 'MMM')}: ${japaVal} japa rounds`
                              : `${dayNum} ${format(monthDateObj, 'MMM')}`
                          }
                          onClick={() => {
                            setDate(dayKey);
                            switchTab('daily');
                          }}
                        >
                          <span>{dayNum}</span>
                          <span className="calendar-dots">
                            {hasSadhana && <span className="cal-dot sadhana" />}
                            {hasInner && <span className="cal-dot inner" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="japa-legend" style={{ marginTop: 12 }}>
                    <span className="japa-legend-item">
                      <span className="legend-swatch" style={{ background: 'var(--tulsi)' }} />
                      Sādhana / Japa
                    </span>
                    <span className="japa-legend-item">
                      <span className="legend-swatch" style={{ background: 'var(--gold)' }} />
                      Journal, Reflection or Seva
                    </span>
                  </div>
                </section>

                {/* E. Offerings by Category */}
                <section className="ledger-section" aria-label="Hearing and Reading offerings">
                  <div className="ledger-head">
                    <h3>Hearing and Reading</h3>
                  </div>
                  <div className="ledger-list">
                    <div className="ledger-row">
                      <div className="ledger-label">
                        Śrīmad Bhāgavatam classes
                        {report.classesPartial > 0 && <small>{report.classesPartial} partial class entries</small>}
                      </div>
                      <div className="ledger-val">
                        {report.classes}
                        <span>{report.classes === 1 ? 'class' : 'classes'}</span>
                      </div>
                    </div>

                    <div className="ledger-row">
                      <div className="ledger-label">Bhagavad-gītā reading</div>
                      <div className="ledger-val">
                        {report.gita_reading}
                        <span>{report.gita_reading === 1 ? 'day' : 'days'}</span>
                      </div>
                    </div>

                    <div className="ledger-row">
                      <div className="ledger-label">
                        Book reading
                        {goals.book_minutes && <small>Daily intention: {goals.book_minutes} min</small>}
                      </div>
                      <div className="ledger-val">
                        {report.reading.toLocaleString('en-IN')}
                        <span>min</span>
                        {report.pages > 0 && (
                          <>
                            {' • '}
                            {report.pages.toLocaleString('en-IN')}
                            <span>pages</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="ledger-row">
                      <div className="ledger-label">
                        Śrīla Prabhupāda lectures
                        {goals.lecture_minutes && <small>Daily intention: {goals.lecture_minutes} min</small>}
                      </div>
                      <div className="ledger-val">
                        {report.hearing.toLocaleString('en-IN')}
                        <span>min</span>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="ledger-section" aria-label="Temple and Seva offerings">
                  <div className="ledger-head">
                    <h3>Temple and Seva</h3>
                  </div>
                  <div className="ledger-list">
                    <div className="ledger-row">
                      <div className="ledger-label">Temple visits</div>
                      <div className="ledger-val">
                        {report.visit}
                        <span>{report.visit === 1 ? 'visit' : 'visits'}</span>
                      </div>
                    </div>

                    <div className="ledger-row">
                      <div className="ledger-label">
                        Temple service hours
                        {goals.monthly_service && <small>Monthly intention: {goals.monthly_service} hrs</small>}
                      </div>
                      <div className="ledger-val">
                        {report.service}
                        <span>{report.service === 1 ? 'hr' : 'hrs'}</span>
                      </div>
                    </div>

                    <div className="ledger-row">
                      <div className="ledger-label">Contributions offered</div>
                      <div className="ledger-val">
                        {report.contribution > 0
                          ? `${report.contribution.toLocaleString('en-IN', { maximumFractionDigits: 2 })} INR`
                          : 'Not recorded'}
                      </div>
                    </div>

                    <div className="ledger-row">
                      <div className="ledger-label">
                        Śrīmad Bhāgavatam sets distributed
                        {goals.monthly_bhagavatam_sets && (
                          <small>Monthly intention: {goals.monthly_bhagavatam_sets} sets</small>
                        )}
                      </div>
                      <div className="ledger-val">
                        {report.bhagavatam_sets}
                        <span>{report.bhagavatam_sets === 1 ? 'set' : 'sets'}</span>
                      </div>
                    </div>

                    <div className="ledger-row">
                      <div className="ledger-label">
                        Bhagavad-gītā books distributed
                        {goals.monthly_gita_books && (
                          <small>Monthly intention: {goals.monthly_gita_books} books</small>
                        )}
                      </div>
                      <div className="ledger-val">
                        {report.gita_books}
                        <span>{report.gita_books === 1 ? 'book' : 'books'}</span>
                      </div>
                    </div>

                    {report.other_books > 0 && (
                      <div className="ledger-row">
                        <div className="ledger-label">Other transcendental books distributed</div>
                        <div className="ledger-val">
                          {report.other_books}
                          <span>{report.other_books === 1 ? 'book' : 'books'}</span>
                        </div>
                      </div>
                    )}

                    <div className="ledger-row">
                      <div className="ledger-label">
                        Other devotional service
                        {report.other_service_notes.length > 0 && (
                          <small>
                            {report.other_service_notes
                              .slice(0, 3)
                              .map((n) => n.text)
                              .join(' • ')}
                          </small>
                        )}
                      </div>
                      <div className="ledger-val">
                        {report.other_service_days}
                        <span>{report.other_service_days === 1 ? 'day' : 'days'}</span>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="ledger-section" aria-label="Personal Reflections summary">
                  <div className="ledger-head">
                    <h3>Personal Reflections</h3>
                  </div>
                  <div className="ledger-list">
                    <div className="ledger-row">
                      <div className="ledger-label">Days with journal entries</div>
                      <div className="ledger-val">
                        {report.journal}
                        <span>{report.journal === 1 ? 'day' : 'days'}</span>
                      </div>
                    </div>

                    <div className="ledger-row">
                      <div className="ledger-label">Spiritual realizations recorded</div>
                      <div className="ledger-val">
                        {report.realizations_count}
                        <span>{report.realizations_count === 1 ? 'entry' : 'entries'}</span>
                      </div>
                    </div>

                    <div className="ledger-row">
                      <div className="ledger-label">Days with evening reflections</div>
                      <div className="ledger-val">
                        {report.reflection}
                        <span>{report.reflection === 1 ? 'day' : 'days'}</span>
                      </div>
                    </div>
                  </div>
                </section>

                {/* F. Monthly Remembrance ("Looking Back with Gratitude") */}
                <section className="remembrance-card" aria-label="Looking Back with Gratitude">
                  <span className="eyebrow">MONTHLY REMEMBRANCE</span>
                  <h3>Looking Back with Gratitude</h3>
                  <p className="muted" style={{ marginTop: 2, marginBottom: 12 }}>
                    What did Krishna teach you this month? Record any realizations, blessings, or prayers you wish to
                    preserve from {format(monthDateObj, 'MMMM yyyy')}.
                  </p>
                  <textarea
                    rows={4}
                    aria-label="Looking Back with Gratitude"
                    placeholder="Write your monthly gratitude and remembrance…"
                    value={remembrance}
                    onChange={(e) => setRemembrance(e.target.value)}
                  />
                  <button
                    type="button"
                    className="save"
                    style={{ marginBottom: 4, marginTop: 12 }}
                    disabled={savingRemembrance}
                    onClick={saveMonthlyRemembrance}
                  >
                    <Save size={18} /> {savingRemembrance ? 'Saving…' : 'Save Monthly Remembrance'}
                  </button>
                </section>

                <button type="button" className="goals-toggle" onClick={() => setShowGoalsEditor((v) => !v)}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <Target size={17} color="#B58B4C" />
                    Adjust Personal Intentions (Sankalpa)
                  </span>
                  {showGoalsEditor ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>

                {showGoalsEditor && renderGoalsEditor()}

                <div className="gentle-note" style={{ marginTop: 8 }}>
                  <TulsiSprigMotif size={16} />
                  <span>Figures reflect recorded offerings only. Missing days are never treated as failures.</span>
                </div>
              </>
            )}
          </>
        )}
      </main>

      <nav className="bottom" aria-label="Primary navigation">
        {navTabs.map(({ id, label, Icon }) => (
          <button
            type="button"
            key={id}
            className={tab === id ? 'active' : ''}
            onClick={() => switchTab(id)}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
