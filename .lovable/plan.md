# Daily recovery streaks and plan loading

## What will change
- Add one daily check-in on the Home screen asking whether the user stayed addiction-free today.
- Show the current streak, today’s status, local date, XP reward, and encouraging milestone messages.
- Award XP once per addiction-free day. Repeated taps cannot award XP twice.
- Record a reset when the user reports a slip, respond without shame, and begin the next streak from the next successful day.
- Calculate streaks from consecutive dated check-ins, so changing devices or reopening the app keeps the correct result.
- Replace the final onboarding form with a full loading screen while the plan is being generated, then show a short “plan ready” state before opening Home.

## Data and safety
- Add a private `daily_checkins` table with one row per user per calendar date, explicit authenticated grants, row-level access rules, and a unique user/date constraint.
- Store the user’s local calendar date plus timezone offset when checking in, so the app follows their day rather than server time.
- Use an authenticated server function and a database transaction to save the check-in and XP atomically. The server will derive rewards and streaks rather than trusting values from the browser.
- Keep relapse messaging supportive and avoid implying that opening the app alone proves abstinence; XP is granted only after the user confirms the day.

## Verification
- Verify first check-in, duplicate check-in, consecutive-day streak, slip/reset behavior, XP and level updates, and milestone messages.
- Check the onboarding loading and ready states on the mobile viewport.
- Confirm the app builds cleanly and has no new runtime errors.
