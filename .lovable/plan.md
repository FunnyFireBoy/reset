# Daily recovery, native reminders, and Android build

## Goal
Fix the first-time onboarding bounce, keep recovery fresh with tailored daily quests and unlimited progression, add reliable phone reminders and native app links, enable Apple sign-in, and package RESET for web and Android.

## What will change

### 1. Fix the onboarding bounce
- Update the signed-in profile cache immediately when plan generation finishes.
- Refresh the profile and quests before opening Home, so Home never sees the old “not onboarded” state.
- Keep the full-screen “plan ready” transition while the fresh data is prepared.

### 2. Generate a fresh daily quest set
- Add a dated daily quest batch so each user receives one tailored set per local calendar day.
- Generate new goals and short activities from the user’s addiction, triggers, duration, and frequency.
- Make generation idempotent so refreshes or two open devices cannot create duplicate daily sets.
- Keep completed historical quests, while the Quests screen emphasizes today’s open and completed work.
- Generate safe XP and gem rewards for every quest within controlled ranges.

### 3. Unlimited levels and generated rewards
- Keep levels calculated from total XP with no maximum.
- Replace the fixed ten-level path with a moving window around the user’s current level.
- Show algorithmically generated milestone rewards for upcoming levels without creating a hard level cap.
- Award quest XP and gems atomically so repeated taps cannot duplicate rewards.

### 4. Native links, calendars, and daily phone reminders
- Open nearby-support searches in the installed Google Maps app when available, with a browser fallback.
- Add real Google Calendar event creation so scheduled quests appear in the connected Google account.
- Keep a separate default-calendar option that opens the device calendar with the quest details and chosen time.
- Add a reminder setting with permission handling and a chosen daily time.
- On Android and iPhone, schedule rotating, supportive local notifications that invite the user back for a check-in and daily quests.
- Keep browser quest-completion notifications as a graceful web fallback; background daily web push is not included because phone notifications were selected.

### 5. Apple sign-in
- Add “Sign in with Apple” beside Google and email sign-in.
- Enable managed Apple authentication in Lovable Cloud, with the same safe public callback flow as Google.

### 6. Web and Android packaging
- Keep the current published web app as the shared online experience.
- Add a Capacitor native shell, app icon assets, safe-area support, external-browser handling, and local-notification support.
- Produce an Android debug APK artifact for installation/testing.
- Do not create or package an iOS project.

## Technical details
- Add a migration for dated quest batches/quest dates and an atomic quest-completion database function, with authenticated grants, row security, and service access.
- Add protected server functions for daily generation; AI credentials remain server-only.
- Use local date and timezone offset when selecting each day’s batch.
- Use Capacitor Local Notifications for recurring phone reminders and Capacitor Browser/App APIs for native links.
- Use per-user Google authorization for real Google Calendar writes; keep device-calendar links as a separate no-connection option.
- Configure the native shell to load the published RESET origin so existing authentication and server-powered AI continue working without duplicating the backend.

## Verification
- Reproduce the first-time flow and confirm it transitions onboarding → Home once, without bouncing back.
- Confirm one daily batch per user/date, no duplicate reward on repeated completion, and progression above level 10.
- Test reminder permission and scheduling states, Google and default-calendar paths, maps links, Google/Apple buttons, and key mobile layouts.
- Check the latest build/runtime logs, run focused tests, build the web app, and generate the Android APK.
