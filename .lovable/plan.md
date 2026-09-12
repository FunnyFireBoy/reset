# Real-world recovery progress

## Goal
Let each person record when a recovery attempt starts, see the number of addiction-free days, log a relapse without shame, and keep streaks and XP aligned with daily check-ins.

## What will change
- Add a private recovery history for each signed-in person, recording `quit` and `relapse` events with the local calendar date and optional note.
- Show an active recovery summary on Home: quit date, addiction-free days, current verified streak, and the latest encouraging message.
- If no recovery attempt is active, show a simple “Start my quit” action with a date picker. A past start date establishes elapsed days but does not grant retroactive XP.
- Add a clear “Log a relapse” flow with confirmation and supportive language. Logging a relapse ends the current attempt and records today as not addiction-free.
- Keep daily check-ins as the only way to earn sobriety XP: 20 XP once for each verified addiction-free day.
- Show recovery history in Account so previous attempts and relapse dates remain visible rather than being erased.

## Data and reward rules
- Create a `recovery_events` table with authenticated-only access, explicit grants, row-level security, and one owner per event.
- Use protected app actions for starting an attempt and logging a relapse; direct browser writes remain blocked.
- Serialize updates so repeated taps cannot duplicate events or XP.
- A relapse on a day already marked successful changes that day to unsuccessful and removes only that day’s 20 XP.
- A relapse resets the active streak to zero, but keeps lifetime XP from earlier honestly logged days.
- Starting again creates a new attempt; historical attempts remain available.
- Calendar-day calculations use the person’s local date and timezone offset, with server-side validation around the current date.

## Interface
- Home: recovery status, elapsed addiction-free days, daily check-in, start/restart action, and relapse action.
- Account: chronological recovery history with attempt start dates, relapse dates, and completed attempt lengths.
- Keep language supportive and non-punitive, especially after relapse.

## Verification
- Verify first quit, historical quit date, daily success, duplicate check-in, relapse before and after a same-day success, XP reversal, restart, and history ordering.
- Check authenticated data isolation and database security warnings.
- Check the mobile Home and Account screens, type safety, build health, and browser console errors.
