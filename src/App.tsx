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
  Calendar,
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
  type TempleEventType,
} from './lib';

type Tab = 'home' | 'daily' | 'journal' | 'temple' | 'reports';

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

function OrnamentRule() {
  return (
    <svg width="16" height="8" viewBox="0 0 16 8" fill="none" aria-hidden="true">
      <path d="M1 4H11" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.65" />
      <path d="M13 2L15 4L13 6L11 4L13 2Z" fill="currentColor" opacity="0.85" />
    </svg>
  );
}

/* Ancient Vedic Temple Garbhagṛha Shrine — Carved Stone Mandapa, Kalasha & Goloka Yantra */
function YugaSanctumMandala() {
  const outerPetals = Array.from({ length: 16 }, (_, i) => i * 22.5);
  const innerPetals = Array.from({ length: 8 }, (_, i) => i * 45);
  const sunRays = Array.from({ length: 32 }, (_, i) => i * 11.25);

  return (
    <div className="yuga-sanctum" aria-label="Sacred Goloka Vrindavan Temple Sanctum">
      <div className="yuga-mandala-stage">
        <svg className="yuga-mandala-svg" viewBox="0 0 380 310" fill="none" aria-hidden="true">
          <defs>
            <radialGradient id="garbhaAura" cx="50%" cy="54%" r="52%">
              <stop offset="0%" stopColor="#FFE5A3" stopOpacity="0.42" />
              <stop offset="42%" stopColor="#C99649" stopOpacity="0.18" />
              <stop offset="78%" stopColor="#4A213B" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#1A0E17" stopOpacity="0" />
            </radialGradient>

            <linearGradient id="vedicGold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFF0C2" />
              <stop offset="35%" stopColor="#E5BD77" />
              <stop offset="70%" stopColor="#B8873D" />
              <stop offset="100%" stopColor="#845A21" />
            </linearGradient>

            <linearGradient id="vedicGoldVertical" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#FCE7B2" />
              <stop offset="50%" stopColor="#CFA15A" />
              <stop offset="100%" stopColor="#8E6328" />
            </linearGradient>

            <radialGradient id="peacockEye" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1A264E" />
              <stop offset="45%" stopColor="#1D6A68" />
              <stop offset="78%" stopColor="#D9AF62" />
              <stop offset="100%" stopColor="#FCE7B2" />
            </radialGradient>
          </defs>

          {/* Subtle Sacred Ambient Glow */}
          <circle cx="190" cy="168" r="145" fill="url(#garbhaAura)" />

          {/* ============================================================
              1. TEMPLE SHIKHARA KALASHA & TORANA ARCH (ANCIENT VIMANA)
             ============================================================ */}
          {/* Outer Temple Frame Border */}
          <rect
            x="10"
            y="10"
            width="360"
            height="290"
            rx="14"
            stroke="url(#vedicGold)"
            strokeWidth="1"
            opacity="0.45"
          />
          <rect
            x="15"
            y="15"
            width="350"
            height="280"
            rx="10"
            stroke="url(#vedicGold)"
            strokeWidth="0.6"
            strokeDasharray="3 3"
            opacity="0.38"
          />

          {/* Left Carved Temple Stambha (Pillar) */}
          <g opacity="0.88">
            {/* Base Pedestal */}
            <rect x="22" y="266" width="32" height="8" rx="1.5" stroke="url(#vedicGold)" strokeWidth="1.2" fill="rgba(229,189,119,0.1)" />
            <rect x="26" y="258" width="24" height="8" rx="1" stroke="url(#vedicGold)" strokeWidth="1" />
            <path d="M26 258 L30 248 H46 L50 258 Z" stroke="url(#vedicGold)" strokeWidth="1" fill="rgba(229,189,119,0.08)" />
            {/* Fluted Pillar Shaft */}
            <rect x="31" y="96" width="14" height="152" stroke="url(#vedicGoldVertical)" strokeWidth="1.15" fill="rgba(26,14,23,0.55)" />
            <line x1="35.5" y1="100" x2="35.5" y2="244" stroke="url(#vedicGold)" strokeWidth="0.6" opacity="0.55" />
            <line x1="40.5" y1="100" x2="40.5" y2="244" stroke="url(#vedicGold)" strokeWidth="0.6" opacity="0.55" />
            {/* Decorative Pillar Bands (Kirtimukha / Pearl Motifs) */}
            <rect x="29" y="138" width="18" height="6" rx="2" stroke="url(#vedicGold)" strokeWidth="1" fill="#2A1624" />
            <rect x="29" y="192" width="18" height="6" rx="2" stroke="url(#vedicGold)" strokeWidth="1" fill="#2A1624" />
            {/* Purnakalasha Pillar Capital */}
            <path d="M27 96 H49 L45 86 H31 L27 96 Z" stroke="url(#vedicGold)" strokeWidth="1.1" fill="rgba(229,189,119,0.12)" />
            <ellipse cx="38" cy="82" rx="9" ry="4" stroke="url(#vedicGold)" strokeWidth="1.1" fill="#2A1624" />
          </g>

          {/* Right Carved Temple Stambha (Pillar) */}
          <g opacity="0.88">
            {/* Base Pedestal */}
            <rect x="326" y="266" width="32" height="8" rx="1.5" stroke="url(#vedicGold)" strokeWidth="1.2" fill="rgba(229,189,119,0.1)" />
            <rect x="330" y="258" width="24" height="8" rx="1" stroke="url(#vedicGold)" strokeWidth="1" />
            <path d="M330 258 L334 248 H350 L354 258 Z" stroke="url(#vedicGold)" strokeWidth="1" fill="rgba(229,189,119,0.08)" />
            {/* Fluted Pillar Shaft */}
            <rect x="335" y="96" width="14" height="152" stroke="url(#vedicGoldVertical)" strokeWidth="1.15" fill="rgba(26,14,23,0.55)" />
            <line x1="339.5" y1="100" x2="339.5" y2="244" stroke="url(#vedicGold)" strokeWidth="0.6" opacity="0.55" />
            <line x1="344.5" y1="100" x2="344.5" y2="244" stroke="url(#vedicGold)" strokeWidth="0.6" opacity="0.55" />
            {/* Decorative Pillar Bands */}
            <rect x="333" y="138" width="18" height="6" rx="2" stroke="url(#vedicGold)" strokeWidth="1" fill="#2A1624" />
            <rect x="333" y="192" width="18" height="6" rx="2" stroke="url(#vedicGold)" strokeWidth="1" fill="#2A1624" />
            {/* Purnakalasha Pillar Capital */}
            <path d="M331 96 H353 L349 86 H335 L331 96 Z" stroke="url(#vedicGold)" strokeWidth="1.1" fill="rgba(229,189,119,0.12)" />
            <ellipse cx="342" cy="82" rx="9" ry="4" stroke="url(#vedicGold)" strokeWidth="1.1" fill="#2A1624" />
          </g>

          {/* Ornate Multifoil Temple Torana Arch (Prabhavali) */}
          <path
            d="M38 78 C38 48, 86 38, 126 34 C154 31, 174 22, 190 16 C206 22, 226 31, 254 34 C294 38, 342 48, 342 78"
            stroke="url(#vedicGold)"
            strokeWidth="1.6"
            fill="none"
          />
          <path
            d="M45 82 C45 55, 92 45, 130 41 C158 38, 175 29, 190 23 C205 29, 222 38, 250 41 C288 45, 335 55, 335 82"
            stroke="url(#vedicGold)"
            strokeWidth="0.85"
            strokeDasharray="2.5 2.5"
            opacity="0.7"
            fill="none"
          />

          {/* Crown Amalgam & Kalasha Finial at Apex */}
          <ellipse cx="190" cy="21" rx="12" ry="3.5" stroke="url(#vedicGold)" strokeWidth="1.1" fill="#2A1624" />
          <path d="M184 18 C184 12, 196 12, 196 18 Z" stroke="url(#vedicGold)" strokeWidth="1.1" fill="url(#vedicGold)" />
          <circle cx="190" cy="10" r="2.2" fill="#FFF0C2" />

          {/* ============================================================
              2. HANGING TEMPLE GHANTA (BELLS) & DEEPAM (LAMPS)
             ============================================================ */}
          {/* Left Hanging Temple Bell */}
          <g opacity="0.9">
            <line x1="74" y1="48" x2="74" y2="86" stroke="url(#vedicGold)" strokeWidth="1" strokeDasharray="2 1.5" />
            <path
              d="M67 95 C67 88, 70 86, 74 86 C78 86, 81 88, 81 95 L83 100 H65 L67 95 Z"
              stroke="url(#vedicGold)"
              strokeWidth="1.15"
              fill="rgba(229, 189, 119, 0.18)"
            />
            <circle cx="74" cy="102.5" r="1.8" fill="#FCE7B2" />
          </g>

          {/* Right Hanging Temple Bell */}
          <g opacity="0.9">
            <line x1="306" y1="48" x2="306" y2="86" stroke="url(#vedicGold)" strokeWidth="1" strokeDasharray="2 1.5" />
            <path
              d="M299 95 C299 88, 302 86, 306 86 C310 86, 313 88, 313 95 L315 100 H297 L299 95 Z"
              stroke="url(#vedicGold)"
              strokeWidth="1.15"
              fill="rgba(229, 189, 119, 0.18)"
            />
            <circle cx="306" cy="102.5" r="1.8" fill="#FCE7B2" />
          </g>

          {/* ============================================================
              3. GOLOKA PADMA MANDALA (COSMIC LOTUS OF VRINDAVAN)
             ============================================================ */}
          {/* 32 Effulgent Brahmajyoti Rays */}
          {sunRays.map((deg) => (
            <line
              key={`ray-${deg}`}
              x1="190"
              y1="56"
              x2="190"
              y2="64"
              transform={`rotate(${deg} 190 168)`}
              stroke="url(#vedicGold)"
              strokeWidth="0.75"
              opacity="0.5"
            />
          ))}

          {/* Outer Mandala Concentric Temple Rings */}
          <circle cx="190" cy="168" r="106" stroke="url(#vedicGold)" strokeWidth="1.3" opacity="0.85" />
          <circle cx="190" cy="168" r="101" stroke="url(#vedicGold)" strokeWidth="0.7" strokeDasharray="2 3" opacity="0.6" />

          {/* 16-Petal Goloka Padma */}
          {outerPetals.map((deg) => (
            <g key={`outer-petal-${deg}`} transform={`rotate(${deg} 190 168)`}>
              <path
                d="M190 67 C197 83, 199 97, 190 112 C181 97, 183 83, 190 67 Z"
                stroke="url(#vedicGold)"
                strokeWidth="1.1"
                fill="rgba(229, 189, 119, 0.07)"
              />
              <path
                d="M190 73 C194 84, 194 94, 190 105"
                stroke="url(#vedicGold)"
                strokeWidth="0.5"
                opacity="0.45"
              />
              <circle cx="190" cy="64" r="1.3" fill="#FCE7B2" opacity="0.85" />
            </g>
          ))}

          {/* Ashta-Kona (8-Pointed Interlocking Vedic Star Sanctuary) */}
          <rect
            x="132"
            y="110"
            width="116"
            height="116"
            rx="3"
            stroke="url(#vedicGold)"
            strokeWidth="1.05"
            fill="rgba(26, 14, 23, 0.28)"
            opacity="0.72"
          />
          <rect
            x="132"
            y="110"
            width="116"
            height="116"
            rx="3"
            transform="rotate(45 190 168)"
            stroke="url(#vedicGold)"
            strokeWidth="1.05"
            fill="rgba(26, 14, 23, 0.28)"
            opacity="0.72"
          />

          {/* Inner 8-Petal Yogapīṭha Lotus */}
          <circle cx="190" cy="168" r="62" stroke="url(#vedicGold)" strokeWidth="1.2" opacity="0.88" />
          {innerPetals.map((deg) => (
            <g key={`inner-petal-${deg}`} transform={`rotate(${deg} 190 168)`}>
              <path
                d="M190 106 C199 121, 199 136, 190 150 C181 136, 181 121, 190 106 Z"
                stroke="url(#vedicGold)"
                strokeWidth="1.15"
                fill="rgba(252, 231, 178, 0.1)"
              />
            </g>
          ))}

          {/* ============================================================
              4. CENTRAL GARBHAGṚHA MEDALLION: TILAK, MAYŪRA PANKHA & VAṀŚĪ
             ============================================================ */}
          <circle cx="190" cy="168" r="44" fill="#23121E" stroke="url(#vedicGold)" strokeWidth="1.7" />
          <circle cx="190" cy="168" r="39.5" stroke="url(#vedicGold)" strokeWidth="0.7" strokeDasharray="2 2" opacity="0.7" />

          {/* Mayūra Pankha (Peacock Feather Crest) */}
          <g transform="translate(190, 128)">
            <path
              d="M0 10 C5 -4, 18 -6, 20 3 C22 11, 10 17, 0 15"
              stroke="url(#vedicGold)"
              strokeWidth="1.2"
              fill="rgba(229, 189, 119, 0.12)"
            />
            <ellipse cx="12" cy="4" rx="5.5" ry="4" transform="rotate(-18 12 4)" fill="url(#peacockEye)" stroke="#FCE7B2" strokeWidth="0.9" />
            <circle cx="12" cy="4" r="1.6" fill="#FFF0C2" />
            {/* Delicate feather barbs */}
            <path d="M5 -1 L8 -5 M12 -2 L16 -6 M18 0 L23 -2 M19 6 L24 7" stroke="#E5BD77" strokeWidth="0.7" strokeLinecap="round" opacity="0.75" />
          </g>

          {/* Sacred Ūrdhva Puṇḍra (Vaiṣṇava Tilak) & Tulasī Leaf */}
          <path
            d="M183 141 V167 C183 173.5, 186 177.5, 190 177.5 C194 177.5, 197 173.5, 197 167 V141"
            stroke="#FFF0C2"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M190 173 C185.5 180, 184.5 186.5, 190 194 C195.5 186.5, 194.5 180, 190 173 Z"
            fill="url(#vedicGold)"
            stroke="#FFF0C2"
            strokeWidth="0.95"
          />

          {/* Divine Vaṁśī (Bansuri Flute) Resting Across the Lotus Feet */}
          <g transform="rotate(-10 190 187)">
            <rect x="144" y="185" width="92" height="4.2" rx="2.1" fill="url(#vedicGold)" stroke="#FFF0C2" strokeWidth="0.5" />
            {/* Decorative Gold Bands on Flute */}
            <line x1="152" y1="185" x2="152" y2="189.2" stroke="#23121E" strokeWidth="1.3" />
            <line x1="226" y1="185" x2="226" y2="189.2" stroke="#23121E" strokeWidth="1.3" />
            {/* Svara Holes */}
            <circle cx="166" cy="187.1" r="1.15" fill="#23121E" />
            <circle cx="175" cy="187.1" r="1.15" fill="#23121E" />
            <circle cx="184" cy="187.1" r="1.15" fill="#23121E" />
            <circle cx="193" cy="187.1" r="1.15" fill="#23121E" />
            <circle cx="202" cy="187.1" r="1.15" fill="#23121E" />
            <circle cx="211" cy="187.1" r="1.15" fill="#23121E" />
            {/* Jeweled Tassel */}
            <path d="M231 189 L228 198 M231 189 L232 199 M231 189 L236 197" stroke="#FCE7B2" strokeWidth="0.95" strokeLinecap="round" />
            <circle cx="228" cy="198.5" r="1" fill="#FFF0C2" />
            <circle cx="232" cy="199.5" r="1" fill="#FFF0C2" />
            <circle cx="236" cy="197.5" r="1" fill="#FFF0C2" />
          </g>

          {/* ============================================================
              5. FLANKING ĀRATI DĪPAS (LIT TEMPLE OIL LAMPS) & LOTUS PEDESTAL
             ============================================================ */}
          {/* Left Lit Deepam */}
          <g transform="translate(66, 232)">
            <path d="M2 16 C4 22, 18 22, 20 16 L23 14 H-1 L2 16 Z" fill="url(#vedicGold)" />
            <path d="M7 16 L5 24 H17 L15 16" stroke="url(#vedicGold)" strokeWidth="1.1" fill="rgba(229,189,119,0.2)" />
            {/* Sacred Flame */}
            <path d="M11 3 C8 8, 8 12, 11 13.5 C14 12, 14 8, 11 3 Z" fill="#FFE89E" />
            <path d="M11 6 C9.5 9, 9.5 11.5, 11 12.5 C12.5 11.5, 12.5 9, 11 6 Z" fill="#FFFDF4" />
          </g>

          {/* Right Lit Deepam */}
          <g transform="translate(292, 232)">
            <path d="M2 16 C4 22, 18 22, 20 16 L23 14 H-1 L2 16 Z" fill="url(#vedicGold)" />
            <path d="M7 16 L5 24 H17 L15 16" stroke="url(#vedicGold)" strokeWidth="1.1" fill="rgba(229,189,119,0.2)" />
            {/* Sacred Flame */}
            <path d="M11 3 C8 8, 8 12, 11 13.5 C14 12, 14 8, 11 3 Z" fill="#FFE89E" />
            <path d="M11 6 C9.5 9, 9.5 11.5, 11 12.5 C12.5 11.5, 12.5 9, 11 6 Z" fill="#FFFDF4" />
          </g>

          {/* Bottom Simhasana Lotus Pedestal Steps */}
          <path
            d="M84 282 H296 M102 287 H278 M128 292 H252"
            stroke="url(#vedicGold)"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.7"
          />
        </svg>
      </div>

      {/* Sacred Mahā-Mantra Inscribed on the Altar Base */}
      <div className="yuga-mantra-scroll">
        <div className="yuga-mantra-divider">
          <span className="line" />
          <span className="diamond" />
          <span className="line" />
        </div>
        <p className="yuga-mahamantra">
          Hare Kṛṣṇa Hare Kṛṣṇa • Kṛṣṇa Kṛṣṇa Hare Hare
          <br />
          Hare Rāma Hare Rāma • Rāma Rāma Hare Hare
        </p>
      </div>
    </div>
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

  // Temple & Seva state
  const [events, setEvents] = useState<TempleEventRow[]>([]);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventType, setEventType] = useState<TempleEventType>('visit');
  const [quantityInput, setQuantityInput] = useState('1');
  const [templeName, setTempleName] = useState('');
  const [description, setDescription] = useState('');

  // Goals (Personal Intentions) state
  const [goals, setGoals] = useState<Record<string, number | null>>({});

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
  const [reportView, setReportView] = useState<'overview' | 'calendar' | 'ledger' | 'gratitude'>('overview');

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

  // 3. Load Records for Selected Date
  useEffect(() => {
    if (!db || !session || !allowed) return;
    let cancelled = false;
    setLoading(true);

    Promise.all([
      db.from('daily_records').select('*').eq('entry_date', date).maybeSingle(),
      db.from('activity_entries').select('*').eq('entry_date', date),
      db.from('journal_entries').select('*').eq('entry_date', date).maybeSingle(),
      db.from('temple_events').select('*').eq('event_date', date).order('created_at', { ascending: false }),
    ]).then(([d, a, j, t]) => {
      if (cancelled) return;
      const err = [d.error, a.error, j.error, t.error].find(Boolean);
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
      setActivities(
        Object.fromEntries(
          (a.data || []).map((x) => [
            x.activity_key === 'Bhāgavatam Class 2' ? 'Caitanya-caritāmṛta' : x.activity_key,
            x.status,
          ])
        )
      );
      setJournal((j.data?.answers as Record<string, string>) || {});
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

    // Clean up legacy 'Bhāgavatam Class 2' key if present so it doesn't duplicate 'Caitanya-caritāmṛta'
    queries.push(
      db
        .from('activity_entries')
        .delete()
        .eq('user_id', uid)
        .eq('entry_date', date)
        .eq('activity_key', 'Bhāgavatam Class 2')
    );

    const results = await Promise.all(queries);
    const failures = results.filter((x) => x.error).map((x) => x.error!.message);
    if (!failures.length) {
      setIsDirty(false);
    }
    setNotice(failures.length ? 'Some records could not be saved: ' + failures.join('; ') : successMessage);
    setBusy(false);
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
        classes: (a.data || []).filter((x) => x.activity_key === 'Bhāgavatam Class 1' && x.status === 'yes')
          .length,
        classesPartial: (a.data || []).filter(
          (x) => x.activity_key === 'Bhāgavatam Class 1' && x.status === 'partial'
        ).length,
        gita_reading: (a.data || []).filter(
          (x) =>
            (x.activity_key === 'Caitanya-caritāmṛta' || x.activity_key === 'Bhāgavatam Class 2') &&
            (x.status === 'yes' || x.status === 'partial')
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
        {tab !== 'reports' && (
          <div className="date-row">
            <button
              type="button"
              aria-label="Previous day"
              onClick={() => changeDate(dateKey(addDays(new Date(date + 'T12:00:00'), -1)))}
            >
              <ChevronLeft size={18} />
            </button>
            <label className="date-pill-label">
              <span className="date-pill-display">
                <span>{format(new Date(date + 'T12:00:00'), 'dd-MM-yyyy')}</span>
                <Calendar size={15} />
              </span>
              <input
                aria-label="Selected date"
                className="date-native-input"
                type="date"
                value={date}
                onClick={(e) => {
                  try {
                    (e.currentTarget as HTMLInputElement).showPicker?.();
                  } catch {
                    // Fallback to default browser picker trigger
                  }
                }}
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
            1. DARSHAN HOME (SINGLE-SCREEN NO-SCROLL)
           ========================================== */}
        {tab === 'home' && (
          <div className="screen-pane home-pane">
            <section className="darshan">
              <div className="darshan-top">
                <span className="eyebrow">ŚRĪ ŚRĪ RĀDHĀ KṚṢṆA</span>
                <h2>Hare Krishna</h2>
                <p>At Your Lotus Feet — {format(new Date(date + 'T12:00:00'), 'EEEE, d MMMM')}</p>
              </div>
              <YugaSanctumMandala />
            </section>

            <div className="offering-grid">
              <button type="button" className="offering-tile" onClick={() => switchTab('daily')}>
                <Flower2 />
                <span className="tile-title">Today's Sādhana</span>
                <small>
                  {completedPracticesCount > 0
                    ? `${completedPracticesCount} of ${dailyActivities.length} offered`
                    : 'Record practice'}
                </small>
              </button>

              <button type="button" className="offering-tile" onClick={() => switchTab('daily')}>
                <JapaMalaMotif size={20} />
                <span className="tile-title">Japa</span>
                <small>
                  {daily.japa_rounds === null ? 'Not recorded' : `${daily.japa_rounds} / ${japaTarget} rounds`}
                </small>
              </button>

              <button type="button" className="offering-tile" onClick={() => switchTab('journal')}>
                <NotebookPen />
                <span className="tile-title">Realizations</span>
                <small>{hasRealizationsToday ? 'Journal recorded' : 'Private journal'}</small>
              </button>

              <button type="button" className="offering-tile" onClick={() => switchTab('temple')}>
                <Landmark />
                <span className="tile-title">Temple & Seva</span>
                <small>
                  {events.length > 0 ? `${events.length} seva recorded` : 'Offerings & service'}
                </small>
              </button>
            </div>

            <button type="button" className="save offering-cta" onClick={() => switchTab('daily')}>
              <HandHeart size={18} /> Make Today's Offering
            </button>
          </div>
        )}

        {/* ==========================================
            2. TODAY'S SĀDHANA (SINGLE-SCREEN NO-SCROLL)
           ========================================== */}
        {tab === 'daily' && (
          <div className="screen-pane sadhana-pane">
            <div className="compact-pane-title">
              <span className="eyebrow">MY DAILY OFFERING</span>
              <h2>Today’s Sādhana</h2>
            </div>

            <section className="card compact-practices-card">
              {dailyActivities.map((a) => {
                const current = activities[a] || '';
                return (
                  <div className="compact-practice-row" key={a}>
                    <div className="compact-practice-label">
                      <strong>{a}</strong>
                    </div>
                    <div className="status-pills compact" role="group" aria-label={a}>
                      {(
                        [
                          { value: 'yes', label: 'Done', activeClass: 'active-yes' },
                          { value: 'partial', label: 'Part', activeClass: 'active-partial' },
                          { value: 'no', label: 'No', activeClass: 'active-no' },
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
            </section>

            <section className="card compact-japa-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <h3 style={{ margin: 0, fontSize: 16 }}>Japa Meditation</h3>
                <small className="muted" style={{ fontSize: 11.5 }}>
                  Intention: {japaTarget} rounds
                  {daily.japa_rounds !== null && (
                    <>
                      {' · '}
                      <button
                        type="button"
                        onClick={() => {
                          setIsDirty(true);
                          setDaily((x) => ({ ...x, japa_rounds: null }));
                        }}
                        style={{
                          background: 'transparent',
                          color: 'var(--muted-ink)',
                          minHeight: 18,
                          padding: '0 2px',
                          fontSize: 11,
                          textDecoration: 'underline',
                        }}
                      >
                        Clear
                      </button>
                    </>
                  )}
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
                  placeholder="Rounds"
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
              <div className="track" style={{ margin: '8px 0 0' }}>
                <div style={{ width: `${Math.min(100, ((daily.japa_rounds || 0) / Math.max(1, japaTarget)) * 100)}%` }} />
              </div>
            </section>

            <section className="card compact-reading-card">
              <div className="reading-grid-2col">
                <Field
                  label="Reading (minutes)"
                  value={daily.book_minutes}
                  onChange={(n) => {
                    setIsDirty(true);
                    setDaily((x) => ({ ...x, book_minutes: n }));
                  }}
                />
                <Field
                  label="Reading (pages)"
                  value={daily.book_pages}
                  onChange={(n) => {
                    setIsDirty(true);
                    setDaily((x) => ({ ...x, book_pages: n }));
                  }}
                />
              </div>
            </section>

            <button
              type="button"
              className="save"
              disabled={busy || loading}
              onClick={() => save('Daily sādhana offering saved.')}
            >
              <Save size={18} /> {busy ? 'Saving…' : 'Save My Offering'}
            </button>
          </div>
        )}

        {/* ==========================================
            3. SPIRITUAL REALIZATIONS (JOURNAL — SINGLE-SCREEN)
           ========================================== */}
        {tab === 'journal' && (
          <div className="screen-pane journal-pane">
            <div className="compact-pane-title">
              <span className="eyebrow">A SACRED JOURNAL</span>
              <h2>Spiritual Realizations</h2>
            </div>

            {journalPrompts.map((q, i) => (
              <label className="journal-card field compact-journal-card" key={q}>
                <div className="journal-prompt-head">
                  <span className="roman-index">{romanNumerals[i]}.</span>
                  <strong>{q}</strong>
                </div>
                <textarea
                  rows={3}
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
          </div>
        )}

        {/* ==========================================
            5. TEMPLE & SEVA (SINGLE-SCREEN)
           ========================================== */}
        {tab === 'temple' && (
          <div className="screen-pane seva-pane">
            <div className="compact-pane-title">
              <span className="eyebrow">IN LOVING SERVICE</span>
              <h2>Temple & Seva</h2>
            </div>

            <section className="card compact-seva-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <h3 style={{ margin: 0, fontSize: 16 }}>{editingEventId ? 'Edit Seva Record' : 'Record an Offering'}</h3>
                {editingEventId && (
                  <button type="button" className="secondary-btn" style={{ minHeight: 30, padding: '4px 10px', fontSize: 12 }} onClick={resetEventForm}>
                    Cancel
                  </button>
                )}
              </div>

              <div className="seva-form-grid">
                <label className="field" style={{ margin: 0 }}>
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

                <label className="field" style={{ margin: 0 }}>
                  <span>
                    {eventType === 'contribution'
                      ? 'Amount (INR)'
                      : eventType === 'service'
                      ? 'Hours'
                      : 'Quantity'}
                  </span>
                  <input
                    type="number"
                    inputMode={templeEventMetaMap[eventType]?.allowDecimals ? 'decimal' : 'numeric'}
                    min={templeEventMetaMap[eventType]?.allowDecimals ? '0.01' : '1'}
                    step={templeEventMetaMap[eventType]?.allowDecimals ? '0.01' : '1'}
                    value={quantityInput}
                    placeholder="Qty"
                    onChange={(e) => setQuantityInput(e.target.value)}
                  />
                </label>
              </div>

              <button type="button" className="save" style={{ margin: '10px 0 2px' }} disabled={busy} onClick={saveTempleEvent}>
                {editingEventId ? <Save size={17} /> : <Plus size={17} />}
                {busy ? 'Saving…' : editingEventId ? 'Update Seva Record' : 'Add to Today’s Seva'}
              </button>
            </section>

            <div className="seva-recorded-box">
              <div className="seva-recorded-head">
                <strong>Recorded on {format(new Date(date + 'T12:00:00'), 'd MMM yyyy')}</strong>
                <small className="muted">{events.length} {events.length === 1 ? 'entry' : 'entries'}</small>
              </div>
              {events.length === 0 ? (
                <p className="muted" style={{ margin: '8px 0', fontSize: 13 }}>No temple or seva records saved for this date.</p>
              ) : (
                <div className="seva-events-list">
                  {events.map((e) => {
                    const meta = templeEventMetaMap[e.event_type];
                    return (
                      <div className="card event compact-event" key={e.id}>
                        <div>
                          <strong>{meta ? meta.label : e.event_type.replaceAll('_', ' ')}</strong>
                          <span className="compact-event-qty">
                            {' • '}
                            {formatEventQuantity(e.event_type, e.quantity, e.currency)}
                          </span>
                        </div>
                        <div className="event-actions">
                          <button
                            type="button"
                            className="icon-button"
                            aria-label="Edit record"
                            title="Edit record"
                            onClick={() => startEditEvent(e)}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            className="icon-button"
                            aria-label="Delete record"
                            title="Delete record"
                            onClick={() => deleteEvent(e.id)}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==========================================
            6. MONTHLY OFFERINGS (SINGLE-SCREEN SEGMENTED PILLS)
           ========================================== */}
        {tab === 'reports' && (
          <div className="screen-pane reports-pane">
            {/* Compact Monthly Top Bar */}
            <div className="reports-top-bar">
              <div>
                <span className="eyebrow">MONTHLY JOURNAL</span>
                <h2 style={{ margin: 0, fontSize: 20 }}>Offerings</h2>
              </div>

              <div className="month-nav">
                <button type="button" aria-label="Previous month" onClick={() => shiftMonth(-1)}>
                  <ChevronLeft size={16} />
                </button>
                <label className="month-pill-label">
                  <span className="date-pill-display" style={{ fontSize: 13.5 }}>
                    <span>{format(monthDateObj, 'MMM yyyy')}</span>
                    <Calendar size={13} />
                  </span>
                  <input
                    aria-label="Select month and year"
                    className="month-native-input"
                    type="month"
                    value={month}
                    onClick={(e) => {
                      try {
                        (e.currentTarget as HTMLInputElement).showPicker?.();
                      } catch {
                        // Fallback to default browser picker trigger
                      }
                    }}
                    onChange={(e) => e.target.value && setMonth(e.target.value)}
                  />
                </label>
                <button type="button" aria-label="Next month" onClick={() => shiftMonth(1)}>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            {/* Segmented Sub-Pills so Offerings never needs vertical scrolling */}
            <div className="report-subtabs" role="tablist" aria-label="Monthly offerings sections">
              {(
                [
                  { id: 'overview', label: 'Overview' },
                  { id: 'calendar', label: 'Calendar' },
                  { id: 'ledger', label: 'Summary' },
                  { id: 'gratitude', label: 'Gratitude' },
                ] as const
              ).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  role="tab"
                  aria-selected={reportView === st.id}
                  className={`report-subtab ${reportView === st.id ? 'active' : ''}`}
                  onClick={() => setReportView(st.id)}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {reportsLoading ? (
              <p className="muted" style={{ textAlign: 'center', padding: '20px 0' }}>
                Gathering your monthly offerings…
              </p>
            ) : (
              <>
                {reportView === 'overview' && (
                  <>
                    <section className="overview-feature" aria-label="Monthly offering highlights">
                      <div className="overview-feature-grid">
                        <div className="overview-stat">
                          <span className="stat-num">{report.days}</span>
                          <span className="stat-label">Days Offered</span>
                        </div>
                        <div className="overview-divider" aria-hidden="true" />
                        <div className="overview-stat">
                          <span className="stat-num">{report.japa.toLocaleString('en-IN')}</span>
                          <span className="stat-label">Japa Rounds</span>
                        </div>
                      </div>
                    </section>

                    <div className="overview-pillars">
                      <div className="pillar-card arati-pillar">
                        <span className="pillar-eyebrow">Maṅgala Ārati</span>
                        <strong className="pillar-value">
                          {report.arati} {report.arati === 1 ? 'day' : 'days'}
                        </strong>
                      </div>

                      <div className="pillar-card sastra-pillar">
                        <span className="pillar-eyebrow">Reading</span>
                        <strong className="pillar-value">
                          {report.reading.toLocaleString('en-IN')} min
                        </strong>
                      </div>
                    </div>

                    <section className="japa-sanctuary-card" aria-label="Monthly Japa overview">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ color: 'var(--gold)', display: 'inline-flex' }}>
                            <JapaMalaMotif size={18} />
                          </span>
                          <h3 style={{ margin: 0, fontSize: 16 }}>Daily Japa ({report.japaDays}d)</h3>
                        </div>
                        <div className="japa-intention-badge">Target: {japaTarget}/d</div>
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
                      </div>
                    </section>
                  </>
                )}

                {reportView === 'calendar' && (
                  <section className="calendar-card" aria-label="Monthly devotional calendar" style={{ margin: '4px 0' }}>
                    <div className="ledger-head" style={{ marginBottom: 8 }}>
                      <h3 style={{ fontSize: 16 }}>Devotional Calendar</h3>
                      <small className="muted" style={{ fontSize: 11 }}>
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

                        return (
                          <button
                            key={dayKey}
                            type="button"
                            className={`calendar-day ${hasAny ? 'has-offering' : ''} ${isToday ? 'is-today' : ''} ${
                              isSelected ? 'is-selected' : ''
                            }`}
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

                    <div className="japa-legend" style={{ marginTop: 10 }}>
                      <span className="japa-legend-item">
                        <span className="legend-swatch" style={{ background: 'var(--tulsi)' }} />
                        Sādhana / Japa
                      </span>
                      <span className="japa-legend-item">
                        <span className="legend-swatch" style={{ background: 'var(--gold)' }} />
                        Journal or Seva
                      </span>
                    </div>
                  </section>
                )}

                {reportView === 'ledger' && (
                  <section className="ledger-section" style={{ margin: '4px 0', padding: '12px 14px 6px' }}>
                    <div className="ledger-list">
                      <div className="ledger-row">
                        <div className="ledger-label">Śrīmad Bhāgavatam classes</div>
                        <div className="ledger-val">
                          {report.classes}
                          <span>{report.classes === 1 ? 'class' : 'classes'}</span>
                        </div>
                      </div>

                      <div className="ledger-row">
                        <div className="ledger-label">Śrī Caitanya-caritāmṛta</div>
                        <div className="ledger-val">
                          {report.gita_reading}
                          <span>{report.gita_reading === 1 ? 'day' : 'days'}</span>
                        </div>
                      </div>

                      <div className="ledger-row">
                        <div className="ledger-label">Book reading</div>
                        <div className="ledger-val">
                          {report.reading.toLocaleString('en-IN')} <span>min</span>
                          {report.pages > 0 && (
                            <>
                              {' • '}
                              {report.pages.toLocaleString('en-IN')} <span>p</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="ledger-row">
                        <div className="ledger-label">Spiritual realizations</div>
                        <div className="ledger-val">
                          {report.realizations_count} <span>entries ({report.journal}d)</span>
                        </div>
                      </div>

                      <div className="ledger-row">
                        <div className="ledger-label">Temple visits & service</div>
                        <div className="ledger-val">
                          {report.visit} <span>visits</span> • {report.service} <span>hrs</span>
                        </div>
                      </div>

                      <div className="ledger-row">
                        <div className="ledger-label">Books distributed</div>
                        <div className="ledger-val">
                          {report.bhagavatam_sets} <span>SB</span> • {report.gita_books} <span>BG</span>
                          {report.other_books > 0 ? ` • ${report.other_books} oth` : ''}
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
                    </div>
                  </section>
                )}

                {reportView === 'gratitude' && (
                  <>
                    <section className="remembrance-card" style={{ margin: '4px 0', padding: '14px' }}>
                      <span className="eyebrow">MONTHLY REMEMBRANCE</span>
                      <h3 style={{ fontSize: 18, margin: '2px 0 4px' }}>Looking Back with Gratitude</h3>
                      <p className="muted" style={{ marginTop: 0, marginBottom: 8, fontSize: 12.5 }}>
                        What did Krishna teach you in {format(monthDateObj, 'MMMM yyyy')}?
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
                        style={{ marginBottom: 2, marginTop: 10 }}
                        disabled={savingRemembrance}
                        onClick={saveMonthlyRemembrance}
                      >
                        <Save size={17} /> {savingRemembrance ? 'Saving…' : 'Save Monthly Remembrance'}
                      </button>
                    </section>
                  </>
                )}
              </>
            )}
          </div>
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
