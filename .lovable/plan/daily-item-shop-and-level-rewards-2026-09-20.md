# Daily item shop and level rewards

## Goal
Turn the static shop and placeholder level rewards into a replayable progression system: a fresh daily selection, visible rarity, automatic level unlocks, and an interactive level path with game-like motion.

## What will change

### 1. Daily rotating shop
- Give each catalogue item a rarity: Common, Uncommon, Rare, Epic, or Legendary.
- Show a limited daily lineup selected deterministically from the date, so every user sees a stable shop for that day and items return on future rotations.
- Weight the lineup so rare items appear much less often, while guaranteeing useful character and badge choices.
- Add a daily reset countdown, rarity styling, and a clear owned/locked/available state.
- Keep gift cards excluded.

### 2. Safe purchases and real collections
- Move gem spending and ownership creation into one protected database action, preventing duplicate purchases or partial gem deductions.
- Refresh the profile and collection immediately after a successful unlock.
- Present characters and badges separately in the profile, including both purchased and level-earned rewards.

### 3. Automatic level rewards
- Record claimed level milestones so each reward is granted once.
- Automatically reconcile unclaimed rewards when the profile loads, including levels already reached before this update.
- Keep progression infinite by generating rewards from repeatable milestone rules rather than a fixed maximum level.
- Make character and badge milestones appear as real collection entries, not only text labels.

### 4. Interactive level path
- Add a horizontally scrollable level path centered near the current level, with controls to browse backward and forward indefinitely.
- Let users tap a level to inspect its XP target, gem reward, character or badge reward, and earned/next/locked state.
- Preserve the existing account information and recovery history below the progression area.

### 5. Video-game motion
- Add rarity shimmer, reward pop, item reveal, selected-level focus, and progress-fill animations.
- Keep motion lightweight and tactile, with reduced-motion support and stable mobile layouts.

## Technical details
- Add rarity and stable rotation data to shop items, plus a private per-user level reward ledger with explicit grants and row-level security.
- Add protected database functions for atomic purchases and idempotent level-reward claiming.
- Use a seeded date hash and rarity weights for the daily selection; do not create duplicate catalogue rows every day.
- Use semantic design tokens for every rarity treatment and existing shared controls for interactions.

## Verification
- Confirm the lineup remains unchanged during one local day and changes on the next seeded date.
- Confirm rare items occur less frequently across a multi-day deterministic test.
- Confirm duplicate purchase taps cannot double-charge gems.
- Confirm existing high-level users receive each missed reward exactly once and see it in their collection.
- Confirm the level path scrolls, opens details, and remains usable on phone and desktop sizes.
- Check current build, runtime, and backend security diagnostics.
