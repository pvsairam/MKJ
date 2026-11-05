# My Krishna Journey

Private, single-user devotional PWA for iPhone, Android, and desktop. Built with React, TypeScript, Vite, Tailwind CSS, and Supabase.

## Setup

1. Create a Supabase project (Free tier) and run `supabase/migrations/001_initial.sql` in its SQL Editor.
2. Copy `.env.example` to `.env` and fill in your Supabase URL (`VITE_SUPABASE_URL`) and publishable/anon key (`VITE_SUPABASE_ANON_KEY`). **Never** put a `service_role` or secret key in `.env`.
3. Run `npm install` and `npm run dev`.
4. Open the app and use **First-time Setup** on the sign-in screen to create your sanctuary account.
   - The database trigger and `ensure_app_member()` RPC automatically register the very first account created in the project as the sole approved member in `public.app_members`.
   - Once the owner account is registered in `public.app_members`, no other account can access or claim the sanctuary.
   - For additional security, disable public signups in Supabase Authentication settings once your account is created.
5. Run `npm run build` to generate `dist/`. Deploy `dist/` to an HTTPS static host with SPA fallback to `index.html`.
6. On iPhone, open the deployed HTTPS URL in Safari, tap **Share > Add to Home Screen**, and open the installed app.

## Features

- **Vrindavan Sanctuary Design**: Peaceful plum, gold, and ivory aesthetic with Sri Sri Radha Krishna Darshan home screen.
- **Daily Sādhana**: Record Maṅgala Ārati, Bhāgavatam Classes, Bhagavad-gītā Reading, Japa rounds, book reading minutes & pages, Prabhupada lecture hearing minutes, and other devotional service.
- **Personal Intentions (Goals)**: Set and save personal daily and monthly intentions (`public.goals`) for Japa rounds, reading/hearing minutes, temple service hours, and book distribution—without scores, rankings, or gamification.
- **Spiritual Realizations (Journal)**: Contemplative daily journal prompts stored privately in `public.journal_entries`.
- **Evening Reflection**: Non-judgmental end-of-day introspection stored in `public.reflections`.
- **Temple & Seva**: Add, edit, and delete records for temple visits, service hours, contributions (INR), Bhāgavatam sets, Bhagavad-gītā books, and other books distributed.
- **Monthly Offerings Report**: Complete monthly gratitude summary across all daily practices, japa, reading, hearing, realizations, reflections, temple service, and book distribution.
- **Atomic Database Saves & Strict RLS**: Uses `public.save_daily_offering` (`SECURITY INVOKER`) and strict Row Level Security policies gated by `(select auth.uid()) = user_id` and `public.is_app_member()`.
