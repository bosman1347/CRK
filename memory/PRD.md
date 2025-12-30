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
   - Singles, Pairs, Trips, Fours formats
   - Men's, Ladies', Mixed categories

### Key Features
- QR code-based score entry by players
- Umpire verification workflow
- Public standings pages
- CSV participant upload
- Archive completed tournaments
- Mobile-responsive design

## What's Been Implemented

### Dec 30, 2025 - BYE Logic Fix
**Problem**: With odd number of section winners (e.g., 5), one winner was excluded from knockout instead of receiving a BYE.

**Solution Implemented**:
1. `generate_knockout_bracket` calculates bracket size (next power of 2) and assigns BYEs to top-seeded participants
2. `advance_knockout_round` now properly saves and retrieves `bye_participant_ids`
3. New API endpoint `/api/championships/{id}/bye-participants`
4. Public bracket endpoint includes `bye_participants` in response
5. Frontend displays "Advances Automatically" banner with participant badges

**Test Results**: 11/11 backend tests passed covering 3, 4, 5, and 7 section scenarios

### Previously Implemented
- Full Club Championship feature (creation, CSV upload, round-robin generation, scoring)
- Archive & Delete functionality
- CSV upload with multi-encoding support
- Knockout bracket visualization

## API Endpoints

### Championships
- `POST /api/championships` - Create championship
- `POST /api/championships/{id}/upload-participants` - Upload CSV
- `POST /api/championships/{id}/generate-round-robin` - Generate matches
- `POST /api/championships/{id}/generate-knockout` - Generate knockout bracket
- `POST /api/championships/{id}/advance-knockout` - Advance to next round
- `GET /api/championships/{id}/bye-participants` - Get BYE participants

### Public
- `GET /api/public/championships/{id}/standings` - Public standings
- `GET /api/public/championships/{id}/bracket` - Public bracket with BYE info

## Data Models

### Championship
```
{
  id, name, creator_id, competition_type, gender_category,
  start_type, status, current_stage, bye_participant_ids
}
```

### ChampionshipParticipant
```
{
  id, championship_id, section_id, name,
  matches_played, wins, draws, losses, points,
  shots_for, shots_against, shot_difference,
  eliminated, knockout_seed
}
```

## Technical Stack
- **Frontend**: React, Tailwind CSS, shadcn/ui, qrcode.react
- **Backend**: FastAPI, Pydantic, Motor (async MongoDB)
- **Database**: MongoDB

## Prioritized Backlog

### P0 - Complete
- [x] BYE logic for odd number of participants
- [x] Frontend display "Advances automatically"

### P1 - Deferred
- [ ] Redesign printed scorecards (waiting for user specifications)

### P2 - Future
- [ ] Refactor server.py into separate route files
- [ ] Add custom hooks for complex frontend state management
- [ ] Performance optimization for large tournaments

## Files of Reference
- `/app/backend/server.py` - Main API
- `/app/frontend/src/components/KnockoutBracket.jsx` - Bracket display
- `/app/frontend/src/pages/ChampionshipManage.jsx` - Championship management
- `/app/tests/test_bye_logic.py` - BYE logic test suite
