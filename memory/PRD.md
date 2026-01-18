# MatchTrack - Lawn Bowls Tournament Management

## Original Problem Statement
A Lawn Bowls tournament management application for Centurion Bowls Club, supporting multiple tournament types:
- **Skins**: Traditional scoring with skin points
- **Standard**: Standard scoring with shots
- **Club Championship**: Round-robin followed by knockout stages

## Core Requirements

### Tournament Types
1. **Skins Tournament**: 3 skins per match, complex scoring with bonus points
2. **Standard Tournament**: End-based scoring, win/draw/loss points
3. **Club Championship**: 
   - Round-robin sections → Knockout bracket
   - Knockout-only with preliminary rounds
   - Singles, Pairs, Trips, Fours formats
   - Men's, Ladies', Mixed categories

### Key Features
- QR code-based score entry by players
- Umpire verification workflow
- Public standings pages
- CSV participant upload
- Archive completed tournaments
- Mobile-responsive design
- **Full knockout bracket setup with preliminary rounds and scheduling**
- **Auto-advancement of winners to next round**

## What's Been Implemented

### Jan 18, 2026 - Full Knockout Bracket with Preliminary Rounds
**Problem**: Club had 20 entries for Men's Pairs - needed preliminary round for 4 teams before Last 16.

**Solution Implemented**:
1. New `/api/championships/{id}/setup-full-knockout` endpoint
2. Support for preliminary rounds (17-24 teams)
3. Pre-create ALL matches with scheduled dates/times
4. Auto-advance winners to next match when verified
5. Match linking system (next_match_id, next_match_slot)
6. New `KnockoutBracketSetup.jsx` page for organizers
7. Updated `KnockoutBracket.jsx` to display dates and new stages

**Match Flow**:
- Preliminary (4 matches) → Last 16 (8) → Quarter (4) → Semi (2) → Final (1)
- When a preliminary match is verified, winner automatically fills their slot in Last 16

### Jan 2, 2026 - Admin Password Reset
- Added `/admin-reset` page for password resets without email
- Admin code: `CenturionBowls2025`

### Dec 30, 2025 - BYE Logic Fix
- Fixed knockout generation for odd numbers of section winners
- Best performers get BYE advantage
- Display "Advances Automatically" in bracket

## API Endpoints

### Knockout Bracket Setup
- `POST /api/championships/{id}/setup-full-knockout` - Create full bracket with all rounds
- Auto-links matches for winner progression

### Match Model Updates
```
ChampionshipMatch {
  ...existing fields...
  match_number: int          // Display number (1, 2, 3...)
  scheduled_date: str        // "2026-01-17"
  scheduled_time: str        // "09:00"
  next_match_id: str         // ID of match winner advances to
  next_match_slot: int       // 1 or 2 (which participant slot)
  source_match_ids: [str]    // IDs of matches that feed into this
}
```

### New Stages
- `preliminary` - For 17-24 team brackets
- `last_16` - Standard round of 16
- `quarter_final`, `semi_final`, `final`

## Technical Stack
- **Frontend**: React, Tailwind CSS, shadcn/ui, qrcode.react
- **Backend**: FastAPI, Pydantic, Motor (async MongoDB)
- **Database**: MongoDB

## Prioritized Backlog

### P0 - Complete
- [x] BYE logic for odd number of participants
- [x] Admin password reset
- [x] Full knockout bracket with preliminary rounds
- [x] Match scheduling with dates/times
- [x] Auto-advance winners

### P1 - Deferred
- [ ] Redesign printed scorecards (waiting for user specifications)

### P2 - Future
- [ ] Refactor server.py into separate route files
- [ ] Add custom hooks for complex frontend state

## Files of Reference
- `/app/backend/server.py` - Main API with new knockout setup endpoint
- `/app/frontend/src/pages/KnockoutBracketSetup.jsx` - Full bracket setup page
- `/app/frontend/src/components/KnockoutBracket.jsx` - Updated bracket display
- `/app/frontend/src/pages/ChampionshipManage.jsx` - Updated with setup options
