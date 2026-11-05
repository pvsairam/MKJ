import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { format, addDays, startOfMonth, endOfMonth } from 'date-fns';
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
  Sparkles,
  Target,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  db,
  configured,
  dateKey,
  dailyActivities,
  journalPrompts,
  questions,
  templeEventTypes,
  templeEventMetaMap,
  formatEventQuantity,
  goalDefinitions,
  type TempleEventType,
} from './lib';

type Tab = 'home' | 'daily' | 'journal' | 'reflection' | 'temple' | 'reports';

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

const emptyDaily: Daily = {
  japa_rounds: null,
  book_minutes: null,
  book_pages: null,
  lecture_minutes: null,
  other_service: '',
};

const navTabs: { id: Tab; label: string; Icon: typeof Home }[] = [
  { id: 'home', label: 'Darshan', Icon: Home },
  { id: 'daily', label: 'Sādhana', Icon: Flower2 },
  { id: 'journal', label: 'Journal', Icon: BookOpen },
  { id: 'temple', label: 'Seva', Icon: Landmark },
  { id: 'reports', label: 'Reports', Icon: BarChart3 },
  { id: 'reflection', label: 'Reflect', Icon: Heart },
];

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
      const { data, error } = await db.auth.signUp({ email: email.trim(), password });
      if (error) {
        setMessage(error.message);
      } else if (data.session) {
        setMessage('Account created and signed in.');
      } else {
        setMessage('Account created! If email confirmation is enabled in Supabase, please check your inbox, then sign in.');
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
        <div className="symbol">✿</div>
        <h1>My Krishna Journey</h1>
        <p>A personal offering to Sri Sri Radha Krishna.</p>

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
              style={{ background: 'transparent', color: '#78314d', minHeight: 32, padding: 4, fontSize: 13 }}
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
              style={{ background: 'transparent', color: '#78314d', minHeight: 32, padding: 4, fontSize: 13 }}
            >
              Back to Sign in
            </button>
          )}
          <small style={{ color: '#887864' }}>Access is private and limited to the approved devotee account.</small>
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
  const [reflection, setReflection] = useState<Record<string, string>>({});
  const [pleasure, setPleasure] = useState('');
  const [sense, setSense] = useState('');

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

  // Monthly Reports state
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [reportsLoading, setReportsLoading] = useState(false);
  const [month, setMonth] = useState(dateKey(startOfMonth(new Date())).slice(0, 7));

  function switchTab(nextTab: Tab) {
    setNotice('');
    setTab(nextTab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      // First try RPC ensure_app_member (auto-enrolls first user if app_members is empty)
      const rpcRes = await db.rpc('ensure_app_member');
      let isMember = false;

      if (!rpcRes.error && typeof rpcRes.data === 'boolean') {
        isMember = rpcRes.data;
      } else {
        // Fallback to direct select on app_members if only initial migration without RPC was applied
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

  // 3. Load Records for Selected Date
  useEffect(() => {
    if (!db || !session || !allowed) return;
    let cancelled = false;
    setLoading(true);

    Promise.all([
      db.from('daily_records').select('*').eq('entry_date', date).maybeSingle(),
      db.from('activity_entries').select('*').eq('entry_date', date),
      db.from('journal_entries').select('*').eq('entry_date', date).maybeSingle(),
      db.from('reflections').select('*').eq('entry_date', date).maybeSingle(),
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
      setReflection((r.data?.answers as Record<string, string>) || {});
      setPleasure(r.data?.pleasure || '');
      setSense(r.data?.sense_gratification || '');
      setEvents((t.data as TempleEventRow[]) || []);
      setEditingEventId(null);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [session, allowed, date]);

  // 4. Save Daily Offering / Journal / Reflection
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

    const hasReflection =
      Object.values(reflection).some((v) => String(v || '').trim() !== '') ||
      pleasure.trim() !== '' ||
      sense.trim() !== '';
    if (hasReflection) {
      queries.push(
        db.from('reflections').upsert(
          {
            user_id: uid,
            entry_date: date,
            answers: reflection,
            pleasure,
            sense_gratification: sense,
          },
          { onConflict: 'user_id,entry_date' }
        )
      );
    } else {
      queries.push(db.from('reflections').delete().eq('user_id', uid).eq('entry_date', date));
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
    setNotice(failures.length ? 'Some records could not be saved: ' + failures.join('; ') : successMessage);
    setBusy(false);
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

  // 7. Load Monthly Offerings Report
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
        .lte('entry_date', to),
      db
        .from('activity_entries')
        .select('activity_key,status,entry_date')
        .gte('entry_date', from)
        .lte('entry_date', to),
      db
        .from('temple_events')
        .select('event_type,quantity')
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
    ]).then(([d, a, t, j, r]) => {
      if (cancelled) return;
      setReportsLoading(false);
      const err = [d.error, a.error, t.error, j.error, r.error].find(Boolean);
      if (err) {
        setNotice(err.message);
        return;
      }

      const activeDailyDates = new Set<string>();
      for (const row of d.data || []) {
        if (
          row.japa_rounds !== null ||
          row.book_minutes !== null ||
          row.book_pages !== null ||
          row.lecture_minutes !== null ||
          Boolean(row.other_service?.trim())
        ) {
          activeDailyDates.add(row.entry_date);
        }
      }
      for (const act of a.data || []) {
        if (act.status) {
          activeDailyDates.add(act.entry_date);
        }
      }

      const s: Record<string, number> = {
        days: activeDailyDates.size,
        japa: (d.data || []).reduce((n, x) => n + (x.japa_rounds || 0), 0),
        reading: (d.data || []).reduce((n, x) => n + (x.book_minutes || 0), 0),
        pages: (d.data || []).reduce((n, x) => n + (x.book_pages || 0), 0),
        hearing: (d.data || []).reduce((n, x) => n + (x.lecture_minutes || 0), 0),
        arati: (a.data || []).filter((x) => x.activity_key === 'Maṅgala Ārati' && x.status === 'yes').length,
        classes: (a.data || []).filter((x) => x.activity_key.startsWith('Bhāgavatam Class') && x.status === 'yes')
          .length,
        gita_reading: (a.data || []).filter((x) => x.activity_key === 'Bhagavad-gītā Reading' && x.status === 'yes')
          .length,
        journal: (j.data || []).filter((x) =>
          Object.values((x.answers as Record<string, string>) || {}).some((v) => String(v).trim())
        ).length,
        reflection: (r.data || []).filter(
          (x) =>
            Object.values((x.answers as Record<string, string>) || {}).some((v) => String(v).trim()) ||
            x.pleasure?.trim() ||
            x.sense_gratification?.trim()
        ).length,
      };

      for (const e of t.data || []) {
        s[e.event_type] = Math.round(((s[e.event_type] || 0) + Number(e.quantity)) * 100) / 100;
      }
      setSummary(s);
    });

    return () => {
      cancelled = true;
    };
  }, [tab, month, session, allowed]);

  if (!configured) {
    return (
      <main className="auth">
        <div className="auth-card">
          <div className="symbol">✿</div>
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
          <div className="symbol">✿</div>
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
          <div className="symbol">✿</div>
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
                  background: '#f3e5cb',
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

  function renderGoalsEditor() {
    return (
      <section className="card" style={{ borderColor: '#d7b37b' }}>
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
          Set gentle personal targets to guide your daily and monthly offerings. Leave blank if not needed.
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

  return (
    <div className="app">
      <header>
        <div>
          <small>✦ A PERSONAL OFFERING TO SRI KRISHNA ✦</small>
          <h1>My Krishna Journey</h1>
          <p>Vrindavan Sanctuary</p>
        </div>
        <button className="icon-button" title="Sign out" aria-label="Sign out" onClick={() => db?.auth.signOut()}>
          <LogOut size={19} />
        </button>
      </header>

      <main className="content">
        {tab !== 'reports' && (
          <div className="date-row">
            <button
              type="button"
              aria-label="Previous day"
              onClick={() => setDate(dateKey(addDays(new Date(date + 'T12:00:00'), -1)))}
            >
              <ChevronLeft />
            </button>
            <label>
              Devotional record date
              <input
                aria-label="Selected date"
                type="date"
                value={date}
                onChange={(e) => e.target.value && setDate(e.target.value)}
              />
            </label>
            <button
              type="button"
              aria-label="Next day"
              onClick={() => setDate(dateKey(addDays(new Date(date + 'T12:00:00'), 1)))}
            >
              <ChevronRight />
            </button>
            {date !== todayStr && (
              <button type="button" className="today-pill" onClick={() => setDate(todayStr)}>
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

        {loading && tab !== 'reports' && <p className="muted" style={{ textAlign: 'center' }}>Loading saved records…</p>}

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
                <span className="lotus-mark">✿</span>
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
                <span>Today's Sādhana</span>
                <small>
                  {completedPracticesCount > 0
                    ? `${completedPracticesCount} of ${dailyActivities.length} practices offered`
                    : 'Record your practice'}
                </small>
              </button>
              <button type="button" className="offering-tile" onClick={() => switchTab('daily')}>
                <span className="beads">◌</span>
                <span>Japa</span>
                <small>
                  {daily.japa_rounds === null ? 'Not recorded' : `${daily.japa_rounds} of ${japaTarget} rounds`}
                </small>
              </button>
              <button type="button" className="offering-tile" onClick={() => switchTab('journal')}>
                <NotebookPen />
                <span>Realizations</span>
                <small>Your private journal</small>
              </button>
              <button type="button" className="offering-tile" onClick={() => switchTab('reflection')}>
                <Heart />
                <span>Reflection</span>
                <small>End your day in gratitude</small>
              </button>
            </div>

            <button type="button" className="save offering-cta" onClick={() => switchTab('daily')}>
              <HandHeart size={20} /> Make Today's Offering
            </button>

            <div className="gentle-note">
              <Sparkles size={16} />
              <span>No scores. No comparisons. Just your journey of remembrance and service.</span>
            </div>
          </>
        )}

        {tab === 'daily' && (
          <>
            <div className="section-heading">
              <Flower2 />
              <span className="eyebrow">MY DAILY OFFERING</span>
              <h2>Today’s Sādhana</h2>
              <p>Each practice is a personal offering to Krishna.</p>
            </div>

            <p className="muted">Choose completed, partially, not completed, or leave unanswered.</p>

            {dailyActivities.map((a) => (
              <div className="card compact" key={a}>
                <strong>{a}</strong>
                <select
                  aria-label={a}
                  value={activities[a] || ''}
                  onChange={(e) => setActivities((v) => ({ ...v, [a]: e.target.value }))}
                >
                  <option value="">Not recorded</option>
                  <option value="yes">Completed</option>
                  <option value="partial">Partially</option>
                  <option value="no">Not completed</option>
                </select>
              </div>
            ))}

            <section className="card">
              <h3>Japa</h3>
              <Field
                label="Rounds completed"
                hint={`Intention: ${japaTarget} rounds`}
                value={daily.japa_rounds}
                onChange={(n) => setDaily((x) => ({ ...x, japa_rounds: n }))}
                max={1000}
              />
              <div className="track">
                <div style={{ width: `${Math.min(100, ((daily.japa_rounds || 0) / Math.max(1, japaTarget)) * 100)}%` }} />
              </div>
              <div className="track-caption">
                <span>{daily.japa_rounds === null ? 'Not recorded yet' : `${daily.japa_rounds} rounds chanted`}</span>
                <span>Target: {japaTarget} rounds</span>
              </div>
            </section>

            <section className="card">
              <h3>Reading and hearing</h3>
              <Field
                label="Book reading minutes"
                hint={goals.book_minutes ? `Intention: ${goals.book_minutes} min` : undefined}
                value={daily.book_minutes}
                onChange={(n) => setDaily((x) => ({ ...x, book_minutes: n }))}
              />
              <Field
                label="Book reading pages"
                value={daily.book_pages}
                onChange={(n) => setDaily((x) => ({ ...x, book_pages: n }))}
              />
              <Field
                label="Prabhupada lecture minutes"
                hint={goals.lecture_minutes ? `Intention: ${goals.lecture_minutes} min` : undefined}
                value={daily.lecture_minutes}
                onChange={(n) => setDaily((x) => ({ ...x, lecture_minutes: n }))}
              />
              <label className="field">
                <span>Other devotional service</span>
                <textarea
                  rows={3}
                  placeholder="Any other service offered today…"
                  value={daily.other_service}
                  onChange={(e) => setDaily((x) => ({ ...x, other_service: e.target.value }))}
                />
              </label>
            </section>

            <button
              type="button"
              className="goals-toggle"
              onClick={() => setShowGoalsEditor((v) => !v)}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Target size={18} color="#a67545" />
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

        {tab === 'journal' && (
          <>
            <div className="section-heading">
              <NotebookPen />
              <span className="eyebrow">A SACRED JOURNAL</span>
              <h2>Spiritual Realizations</h2>
              <p>What did Krishna teach me today?</p>
            </div>

            {journalPrompts.map((q, i) => (
              <label className="card field" key={q}>
                <strong>{q}</strong>
                <textarea
                  rows={4}
                  value={journal[String(i)] || ''}
                  onChange={(e) => setJournal((x) => ({ ...x, [String(i)]: e.target.value }))}
                  placeholder="Write your realization…"
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

        {tab === 'reflection' && (
          <>
            <div className="section-heading evening">
              <Heart />
              <span className="eyebrow">AT THE CLOSE OF THE DAY</span>
              <h2>My Evening Reflection</h2>
              <p>A quiet moment of honesty, gratitude and remembrance.</p>
            </div>

            <p className="muted">A space for honest reflection, not spiritual scoring.</p>

            {questions.map((q, i) => (
              <div className="card" key={q}>
                <strong style={{ display: 'block', marginBottom: 10 }}>
                  {i + 1}. {q}
                </strong>
                <select
                  aria-label={q}
                  value={reflection['status_' + i] || ''}
                  onChange={(e) => setReflection((x) => ({ ...x, ['status_' + i]: e.target.value }))}
                  style={{ marginBottom: 10 }}
                >
                  <option value="">Not answered</option>
                  <option value="yes">Yes</option>
                  <option value="partial">Partially</option>
                  <option value="no">No</option>
                </select>
                <textarea
                  rows={2}
                  placeholder="Optional comments"
                  value={reflection['comment_' + i] || ''}
                  onChange={(e) => setReflection((x) => ({ ...x, ['comment_' + i]: e.target.value }))}
                />
              </div>
            ))}

            <label className="card field">
              <strong>What did I do today specifically for Krishna's pleasure?</strong>
              <textarea rows={4} value={pleasure} onChange={(e) => setPleasure(e.target.value)} />
            </label>

            <label className="card field">
              <strong>Where did I act for my own sense gratification instead of Krishna's pleasure?</strong>
              <textarea rows={4} value={sense} onChange={(e) => setSense(e.target.value)} />
            </label>

            <button
              type="button"
              className="save"
              disabled={busy || loading}
              onClick={() => save('Evening reflection saved.')}
            >
              <Heart size={18} /> {busy ? 'Saving…' : 'Save My Reflection'}
            </button>
          </>
        )}

        {tab === 'temple' && (
          <>
            <div className="section-heading">
              <Landmark />
              <span className="eyebrow">IN LOVING SERVICE</span>
              <h2>Temple & Seva</h2>
              <p>Offerings of time, devotion and book distribution.</p>
            </div>

            <p className="muted">Record visits, service, offerings and book distribution.</p>

            <section className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>{editingEventId ? 'Edit temple record' : 'Add a record'}</h3>
                {editingEventId && (
                  <button type="button" className="secondary-btn" onClick={resetEventForm}>
                    Cancel edit
                  </button>
                )}
              </div>

              <label className="field">
                <span>Activity</span>
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
                    ? 'Amount (INR)'
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
                <span>Temple name (optional)</span>
                <input
                  value={templeName}
                  placeholder="e.g. Sri Sri Radha Parthasarathi Mandir"
                  onChange={(e) => setTempleName(e.target.value)}
                />
              </label>

              <label className="field">
                <span>Description / Seva details (optional)</span>
                <textarea
                  rows={2}
                  value={description}
                  placeholder="Notes about this service or offering…"
                  onChange={(e) => setDescription(e.target.value)}
                />
              </label>

              <button type="button" className="save" style={{ marginBottom: 4 }} disabled={busy} onClick={saveTempleEvent}>
                {editingEventId ? <Save size={18} /> : <Plus size={18} />}
                {busy ? 'Saving…' : editingEventId ? 'Update record' : 'Add record'}
              </button>
            </section>

            <h3>Records for {format(new Date(date + 'T12:00:00'), 'd MMMM yyyy')}</h3>
            {events.length === 0 ? (
              <p className="muted">No temple records for this date.</p>
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

        {tab === 'reports' && (
          <>
            <div className="section-heading">
              <BarChart3 />
              <span className="eyebrow">LOOKING BACK WITH GRATITUDE</span>
              <h2>Monthly Offerings</h2>
              <p>A grateful remembrance of your service this month.</p>
            </div>

            <label className="field">
              <strong>Select month</strong>
              <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
            </label>

            <p className="muted">Figures reflect recorded information only. Missing days are not failures.</p>

            {reportsLoading ? (
              <p className="muted" style={{ textAlign: 'center' }}>Gathering monthly offerings…</p>
            ) : (
              <div className="metrics">
                {[
                  { label: 'Days with offerings', key: 'days' },
                  { label: 'Japa rounds', key: 'japa', sub: `Daily intention: ${japaTarget}/day` },
                  { label: 'Maṅgala Ārati days', key: 'arati' },
                  { label: 'Bhāgavatam classes', key: 'classes' },
                  { label: 'Gītā reading days', key: 'gita_reading' },
                  { label: 'Reading minutes', key: 'reading', sub: goals.book_minutes ? `Daily: ${goals.book_minutes}m` : undefined },
                  { label: 'Book pages read', key: 'pages' },
                  { label: 'Hearing minutes', key: 'hearing', sub: goals.lecture_minutes ? `Daily: ${goals.lecture_minutes}m` : undefined },
                  { label: 'Realization days', key: 'journal' },
                  { label: 'Reflection days', key: 'reflection' },
                  { label: 'Temple visits', key: 'visit' },
                  {
                    label: 'Temple service hours',
                    key: 'service',
                    sub: goals.monthly_service ? `Intention: ${goals.monthly_service} hrs` : undefined,
                  },
                  { label: 'Contributions (INR)', key: 'contribution' },
                  {
                    label: 'Bhāgavatam sets',
                    key: 'bhagavatam_sets',
                    sub: goals.monthly_bhagavatam_sets ? `Intention: ${goals.monthly_bhagavatam_sets}` : undefined,
                  },
                  {
                    label: 'Gītā books',
                    key: 'gita_books',
                    sub: goals.monthly_gita_books ? `Intention: ${goals.monthly_gita_books}` : undefined,
                  },
                  { label: 'Other books distributed', key: 'other_books' },
                ].map((x) => (
                  <div className="metric" key={x.key}>
                    <strong>
                      {x.key === 'contribution'
                        ? Number(summary[x.key] ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })
                        : summary[x.key] ?? 0}
                    </strong>
                    <span>{x.label}</span>
                    {x.sub && <small>{x.sub}</small>}
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              className="goals-toggle"
              onClick={() => setShowGoalsEditor((v) => !v)}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Target size={18} color="#a67545" />
                Adjust Personal Intentions (Goals)
              </span>
              {showGoalsEditor ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {showGoalsEditor && renderGoalsEditor()}
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
