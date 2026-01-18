from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr, validator
from typing import List, Optional, Dict, Any, Union
from datetime import datetime, timezone, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import random
import secrets
import csv
import io
from itertools import combinations

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 10080  # 7 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    is_umpire: bool = False

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class TournamentCreate(BaseModel):
    name: str
    teams: List[str]
    umpire_email: str
    scoring_type: str = "skins"  # "skins" or "standard"
    player_format: Optional[str] = "pairs"  # "singles", "pairs", "trips", "fours"
    num_ends: Optional[int] = 15  # For standard scoring
    num_rounds: Optional[int] = 7  # Number of rounds in tournament
    draw_type_round2: Optional[str] = "strength"  # "random" or "strength"

class Tournament(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    creator_id: str
    umpire_id: Optional[str] = None
    umpire_name: Optional[str] = None
    status: str
    current_round: int
    created_at: str
    scoring_type: str = "skins"
    player_format: str = "pairs"
    num_ends: int = 15
    num_rounds: int = 7
    draw_type_round2: str = "strength"

class Team(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    tournament_id: str
    name: str
    total_points: float
    matches_played: int
    matches_won: int
    shots_for: int = 0
    shots_against: int = 0
    shot_difference: int = 0

class Round(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    tournament_id: str
    round_number: int
    status: str
    access_token: Optional[str] = None

class TeamScoreEntry(BaseModel):
    team_number: int  # 1 or 2
    skin_number: int
    shots: int

class UmpireVerification(BaseModel):
    skin1_team1_shots: int
    skin1_team2_shots: int
    skin2_team1_shots: int
    skin2_team2_shots: int
    skin3_team1_shots: int
    skin3_team2_shots: int

class StandardScoreVerification(BaseModel):
    team1_shots: int
    team2_shots: int

class StandardScoreEntry(BaseModel):
    team1_shots: int
    team2_shots: int

class Match(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    round_id: str
    tournament_id: str
    team1_id: str
    team2_id: str
    team1_name: str
    team2_name: str
    green: str
    rink: int
    # Skins scoring fields
    skin1_team1_shots: Optional[int] = None
    skin1_team2_shots: Optional[int] = None
    skin2_team1_shots: Optional[int] = None
    skin2_team2_shots: Optional[int] = None
    skin3_team1_shots: Optional[int] = None
    skin3_team2_shots: Optional[int] = None
    team1_skin_points: float = 0.0
    team2_skin_points: float = 0.0
    # Standard scoring fields
    end_scores: Optional[List[dict]] = None  # [{end: 1, team1: 2, team2: 0}, ...]
    # Common fields
    team1_match_points: float = 0.0
    team2_match_points: float = 0.0
    team1_total_shots: int = 0
    team2_total_shots: int = 0
    team1_scores_entered: bool = False
    team2_scores_entered: bool = False
    verified: bool = False
    verified_by: Optional[str] = None
    verified_at: Optional[str] = None
    status: str = "pending"

# ==================== CHAMPIONSHIP MODELS ====================

class ChampionshipCreate(BaseModel):
    name: str  # e.g., "2026 Men's Singles Championship"
    competition_type: str  # "singles", "pairs", "triples", "fours"
    gender_category: str  # "mens", "ladies", "mixed"
    age_category: Optional[str] = "open"  # "open", "novice", "veterans" (only for singles)
    start_type: str  # "round_robin" or "knockout"
    ends_per_match: int = 15  # 15 or 18 (ignored for singles)
    finals_ends: int = 21  # Can differ from regular matches

class Championship(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    creator_id: str
    competition_type: str  # "singles", "pairs", "triples", "fours"
    gender_category: str  # "mens", "ladies", "mixed"
    age_category: str = "open"  # "open", "novice", "veterans"
    start_type: str  # "round_robin" or "knockout"
    ends_per_match: int = 15
    finals_ends: int = 21
    status: str  # "setup", "round_robin", "knockout", "completed"
    current_stage: str  # "setup", "round_robin", "knockout_round_X", "final"
    created_at: str

class ChampionshipSection(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    championship_id: str
    name: str  # "A", "B", "C", etc.
    status: str  # "pending", "in_progress", "completed"

class ChampionshipParticipant(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    championship_id: str
    section_id: str
    name: str
    # Round robin stats
    matches_played: int = 0
    wins: int = 0
    draws: int = 0
    losses: int = 0
    points: int = 0  # 2 for win, 1 for draw, 0 for loss
    shots_for: int = 0
    shots_against: int = 0
    shot_difference: int = 0
    # Knockout tracking
    eliminated: bool = False
    knockout_seed: Optional[int] = None

class ChampionshipMatch(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    championship_id: str
    section_id: Optional[str] = None  # For round robin matches
    stage: str  # "round_robin", "preliminary", "last_16", "quarter_final", "semi_final", "final"
    bracket_position: Optional[int] = None  # Position in knockout bracket
    match_number: Optional[int] = None  # Display number (1, 2, 3, etc.)
    participant1_id: Optional[str] = None  # Can be None for TBD
    participant2_id: Optional[str] = None  # Can be None for TBD
    participant1_name: str  # "TBD" or actual name
    participant2_name: str  # "TBD" or actual name
    participant1_shots: Optional[int] = None
    participant2_shots: Optional[int] = None
    winner_id: Optional[str] = None
    is_draw: bool = False
    green: Optional[str] = None
    rink: Optional[int] = None
    # Scheduling
    scheduled_date: Optional[str] = None  # "2026/01/17"
    scheduled_time: Optional[str] = None  # "09:00"
    # Match linking for knockout progression
    next_match_id: Optional[str] = None  # ID of match winner advances to
    next_match_slot: Optional[int] = None  # 1 or 2 (which participant slot in next match)
    source_match_ids: Optional[List[str]] = None  # IDs of matches that feed into this one
    scores_entered: bool = False
    verified: bool = False
    verified_by: Optional[str] = None
    verified_at: Optional[str] = None
    status: str = "pending"  # "pending", "in_progress", "completed"
    access_token: Optional[str] = None

class ChampionshipMatchScoreEntry(BaseModel):
    participant1_shots: int
    participant2_shots: int

class KnockoutBracketEntry(BaseModel):
    participant1_name: str
    participant2_name: str

# Models for full knockout bracket setup
class KnockoutMatchSetup(BaseModel):
    match_number: int
    participant1_name: str = ""  # Can be "TBD" or empty for matches fed by preliminary
    participant2_name: str = ""  # Can be "TBD" or empty for matches fed by preliminary
    scheduled_date: Optional[str] = None  # "2026/01/17"
    scheduled_time: Optional[str] = None  # "09:00"
    green: Optional[str] = None
    rink: Optional[Union[int, str]] = None  # Accept both int and string
    
    @validator('rink', pre=True, always=True)
    def convert_rink(cls, v):
        if v is None or v == '':
            return None
        try:
            return int(v)
        except (ValueError, TypeError):
            return None

class KnockoutBracketSetup(BaseModel):
    preliminary_matches: Optional[List[KnockoutMatchSetup]] = []  # For 17-24 teams
    last_16_matches: List[KnockoutMatchSetup]
    quarter_final_matches: Optional[List[KnockoutMatchSetup]] = []
    semi_final_matches: Optional[List[KnockoutMatchSetup]] = []
    final_match: Optional[KnockoutMatchSetup] = None
    # Mapping: which preliminary match feeds into which last_16 match
    preliminary_to_last16_mapping: Optional[List[dict]] = None  # [{"preliminary_match": 1, "last16_match": 1, "slot": 1}]

# ==================== ARCHIVE MODELS ====================

class ArchivedTournament(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    original_id: str
    name: str
    type: str  # "skins", "standard", "championship"
    competition_type: Optional[str] = None  # For championships: singles, pairs, etc.
    gender_category: Optional[str] = None
    winner: str
    runner_up: str
    final_score: str  # e.g., "21-15" or "4.5-3.0"
    participants: List[str]  # List of participant names
    final_standings: List[dict]  # [{position: 1, name: "...", points: X}, ...]
    archived_at: str
    expires_at: str  # Auto-delete after 2 years
    archived_by: str

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Authentication required")
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user)

async def get_current_umpire(current_user: User = Depends(get_current_user)):
    # Umpires always have access
    if current_user.is_umpire:
        return current_user
    # Non-umpires can also access (organizers can manage their tournaments)
    return current_user

async def get_tournament_manager(tournament_id: str, current_user: User = Depends(get_current_user)):
    """Verify user can manage this tournament (is umpire OR creator)"""
    tournament = await db.tournaments.find_one({"id": tournament_id}, {"_id": 0})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    # Allow if user is the umpire OR the creator
    if tournament.get("umpire_id") == current_user.id or tournament.get("creator_id") == current_user.id:
        return current_user, tournament
    
    raise HTTPException(status_code=403, detail="Access denied - must be tournament umpire or creator")

def calculate_match_points(skin1_team1, skin1_team2, skin2_team1, skin2_team2, skin3_team1, skin3_team2):
    """Calculate skin points and match points based on the complex scoring rules"""
    team1_skin_points = 0.0
    team2_skin_points = 0.0
    
    # Calculate skin 1
    if skin1_team1 > skin1_team2:
        team1_skin_points += 1.0
    elif skin1_team2 > skin1_team1:
        team2_skin_points += 1.0
    else:
        team1_skin_points += 0.5
        team2_skin_points += 0.5
    
    # Calculate skin 2
    if skin2_team1 > skin2_team2:
        team1_skin_points += 1.0
    elif skin2_team2 > skin2_team1:
        team2_skin_points += 1.0
    else:
        team1_skin_points += 0.5
        team2_skin_points += 0.5
    
    # Calculate skin 3
    if skin3_team1 > skin3_team2:
        team1_skin_points += 1.0
    elif skin3_team2 > skin3_team1:
        team2_skin_points += 1.0
    else:
        team1_skin_points += 0.5
        team2_skin_points += 0.5
    
    # Calculate match points with 2-point bonus
    team1_match_points = team1_skin_points
    team2_match_points = team2_skin_points
    
    # Add 2-point bonus to team with more skin points
    if team1_skin_points > team2_skin_points:
        team1_match_points += 2.0
    elif team2_skin_points > team1_skin_points:
        team2_match_points += 2.0
    else:
        # If tied on skin points, bonus goes to team with more total shots
        total_shots_team1 = skin1_team1 + skin2_team1 + skin3_team1
        total_shots_team2 = skin1_team2 + skin2_team2 + skin3_team2
        if total_shots_team1 > total_shots_team2:
            team1_match_points += 2.0
        elif total_shots_team2 > total_shots_team1:
            team2_match_points += 2.0
        else:
            # Perfect tie - split bonus
            team1_match_points += 1.0
            team2_match_points += 1.0
    
    return team1_skin_points, team2_skin_points, team1_match_points, team2_match_points

async def generate_draw(tournament_id: str, round_number: int):
    """Generate match draw for a round"""
    # Get all teams sorted by total points (only verified matches count)
    teams = await db.teams.find({"tournament_id": tournament_id}, {"_id": 0}).sort("total_points", -1).to_list(None)
    
    if len(teams) % 2 != 0:
        raise HTTPException(status_code=400, detail="Number of teams must be even")
    
    # Get match history to avoid repeats
    history = await db.match_history.find({"tournament_id": tournament_id}, {"_id": 0}).to_list(None)
    
    previous_matchups = set()
    team_rinks = {}
    
    for h in history:
        key = tuple(sorted([h["team1_id"], h["team2_id"]]))
        previous_matchups.add(key)
        
        t1 = h["team1_id"]
        t2 = h["team2_id"]
        rink_key = (h["green"], h["rink"])
        
        if t1 not in team_rinks:
            team_rinks[t1] = set()
        if t2 not in team_rinks:
            team_rinks[t2] = set()
        team_rinks[t1].add(rink_key)
        team_rinks[t2].add(rink_key)
    
    matches = []
    available_teams = teams[:]
    used_rinks = set()
    all_rinks = [("A", i) for i in range(1, 7)] + [("B", i) for i in range(1, 7)]
    
    if round_number == 1:
        random.shuffle(available_teams)
    
    attempt = 0
    max_attempts = 1000
    
    while len(available_teams) >= 2 and attempt < max_attempts:
        attempt += 1
        team1 = available_teams[0]
        best_team2 = None
        best_rink = None
        best_score = -1
        
        for i in range(1, len(available_teams)):
            team2 = available_teams[i]
            matchup_key = tuple(sorted([team1["id"], team2["id"]]))
            played_before = matchup_key in previous_matchups
            
            for rink in all_rinks:
                if rink in used_rinks:
                    continue
                
                team1_used = rink in team_rinks.get(team1["id"], set())
                team2_used = rink in team_rinks.get(team2["id"], set())
                
                score = 0
                if not played_before:
                    score += 100
                if not team1_used:
                    score += 10
                if not team2_used:
                    score += 10
                
                if score > best_score:
                    best_score = score
                    best_team2 = team2
                    best_rink = rink
        
        if best_team2 and best_rink:
            matches.append({
                "team1": team1,
                "team2": best_team2,
                "green": best_rink[0],
                "rink": best_rink[1]
            })
            available_teams.remove(team1)
            available_teams.remove(best_team2)
            used_rinks.add(best_rink)
        else:
            if len(available_teams) >= 2:
                team2 = available_teams[1]
                for rink in all_rinks:
                    if rink not in used_rinks:
                        matches.append({
                            "team1": team1,
                            "team2": team2,
                            "green": rink[0],
                            "rink": rink[1]
                        })
                        available_teams.remove(team1)
                        available_teams.remove(team2)
                        used_rinks.add(rink)
                        break
    
    return matches

# Auth routes
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserRegister):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    import uuid
    user_id = str(uuid.uuid4())
    user_doc = {
        "id": user_id,
        "email": user_data.email,
        "password_hash": get_password_hash(user_data.password),
        "name": user_data.name,
        "is_umpire": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    access_token = create_access_token(data={"sub": user_id})
    user = User(id=user_id, email=user_data.email, name=user_data.name, is_umpire=False)
    
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if not user or not verify_password(user_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = create_access_token(data={"sub": user["id"]})
    user_obj = User(id=user["id"], email=user["email"], name=user["name"], is_umpire=user.get("is_umpire", False))
    
    return Token(access_token=access_token, token_type="bearer", user=user_obj)

class ChangePassword(BaseModel):
    current_password: str
    new_password: str

@api_router.post("/auth/change-password")
async def change_password(password_data: ChangePassword, current_user: User = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user.id}, {"_id": 0})
    
    if not verify_password(password_data.current_password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    
    new_hash = get_password_hash(password_data.new_password)
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"password_hash": new_hash}}
    )
    
    return {"message": "Password changed successfully"}

# Admin password reset (no auth required - uses admin code)
class AdminPasswordReset(BaseModel):
    email: EmailStr
    new_password: str
    admin_code: str

@api_router.post("/auth/admin-reset-password")
async def admin_reset_password(reset_data: AdminPasswordReset):
    # Admin code from environment variable
    ADMIN_CODE = os.environ.get('ADMIN_CODE', 'CenturionBowls2025')
    
    if reset_data.admin_code != ADMIN_CODE:
        raise HTTPException(status_code=403, detail="Invalid admin code")
    
    user = await db.users.find_one({"email": reset_data.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_hash = get_password_hash(reset_data.new_password)
    await db.users.update_one(
        {"email": reset_data.email},
        {"$set": {"password_hash": new_hash}}
    )
    
    return {"message": f"Password reset successfully for {reset_data.email}"}

# Tournament routes
@api_router.post("/tournaments")
async def create_tournament(tournament_data: TournamentCreate, current_user: User = Depends(get_current_user)):
    import uuid
    
    # Check if umpire exists
    umpire = await db.users.find_one({"email": tournament_data.umpire_email}, {"_id": 0})
    
    umpire_created = False
    temp_password = None
    
    if not umpire:
        # Auto-create umpire account
        temp_password = secrets.token_urlsafe(12)
        umpire_id = str(uuid.uuid4())
        umpire_name = tournament_data.umpire_email.split('@')[0].title()
        
        umpire_doc = {
            "id": umpire_id,
            "email": tournament_data.umpire_email,
            "password_hash": get_password_hash(temp_password),
            "name": umpire_name,
            "is_umpire": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(umpire_doc)
        
        umpire = umpire_doc
        umpire_created = True
    elif not umpire.get("is_umpire", False):
        # User exists but not an umpire - promote them
        await db.users.update_one(
            {"email": tournament_data.umpire_email},
            {"$set": {"is_umpire": True}}
        )
        umpire["is_umpire"] = True
    
    tournament_id = str(uuid.uuid4())
    
    tournament_doc = {
        "id": tournament_id,
        "name": tournament_data.name,
        "creator_id": current_user.id,
        "umpire_id": umpire["id"],
        "umpire_name": umpire["name"],
        "status": "setup",
        "current_round": 0,
        "scoring_type": tournament_data.scoring_type,
        "player_format": tournament_data.player_format,
        "num_ends": tournament_data.num_ends,
        "num_rounds": tournament_data.num_rounds,
        "draw_type_round2": tournament_data.draw_type_round2,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.tournaments.insert_one(tournament_doc)
    
    # Create teams
    for team_name in tournament_data.teams:
        team_id = str(uuid.uuid4())
        team_doc = {
            "id": team_id,
            "tournament_id": tournament_id,
            "name": team_name,
            "total_points": 0.0,
            "matches_played": 0,
            "matches_won": 0,
            "shots_for": 0,
            "shots_against": 0,
            "shot_difference": 0
        }
        await db.teams.insert_one(team_doc)
    
    response = {
        "tournament": Tournament(**tournament_doc),
        "umpire_created": umpire_created
    }
    
    if umpire_created:
        response["umpire_credentials"] = {
            "email": tournament_data.umpire_email,
            "temporary_password": temp_password,
            "message": "Share these credentials with the umpire. They can change the password after first login."
        }
    
    return response

@api_router.get("/tournaments", response_model=List[Tournament])
async def get_tournaments(current_user: User = Depends(get_current_user)):
    tournaments = await db.tournaments.find({"creator_id": current_user.id}, {"_id": 0}).to_list(None)
    return [Tournament(**t) for t in tournaments]

@api_router.get("/tournaments/{tournament_id}", response_model=Tournament)
async def get_tournament(tournament_id: str, current_user: User = Depends(get_current_user)):
    tournament = await db.tournaments.find_one({"id": tournament_id}, {"_id": 0})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return Tournament(**tournament)

@api_router.get("/tournaments/{tournament_id}/teams")
async def get_teams(tournament_id: str, current_user: User = Depends(get_current_user)):
    teams = await db.teams.find({"tournament_id": tournament_id}, {"_id": 0}).to_list(None)
    return [Team(**t) for t in teams]

@api_router.get("/tournaments/{tournament_id}/rounds")
async def get_rounds(tournament_id: str, current_user: User = Depends(get_current_user)):
    rounds = await db.rounds.find({"tournament_id": tournament_id}, {"_id": 0}).sort("round_number", 1).to_list(None)
    return [Round(**r) for r in rounds]

# Umpire routes (now accessible to organizers too)
@api_router.get("/umpire/tournaments")
async def get_umpire_tournaments(current_user: User = Depends(get_current_user)):
    # Get tournaments where user is umpire OR creator
    tournaments = await db.tournaments.find(
        {"$or": [{"umpire_id": current_user.id}, {"creator_id": current_user.id}]}, 
        {"_id": 0}
    ).to_list(None)
    return [Tournament(**t) for t in tournaments]

@api_router.post("/umpire/tournaments/{tournament_id}/rounds/generate")
async def umpire_generate_round(tournament_id: str, current_user: User = Depends(get_current_user)):
    # Check if user can manage this tournament
    tournament = await db.tournaments.find_one({"id": tournament_id}, {"_id": 0})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    # Allow if user is umpire OR creator
    if tournament.get("umpire_id") != current_user.id and tournament.get("creator_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    current_round_num = tournament["current_round"]
    
    # Check if current round matches are all verified
    if current_round_num > 0:
        current_round = await db.rounds.find_one({"tournament_id": tournament_id, "round_number": current_round_num}, {"_id": 0})
        if current_round:
            matches = await db.matches.find({"round_id": current_round["id"]}, {"_id": 0}).to_list(None)
            if any(not m["verified"] for m in matches):
                raise HTTPException(status_code=400, detail="All matches must be verified before generating next round")
    
    max_rounds = tournament.get("num_rounds", 7)
    if current_round_num >= max_rounds:
        raise HTTPException(status_code=400, detail=f"Tournament already has {max_rounds} rounds")
    
    import uuid
    next_round_num = current_round_num + 1
    round_id = str(uuid.uuid4())
    round_access_token = secrets.token_urlsafe(32)
    round_doc = {
        "id": round_id,
        "tournament_id": tournament_id,
        "round_number": next_round_num,
        "status": "active",
        "access_token": round_access_token
    }
    await db.rounds.insert_one(round_doc)
    
    # Generate matches
    matches = await generate_draw(tournament_id, next_round_num)
    
    tournament = await db.tournaments.find_one({"id": tournament_id}, {"_id": 0})
    is_standard_scoring = tournament.get("scoring_type") == "standard"
    
    for match_data in matches:
        match_id = str(uuid.uuid4())
        match_doc = {
            "id": match_id,
            "round_id": round_id,
            "tournament_id": tournament_id,
            "team1_id": match_data["team1"]["id"],
            "team2_id": match_data["team2"]["id"],
            "team1_name": match_data["team1"]["name"],
            "team2_name": match_data["team2"]["name"],
            "green": match_data["green"],
            "rink": match_data["rink"],
            "skin1_team1_shots": None,
            "skin1_team2_shots": None,
            "skin2_team1_shots": None,
            "skin2_team2_shots": None,
            "skin3_team1_shots": None,
            "skin3_team2_shots": None,
            "team1_skin_points": 0.0,
            "team2_skin_points": 0.0,
            "team1_match_points": 0.0,
            "team2_match_points": 0.0,
            "team1_total_shots": 0,
            "team2_total_shots": 0,
            "team1_scores_entered": False,
            "team2_scores_entered": False,
            "verified": False,
            "verified_by": None,
            "verified_at": None,
            "status": "pending"
        }
        
        # Add end_scores for standard scoring
        if is_standard_scoring:
            match_doc["end_scores"] = []
        
        await db.matches.insert_one(match_doc)
    
    # Update tournament
    await db.tournaments.update_one(
        {"id": tournament_id},
        {"$set": {"status": "active", "current_round": next_round_num}}
    )
    
    return {"message": f"Round {next_round_num} created", "round_id": round_id}

@api_router.get("/umpire/rounds/{round_id}/matches")
async def get_umpire_round_matches(round_id: str, current_user: User = Depends(get_current_user)):
    # Verify user has access to this round's tournament
    round_data = await db.rounds.find_one({"id": round_id}, {"_id": 0})
    if not round_data:
        raise HTTPException(status_code=404, detail="Round not found")
    
    tournament = await db.tournaments.find_one({"id": round_data["tournament_id"]}, {"_id": 0})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    # Check access
    if tournament.get("umpire_id") != current_user.id and tournament.get("creator_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    matches = await db.matches.find({"round_id": round_id}, {"_id": 0}).to_list(None)
    return [Match(**m) for m in matches]

@api_router.post("/umpire/matches/{match_id}/verify")
async def verify_match(match_id: str, verification: UmpireVerification, current_user: User = Depends(get_current_user)):
    match = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    # Verify user has access to this tournament
    tournament = await db.tournaments.find_one({"id": match["tournament_id"]}, {"_id": 0})
    if tournament.get("umpire_id") != current_user.id and tournament.get("creator_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if match["verified"]:
        raise HTTPException(status_code=400, detail="Match already verified")
    
    # Calculate points
    t1_sp, t2_sp, t1_mp, t2_mp = calculate_match_points(
        verification.skin1_team1_shots, verification.skin1_team2_shots,
        verification.skin2_team1_shots, verification.skin2_team2_shots,
        verification.skin3_team1_shots, verification.skin3_team2_shots
    )
    
    # Calculate total shots
    t1_total_shots = verification.skin1_team1_shots + verification.skin2_team1_shots + verification.skin3_team1_shots
    t2_total_shots = verification.skin1_team2_shots + verification.skin2_team2_shots + verification.skin3_team2_shots
    
    # Update match
    await db.matches.update_one(
        {"id": match_id},
        {"$set": {
            "skin1_team1_shots": verification.skin1_team1_shots,
            "skin1_team2_shots": verification.skin1_team2_shots,
            "skin2_team1_shots": verification.skin2_team1_shots,
            "skin2_team2_shots": verification.skin2_team2_shots,
            "skin3_team1_shots": verification.skin3_team1_shots,
            "skin3_team2_shots": verification.skin3_team2_shots,
            "team1_skin_points": t1_sp,
            "team2_skin_points": t2_sp,
            "team1_match_points": t1_mp,
            "team2_match_points": t2_mp,
            "team1_total_shots": t1_total_shots,
            "team2_total_shots": t2_total_shots,
            "verified": True,
            "verified_by": current_user.id,
            "verified_at": datetime.now(timezone.utc).isoformat(),
            "status": "completed"
        }}
    )
    
    # Update team stats
    await db.teams.update_one(
        {"id": match["team1_id"]},
        {"$inc": {
            "total_points": t1_mp,
            "matches_played": 1,
            "matches_won": 1 if t1_mp > t2_mp else 0,
            "shots_for": t1_total_shots,
            "shots_against": t2_total_shots,
            "shot_difference": t1_total_shots - t2_total_shots
        }}
    )
    await db.teams.update_one(
        {"id": match["team2_id"]},
        {"$inc": {
            "total_points": t2_mp,
            "matches_played": 1,
            "matches_won": 1 if t2_mp > t1_mp else 0,
            "shots_for": t2_total_shots,
            "shots_against": t1_total_shots,
            "shot_difference": t2_total_shots - t1_total_shots
        }}
    )
    
    # Add to match history
    import uuid
    history_doc = {
        "id": str(uuid.uuid4()),
        "tournament_id": match["tournament_id"],
        "team1_id": match["team1_id"],
        "team2_id": match["team2_id"],
        "green": match["green"],
        "rink": match["rink"],
        "round_number": (await db.rounds.find_one({"id": match["round_id"]}, {"_id": 0}))["round_number"]
    }
    await db.match_history.insert_one(history_doc)
    
    return {"message": "Match verified successfully"}

@api_router.post("/umpire/matches/{match_id}/verify-standard")
async def verify_standard_match(match_id: str, verification: StandardScoreVerification, current_user: User = Depends(get_current_user)):
    """Verify a standard scoring match with final shot totals"""
    match = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    # Verify user has access to this tournament
    tournament = await db.tournaments.find_one({"id": match["tournament_id"]}, {"_id": 0})
    if tournament.get("umpire_id") != current_user.id and tournament.get("creator_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if tournament.get("scoring_type") != "standard":
        raise HTTPException(status_code=400, detail="This endpoint is for standard scoring only")
    
    if match["verified"]:
        raise HTTPException(status_code=400, detail="Match already verified")
    
    t1_shots = verification.team1_shots
    t2_shots = verification.team2_shots
    
    # For singles, max is 21
    player_format = tournament.get("player_format", "pairs")
    if player_format == "singles" and (t1_shots > 21 or t2_shots > 21):
        raise HTTPException(status_code=400, detail="Singles matches have max 21 shots")
    
    # Calculate match points: Win=2, Draw=1, Loss=0
    if t1_shots > t2_shots:
        t1_mp = 2.0
        t2_mp = 0.0
    elif t2_shots > t1_shots:
        t1_mp = 0.0
        t2_mp = 2.0
    else:
        t1_mp = 1.0
        t2_mp = 1.0
    
    # Update match
    await db.matches.update_one(
        {"id": match_id},
        {"$set": {
            "team1_total_shots": t1_shots,
            "team2_total_shots": t2_shots,
            "team1_match_points": t1_mp,
            "team2_match_points": t2_mp,
            "verified": True,
            "verified_by": current_user.id,
            "verified_at": datetime.now(timezone.utc).isoformat(),
            "status": "completed"
        }}
    )
    
    # Update team stats
    await db.teams.update_one(
        {"id": match["team1_id"]},
        {"$inc": {
            "total_points": t1_mp,
            "matches_played": 1,
            "matches_won": 1 if t1_mp > t2_mp else 0,
            "shots_for": t1_shots,
            "shots_against": t2_shots,
            "shot_difference": t1_shots - t2_shots
        }}
    )
    await db.teams.update_one(
        {"id": match["team2_id"]},
        {"$inc": {
            "total_points": t2_mp,
            "matches_played": 1,
            "matches_won": 1 if t2_mp > t1_mp else 0,
            "shots_for": t2_shots,
            "shots_against": t1_shots,
            "shot_difference": t2_shots - t1_shots
        }}
    )
    
    # Add to match history
    import uuid
    history_doc = {
        "id": str(uuid.uuid4()),
        "tournament_id": match["tournament_id"],
        "team1_id": match["team1_id"],
        "team2_id": match["team2_id"],
        "green": match["green"],
        "rink": match["rink"],
        "round_number": (await db.rounds.find_one({"id": match["round_id"]}, {"_id": 0}))["round_number"]
    }
    await db.match_history.insert_one(history_doc)
    
    return {"message": "Standard match verified successfully"}

# Public token-based score entry (by round)
@api_router.get("/rounds/by-token/{token}")
async def get_round_by_token(token: str):
    round_data = await db.rounds.find_one({"access_token": token}, {"_id": 0})
    if not round_data:
        raise HTTPException(status_code=404, detail="Round not found")
    
    # Get tournament info
    tournament = await db.tournaments.find_one({"id": round_data["tournament_id"]}, {"_id": 0})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    # Get all matches for this round
    matches = await db.matches.find({"round_id": round_data["id"]}, {"_id": 0}).to_list(None)
    
    return {
        "round": Round(**round_data),
        "matches": [Match(**m) for m in matches],
        "tournament": Tournament(**tournament)
    }

@api_router.post("/rounds/by-token/{token}/matches/{match_id}/scores")
async def submit_match_scores(token: str, match_id: str, score_entry: TeamScoreEntry):
    # Verify round token
    round_data = await db.rounds.find_one({"access_token": token}, {"_id": 0})
    if not round_data:
        raise HTTPException(status_code=404, detail="Round not found")
    
    # Get match
    match = await db.matches.find_one({"id": match_id, "round_id": round_data["id"]}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    if match["verified"]:
        raise HTTPException(status_code=400, detail="Match already verified - scores cannot be changed")
    
    team_num = score_entry.team_number
    skin_num = score_entry.skin_number
    
    if team_num not in [1, 2]:
        raise HTTPException(status_code=400, detail="Team number must be 1 or 2")
    
    if skin_num not in [1, 2, 3]:
        raise HTTPException(status_code=400, detail="Skin number must be 1, 2, or 3")
    
    if score_entry.shots < 0:
        raise HTTPException(status_code=400, detail="Shots cannot be negative")
    
    # Update the score
    field_name = f"skin{skin_num}_team{team_num}_shots"
    
    # Mark that scores have been entered (by either team)
    update_data = {field_name: score_entry.shots}
    
    # Check if all 6 scores are now filled
    updated_match = await db.matches.find_one({"id": match_id}, {"_id": 0})
    all_scores_filled = all([
        updated_match.get(f"skin{s}_team{t}_shots") is not None 
        for s in [1, 2, 3] for t in [1, 2]
    ])
    
    if all_scores_filled or score_entry.shots is not None:
        update_data["team1_scores_entered"] = True  # Using as "scores_entered" flag
    
    await db.matches.update_one(
        {"id": match_id},
        {"$set": update_data}
    )
    
    return {"message": "Score submitted successfully"}

@api_router.post("/rounds/by-token/{token}/matches/{match_id}/standard-scores")
async def submit_standard_scores(token: str, match_id: str, score_entry: StandardScoreEntry):
    """Submit final scores for a standard scoring match"""
    # Verify round token
    round_data = await db.rounds.find_one({"access_token": token}, {"_id": 0})
    if not round_data:
        raise HTTPException(status_code=404, detail="Round not found")
    
    # Get tournament to verify scoring type
    tournament = await db.tournaments.find_one({"id": round_data["tournament_id"]}, {"_id": 0})
    if not tournament or tournament.get("scoring_type") != "standard":
        raise HTTPException(status_code=400, detail="This endpoint is for standard scoring tournaments")
    
    # Get match
    match = await db.matches.find_one({"id": match_id, "round_id": round_data["id"]}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    if match["verified"]:
        raise HTTPException(status_code=400, detail="Match already verified - scores cannot be changed")
    
    if score_entry.team1_shots < 0 or score_entry.team2_shots < 0:
        raise HTTPException(status_code=400, detail="Shots cannot be negative")
    
    # For singles, max is 21
    player_format = tournament.get("player_format", "pairs")
    if player_format == "singles" and (score_entry.team1_shots > 21 or score_entry.team2_shots > 21):
        raise HTTPException(status_code=400, detail="Singles matches have max 21 shots")
    
    # Update match with pending scores (awaiting umpire verification)
    await db.matches.update_one(
        {"id": match_id},
        {"$set": {
            "team1_total_shots": score_entry.team1_shots,
            "team2_total_shots": score_entry.team2_shots,
            "team1_scores_entered": True,
            "team2_scores_entered": True
        }}
    )
    
    return {"message": "Scores submitted successfully - awaiting verification"}

# Public routes
@api_router.get("/public/tournaments/{tournament_id}/standings")
async def get_public_standings(tournament_id: str):
    teams = await db.teams.find({"tournament_id": tournament_id}, {"_id": 0}).to_list(None)
    # Sort by: 1) total_points (desc), 2) shot_difference (desc), 3) shots_for (desc)
    teams_sorted = sorted(teams, key=lambda t: (
        -t.get("total_points", 0),
        -t.get("shot_difference", 0),
        -t.get("shots_for", 0)
    ))
    return [Team(**t) for t in teams_sorted]

@api_router.get("/public/tournaments/{tournament_id}/summary")
async def get_public_summary(tournament_id: str):
    tournament = await db.tournaments.find_one({"id": tournament_id}, {"_id": 0})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    teams = await db.teams.find({"tournament_id": tournament_id}, {"_id": 0}).sort("total_points", -1).to_list(None)
    rounds = await db.rounds.find({"tournament_id": tournament_id}, {"_id": 0}).sort("round_number", 1).to_list(None)
    
    # Get all verified matches
    all_matches = []
    for round_data in rounds:
        matches = await db.matches.find({"round_id": round_data["id"], "verified": True}, {"_id": 0}).to_list(None)
        all_matches.extend(matches)
    
    return {
        "tournament": Tournament(**tournament),
        "teams": [Team(**t) for t in teams],
        "rounds": [Round(**r) for r in rounds],
        "verified_matches": [Match(**m) for m in all_matches]
    }

# ==================== CHAMPIONSHIP ROUTES ====================

def generate_round_robin_schedule(participants: List[dict]) -> List[tuple]:
    """Generate a round-robin schedule where each participant plays every other once."""
    return list(combinations(participants, 2))

async def get_championship_manager(championship_id: str, current_user: User = Depends(get_current_user)):
    """Verify user can manage this championship (is creator)"""
    championship = await db.championships.find_one({"id": championship_id}, {"_id": 0})
    if not championship:
        raise HTTPException(status_code=404, detail="Championship not found")
    
    if championship.get("creator_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied - must be championship creator")
    
    return current_user, championship

@api_router.post("/championships")
async def create_championship(championship_data: ChampionshipCreate, current_user: User = Depends(get_current_user)):
    """Create a new club championship"""
    import uuid
    
    championship_id = str(uuid.uuid4())
    
    championship_doc = {
        "id": championship_id,
        "name": championship_data.name,
        "creator_id": current_user.id,
        "competition_type": championship_data.competition_type,
        "gender_category": championship_data.gender_category,
        "age_category": championship_data.age_category if championship_data.competition_type == "singles" else "open",
        "start_type": championship_data.start_type,
        "ends_per_match": championship_data.ends_per_match,
        "finals_ends": championship_data.finals_ends,
        "status": "setup",
        "current_stage": "setup",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.championships.insert_one(championship_doc)
    
    return {"championship": Championship(**championship_doc)}

@api_router.get("/championships")
async def get_championships(current_user: User = Depends(get_current_user)):
    """Get all championships created by the current user"""
    championships = await db.championships.find({"creator_id": current_user.id}, {"_id": 0}).to_list(None)
    return [Championship(**c) for c in championships]

@api_router.get("/championships/{championship_id}")
async def get_championship(championship_id: str, current_user: User = Depends(get_current_user)):
    """Get a specific championship"""
    championship = await db.championships.find_one({"id": championship_id}, {"_id": 0})
    if not championship:
        raise HTTPException(status_code=404, detail="Championship not found")
    return Championship(**championship)

@api_router.post("/championships/{championship_id}/upload-participants")
async def upload_participants(championship_id: str, file: UploadFile = File(...), current_user: User = Depends(get_current_user)):
    """Upload CSV/Excel with sections and participants"""
    import uuid
    
    # Verify access
    championship = await db.championships.find_one({"id": championship_id}, {"_id": 0})
    if not championship:
        raise HTTPException(status_code=404, detail="Championship not found")
    if championship.get("creator_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if championship.get("status") != "setup":
        raise HTTPException(status_code=400, detail="Cannot upload participants after championship has started")
    
    # Read file content
    content = await file.read()
    
    # Log file info for debugging
    logging.info(f"Received file: {file.filename}, size: {len(content)} bytes, content_type: {file.content_type}")
    
    # Try to decode as CSV
    try:
        # Handle both CSV and Excel-exported CSV
        # Try UTF-8 with BOM first, then fall back to other encodings
        text_content = None
        for encoding in ['utf-8-sig', 'utf-8', 'latin-1', 'cp1252']:
            try:
                text_content = content.decode(encoding)
                break
            except UnicodeDecodeError:
                continue
        
        if text_content is None:
            raise HTTPException(status_code=400, detail="Unable to read file. Please save as CSV (UTF-8) format.")
        
        # Log first 500 chars of file for debugging
        logging.info(f"File content preview: {text_content[:500]}")
        
        # Detect delimiter - Excel in some regions uses semicolon
        delimiter = ','
        first_line = text_content.split('\n')[0] if '\n' in text_content else text_content.split('\r')[0]
        if ';' in first_line and ',' not in first_line:
            delimiter = ';'
            logging.info(f"Detected semicolon delimiter")
        
        reader = csv.DictReader(io.StringIO(text_content), delimiter=delimiter)
        
        # Normalize column names
        rows = []
        for row in reader:
            normalized_row = {}
            for key, value in row.items():
                if key is None:
                    continue
                # Remove BOM, quotes, and whitespace from key
                cleaned_key = key.strip().lower().replace('"', '').replace('\ufeff', '')
                normalized_row[cleaned_key] = value.strip() if value else ""
            rows.append(normalized_row)
        
        if not rows:
            raise HTTPException(status_code=400, detail="CSV file is empty or has no data rows")
        
        # Check required columns
        first_row_keys = list(rows[0].keys())
        logging.info(f"CSV columns found: {first_row_keys}")
        
        # More flexible column matching
        section_col = None
        name_col = None
        for key in first_row_keys:
            if 'section' in key.lower():
                section_col = key
            if 'name' in key.lower():
                name_col = key
        
        if not section_col or not name_col:
            raise HTTPException(
                status_code=400, 
                detail=f"CSV must have 'Section' and 'Name' columns. Found columns: {first_row_keys}. First row data: {rows[0] if rows else 'empty'}"
            )
        
        # Use the found column names
        logging.info(f"Using section column: '{section_col}', name column: '{name_col}'")
        
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="Invalid file format. Please save as CSV (UTF-8) format from Excel.")
    
    # Clear existing sections and participants
    await db.championship_sections.delete_many({"championship_id": championship_id})
    await db.championship_participants.delete_many({"championship_id": championship_id})
    
    # Group by section
    sections_data = {}
    for row in rows:
        section_name = row.get(section_col, '').upper().strip()
        participant_name = row.get(name_col, '').strip()
        
        if not section_name or not participant_name:
            continue
        
        if section_name not in sections_data:
            sections_data[section_name] = []
        sections_data[section_name].append(participant_name)
    
    if not sections_data:
        raise HTTPException(status_code=400, detail="No valid sections/participants found in file")
    
    # Create sections and participants
    created_sections = []
    created_participants = []
    
    for section_name, participants in sections_data.items():
        section_id = str(uuid.uuid4())
        section_doc = {
            "id": section_id,
            "championship_id": championship_id,
            "name": section_name,
            "status": "pending"
        }
        await db.championship_sections.insert_one(section_doc)
        created_sections.append(section_doc)
        
        for participant_name in participants:
            participant_id = str(uuid.uuid4())
            participant_doc = {
                "id": participant_id,
                "championship_id": championship_id,
                "section_id": section_id,
                "name": participant_name,
                "matches_played": 0,
                "wins": 0,
                "draws": 0,
                "losses": 0,
                "points": 0,
                "shots_for": 0,
                "shots_against": 0,
                "shot_difference": 0,
                "eliminated": False,
                "knockout_seed": None
            }
            await db.championship_participants.insert_one(participant_doc)
            created_participants.append(participant_doc)
    
    return {
        "message": f"Uploaded {len(created_participants)} participants in {len(created_sections)} sections",
        "sections": [ChampionshipSection(**s) for s in created_sections],
        "participant_count": len(created_participants)
    }

@api_router.get("/championships/{championship_id}/sections")
async def get_championship_sections(championship_id: str, current_user: User = Depends(get_current_user)):
    """Get all sections for a championship"""
    sections = await db.championship_sections.find({"championship_id": championship_id}, {"_id": 0}).to_list(None)
    return [ChampionshipSection(**s) for s in sections]

@api_router.get("/championships/{championship_id}/participants")
async def get_championship_participants(championship_id: str, current_user: User = Depends(get_current_user)):
    """Get all participants for a championship"""
    participants = await db.championship_participants.find({"championship_id": championship_id}, {"_id": 0}).to_list(None)
    return [ChampionshipParticipant(**p) for p in participants]

@api_router.get("/championships/{championship_id}/sections/{section_id}/standings")
async def get_section_standings(championship_id: str, section_id: str, current_user: User = Depends(get_current_user)):
    """Get standings for a specific section"""
    participants = await db.championship_participants.find(
        {"championship_id": championship_id, "section_id": section_id}, 
        {"_id": 0}
    ).to_list(None)
    
    # Sort by: 1) points (desc), 2) shot_difference (desc), 3) shots_for (desc)
    participants_sorted = sorted(participants, key=lambda p: (
        -p.get("points", 0),
        -p.get("shot_difference", 0),
        -p.get("shots_for", 0)
    ))
    
    return [ChampionshipParticipant(**p) for p in participants_sorted]

@api_router.post("/championships/{championship_id}/generate-round-robin")
async def generate_round_robin(championship_id: str, current_user: User = Depends(get_current_user)):
    """Generate round-robin matches for all sections"""
    import uuid
    
    # Verify access
    championship = await db.championships.find_one({"id": championship_id}, {"_id": 0})
    if not championship:
        raise HTTPException(status_code=404, detail="Championship not found")
    if championship.get("creator_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if championship.get("start_type") != "round_robin":
        raise HTTPException(status_code=400, detail="This championship does not have a round-robin stage")
    
    if championship.get("status") not in ["setup"]:
        raise HTTPException(status_code=400, detail="Round robin already generated")
    
    # Get all sections
    sections = await db.championship_sections.find({"championship_id": championship_id}, {"_id": 0}).to_list(None)
    if not sections:
        raise HTTPException(status_code=400, detail="No sections found. Please upload participants first.")
    
    # Clear any existing matches
    await db.championship_matches.delete_many({"championship_id": championship_id, "stage": "round_robin"})
    
    # Generate matches for each section
    all_rinks = [("A", i) for i in range(1, 7)] + [("B", i) for i in range(1, 7)]
    rink_index = 0
    total_matches = 0
    
    # Generate access token for round robin stage
    stage_access_token = secrets.token_urlsafe(32)
    
    for section in sections:
        participants = await db.championship_participants.find(
            {"championship_id": championship_id, "section_id": section["id"]}, 
            {"_id": 0}
        ).to_list(None)
        
        if len(participants) < 2:
            continue
        
        # Generate round-robin schedule
        matchups = generate_round_robin_schedule(participants)
        
        for p1, p2 in matchups:
            rink = all_rinks[rink_index % len(all_rinks)]
            rink_index += 1
            
            match_id = str(uuid.uuid4())
            match_doc = {
                "id": match_id,
                "championship_id": championship_id,
                "section_id": section["id"],
                "stage": "round_robin",
                "bracket_position": None,
                "participant1_id": p1["id"],
                "participant2_id": p2["id"],
                "participant1_name": p1["name"],
                "participant2_name": p2["name"],
                "participant1_shots": None,
                "participant2_shots": None,
                "winner_id": None,
                "is_draw": False,
                "green": rink[0],
                "rink": rink[1],
                "scores_entered": False,
                "verified": False,
                "verified_by": None,
                "verified_at": None,
                "status": "pending",
                "access_token": stage_access_token
            }
            await db.championship_matches.insert_one(match_doc)
            total_matches += 1
        
        # Update section status
        await db.championship_sections.update_one(
            {"id": section["id"]},
            {"$set": {"status": "in_progress"}}
        )
    
    # Update championship status
    await db.championships.update_one(
        {"id": championship_id},
        {"$set": {"status": "round_robin", "current_stage": "round_robin"}}
    )
    
    return {
        "message": f"Generated {total_matches} round-robin matches",
        "total_matches": total_matches,
        "access_token": stage_access_token
    }

@api_router.get("/championships/{championship_id}/matches")
async def get_championship_matches(championship_id: str, stage: Optional[str] = None, section_id: Optional[str] = None, current_user: User = Depends(get_current_user)):
    """Get matches for a championship, optionally filtered by stage or section"""
    query = {"championship_id": championship_id}
    if stage:
        query["stage"] = stage
    if section_id:
        query["section_id"] = section_id
    
    matches = await db.championship_matches.find(query, {"_id": 0}).to_list(None)
    return [ChampionshipMatch(**m) for m in matches]

@api_router.get("/championships/{championship_id}/current-access-token")
async def get_championship_access_token(championship_id: str, current_user: User = Depends(get_current_user)):
    """Get the access token for current stage matches"""
    # Verify access
    championship = await db.championships.find_one({"id": championship_id}, {"_id": 0})
    if not championship:
        raise HTTPException(status_code=404, detail="Championship not found")
    if championship.get("creator_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    current_stage = championship.get("current_stage", "setup")
    
    # Get match with access token from current stage
    match = await db.championship_matches.find_one(
        {"championship_id": championship_id, "stage": current_stage, "access_token": {"$ne": None}},
        {"_id": 0, "access_token": 1}
    )
    
    if not match:
        raise HTTPException(status_code=404, detail="No active stage found")
    
    return {"access_token": match["access_token"], "stage": current_stage}

@api_router.get("/championships/{championship_id}/bye-participants")
async def get_bye_participants(championship_id: str, current_user: User = Depends(get_current_user)):
    """Get the list of participants who have BYEs in the current knockout round"""
    # Verify access
    championship = await db.championships.find_one({"id": championship_id}, {"_id": 0})
    if not championship:
        raise HTTPException(status_code=404, detail="Championship not found")
    if championship.get("creator_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    bye_ids = championship.get("bye_participant_ids", [])
    bye_participants = []
    
    for bye_id in bye_ids:
        participant = await db.championship_participants.find_one({"id": bye_id}, {"_id": 0})
        if participant:
            bye_participants.append({
                "id": participant["id"],
                "name": participant["name"],
                "status": "Advances automatically"
            })
    
    return {
        "current_stage": championship.get("current_stage", "setup"),
        "bye_participants": bye_participants
    }

# Public championship score entry routes (via access token)
@api_router.get("/championship-round/{access_token}")
async def get_championship_round_by_token(access_token: str):
    """Get championship matches by access token (for players)"""
    matches = await db.championship_matches.find(
        {"access_token": access_token}, 
        {"_id": 0}
    ).to_list(None)
    
    if not matches:
        raise HTTPException(status_code=404, detail="Invalid or expired access token")
    
    # Get championship info
    championship_id = matches[0]["championship_id"]
    championship = await db.championships.find_one({"id": championship_id}, {"_id": 0})
    
    # Get sections
    sections = await db.championship_sections.find({"championship_id": championship_id}, {"_id": 0}).to_list(None)
    
    return {
        "championship": Championship(**championship),
        "matches": [ChampionshipMatch(**m) for m in matches],
        "sections": [ChampionshipSection(**s) for s in sections]
    }

@api_router.post("/championship-round/{access_token}/match/{match_id}/scores")
async def submit_championship_match_scores(access_token: str, match_id: str, score_entry: ChampionshipMatchScoreEntry):
    """Submit scores for a championship match (by players)"""
    # Verify match exists and has correct token
    match = await db.championship_matches.find_one(
        {"id": match_id, "access_token": access_token}, 
        {"_id": 0}
    )
    
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    if match["verified"]:
        raise HTTPException(status_code=400, detail="Match already verified - scores cannot be changed")
    
    if score_entry.participant1_shots < 0 or score_entry.participant2_shots < 0:
        raise HTTPException(status_code=400, detail="Shots cannot be negative")
    
    # Get championship for validation
    championship = await db.championships.find_one({"id": match["championship_id"]}, {"_id": 0})
    
    # For singles (first to 21), validate max
    if championship.get("competition_type") == "singles":
        # Allow up to 21 for regular matches, finals_ends for finals
        max_shots = 21
        if score_entry.participant1_shots > max_shots or score_entry.participant2_shots > max_shots:
            raise HTTPException(status_code=400, detail=f"Singles matches have max {max_shots} shots")
    
    # Update match with pending scores
    await db.championship_matches.update_one(
        {"id": match_id},
        {"$set": {
            "participant1_shots": score_entry.participant1_shots,
            "participant2_shots": score_entry.participant2_shots,
            "scores_entered": True
        }}
    )
    
    return {"message": "Scores submitted successfully - awaiting verification"}

@api_router.post("/championships/{championship_id}/matches/{match_id}/verify")
async def verify_championship_match(
    championship_id: str, 
    match_id: str, 
    score_entry: ChampionshipMatchScoreEntry, 
    current_user: User = Depends(get_current_user)
):
    """Verify and finalize a championship match score"""
    # Verify access
    championship = await db.championships.find_one({"id": championship_id}, {"_id": 0})
    if not championship:
        raise HTTPException(status_code=404, detail="Championship not found")
    if championship.get("creator_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    match = await db.championship_matches.find_one({"id": match_id, "championship_id": championship_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    if match["verified"]:
        raise HTTPException(status_code=400, detail="Match already verified")
    
    p1_shots = score_entry.participant1_shots
    p2_shots = score_entry.participant2_shots
    
    # Determine winner
    winner_id = None
    is_draw = False
    
    if match["stage"] == "round_robin":
        # Round robin allows draws
        if p1_shots > p2_shots:
            winner_id = match["participant1_id"]
        elif p2_shots > p1_shots:
            winner_id = match["participant2_id"]
        else:
            is_draw = True
    else:
        # Knockout matches must have a winner
        if p1_shots == p2_shots:
            raise HTTPException(status_code=400, detail="Knockout matches cannot end in a draw")
        winner_id = match["participant1_id"] if p1_shots > p2_shots else match["participant2_id"]
    
    # Update match
    await db.championship_matches.update_one(
        {"id": match_id},
        {"$set": {
            "participant1_shots": p1_shots,
            "participant2_shots": p2_shots,
            "winner_id": winner_id,
            "is_draw": is_draw,
            "verified": True,
            "verified_by": current_user.id,
            "verified_at": datetime.now(timezone.utc).isoformat(),
            "status": "completed"
        }}
    )
    
    # Update participant stats
    if match["stage"] == "round_robin":
        # Calculate points: Win=2, Draw=1, Loss=0
        p1_points = 2 if winner_id == match["participant1_id"] else (1 if is_draw else 0)
        p2_points = 2 if winner_id == match["participant2_id"] else (1 if is_draw else 0)
        
        p1_wins = 1 if winner_id == match["participant1_id"] else 0
        p1_draws = 1 if is_draw else 0
        p1_losses = 1 if winner_id == match["participant2_id"] else 0
        
        p2_wins = 1 if winner_id == match["participant2_id"] else 0
        p2_draws = 1 if is_draw else 0
        p2_losses = 1 if winner_id == match["participant1_id"] else 0
        
        # Update participant 1
        await db.championship_participants.update_one(
            {"id": match["participant1_id"]},
            {"$inc": {
                "matches_played": 1,
                "wins": p1_wins,
                "draws": p1_draws,
                "losses": p1_losses,
                "points": p1_points,
                "shots_for": p1_shots,
                "shots_against": p2_shots,
                "shot_difference": p1_shots - p2_shots
            }}
        )
        
        # Update participant 2
        await db.championship_participants.update_one(
            {"id": match["participant2_id"]},
            {"$inc": {
                "matches_played": 1,
                "wins": p2_wins,
                "draws": p2_draws,
                "losses": p2_losses,
                "points": p2_points,
                "shots_for": p2_shots,
                "shots_against": p1_shots,
                "shot_difference": p2_shots - p1_shots
            }}
        )
    else:
        # Knockout match - mark loser as eliminated
        loser_id = match["participant2_id"] if winner_id == match["participant1_id"] else match["participant1_id"]
        await db.championship_participants.update_one(
            {"id": loser_id},
            {"$set": {"eliminated": True}}
        )
        
        # Auto-advance winner to next match if linked
        if match.get("next_match_id") and match.get("next_match_slot"):
            winner_name = match["participant1_name"] if winner_id == match["participant1_id"] else match["participant2_name"]
            
            # Update the next match with the winner
            if match["next_match_slot"] == 1:
                await db.championship_matches.update_one(
                    {"id": match["next_match_id"]},
                    {"$set": {
                        "participant1_id": winner_id,
                        "participant1_name": winner_name
                    }}
                )
            else:
                await db.championship_matches.update_one(
                    {"id": match["next_match_id"]},
                    {"$set": {
                        "participant2_id": winner_id,
                        "participant2_name": winner_name
                    }}
                )
    
    return {"message": "Match verified successfully", "winner_id": winner_id, "is_draw": is_draw}

@api_router.post("/championships/{championship_id}/generate-knockout")
async def generate_knockout_bracket(championship_id: str, current_user: User = Depends(get_current_user)):
    """Generate knockout bracket from round-robin winners or for knockout-only championship"""
    import uuid
    import math
    
    # Verify access
    championship = await db.championships.find_one({"id": championship_id}, {"_id": 0})
    if not championship:
        raise HTTPException(status_code=404, detail="Championship not found")
    if championship.get("creator_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    is_knockout_only = championship.get("start_type") == "knockout"
    
    if not is_knockout_only:
        # Check all round robin matches are verified
        unverified = await db.championship_matches.find_one({
            "championship_id": championship_id,
            "stage": "round_robin",
            "verified": False
        }, {"_id": 0})
        
        if unverified:
            raise HTTPException(status_code=400, detail="All round-robin matches must be verified first")
    
    # Get winners from each section (or all participants for knockout-only)
    sections = await db.championship_sections.find({"championship_id": championship_id}, {"_id": 0}).to_list(None)
    
    knockout_participants = []
    
    for section in sections:
        participants = await db.championship_participants.find(
            {"championship_id": championship_id, "section_id": section["id"]},
            {"_id": 0}
        ).to_list(None)
        
        if is_knockout_only:
            # All participants advance
            knockout_participants.extend(participants)
        else:
            # Get section winner (sorted by points, then shot diff, then shots for)
            sorted_participants = sorted(participants, key=lambda p: (
                -p.get("points", 0),
                -p.get("shot_difference", 0),
                -p.get("shots_for", 0)
            ))
            
            if sorted_participants:
                winner = sorted_participants[0]
                winner["knockout_seed"] = len(knockout_participants) + 1
                knockout_participants.append(winner)
                
                # Update seed in database
                await db.championship_participants.update_one(
                    {"id": winner["id"]},
                    {"$set": {"knockout_seed": winner["knockout_seed"]}}
                )
        
        # Mark section as completed
        await db.championship_sections.update_one(
            {"id": section["id"]},
            {"$set": {"status": "completed"}}
        )
    
    if len(knockout_participants) < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 participants for knockout stage")
    
    # Generate access token for knockout stage
    knockout_access_token = secrets.token_urlsafe(32)
    
    num_participants = len(knockout_participants)
    
    # Calculate bracket size - find next power of 2
    bracket_size = 2 ** math.ceil(math.log2(num_participants))
    num_byes = bracket_size - num_participants
    
    logging.info(f"Knockout: {num_participants} participants, bracket size {bracket_size}, {num_byes} BYEs")
    
    # Determine round name based on bracket size
    if bracket_size == 2:
        round_name = "final"
    elif bracket_size == 4:
        round_name = "knockout_semi"
    elif bracket_size == 8:
        round_name = "knockout_quarter"
    else:
        round_name = "knockout_round_1"
    
    # Generate knockout matches
    all_rinks = [("A", i) for i in range(1, 7)] + [("B", i) for i in range(1, 7)]
    
    # Clear existing knockout matches
    await db.championship_matches.delete_many({
        "championship_id": championship_id,
        "stage": {"$ne": "round_robin"}
    })
    
    # Arrange participants with BYEs
    # Top seeds get BYEs (advance automatically to next round)
    # Remaining participants play in first round
    
    # Sort by seed (knockout_seed was assigned based on section order)
    knockout_participants.sort(key=lambda p: p.get("knockout_seed", 999))
    
    bye_participants = knockout_participants[:num_byes]  # These get BYEs
    playing_participants = knockout_participants[num_byes:]  # These play first round
    
    logging.info(f"BYE participants: {[p['name'] for p in bye_participants]}")
    logging.info(f"Playing participants: {[p['name'] for p in playing_participants]}")
    
    created_matches = []
    
    # Create matches for playing participants
    for i in range(0, len(playing_participants), 2):
        if i + 1 >= len(playing_participants):
            # Odd player out - give them a BYE too
            bye_participants.append(playing_participants[i])
            continue
        
        p1 = playing_participants[i]
        p2 = playing_participants[i + 1]
        rink = all_rinks[(i // 2) % len(all_rinks)]
        
        match_id = str(uuid.uuid4())
        match_doc = {
            "id": match_id,
            "championship_id": championship_id,
            "section_id": None,
            "stage": round_name,
            "bracket_position": i // 2,
            "participant1_id": p1["id"],
            "participant2_id": p2["id"],
            "participant1_name": p1["name"],
            "participant2_name": p2["name"],
            "participant1_shots": None,
            "participant2_shots": None,
            "winner_id": None,
            "is_draw": False,
            "green": rink[0],
            "rink": rink[1],
            "scores_entered": False,
            "verified": False,
            "verified_by": None,
            "verified_at": None,
            "status": "pending",
            "access_token": knockout_access_token
        }
        await db.championship_matches.insert_one(match_doc)
        created_matches.append(match_doc)
    
    # Store BYE participants in championship for next round
    bye_ids = [p["id"] for p in bye_participants]
    bye_names = [p["name"] for p in bye_participants]
    
    # Update championship status
    await db.championships.update_one(
        {"id": championship_id},
        {"$set": {
            "status": "knockout", 
            "current_stage": round_name,
            "bye_participant_ids": bye_ids
        }}
    )
    
    bye_message = ""
    if bye_participants:
        bye_message = f" ({len(bye_participants)} advance automatically: {', '.join(bye_names)})"
    
    return {
        "message": f"Generated {len(created_matches)} knockout matches{bye_message}",
        "round_name": round_name,
        "matches": [ChampionshipMatch(**m) for m in created_matches],
        "access_token": knockout_access_token,
        "bye_participants": bye_names
    }

@api_router.post("/championships/{championship_id}/advance-knockout")
async def advance_knockout_round(championship_id: str, current_user: User = Depends(get_current_user)):
    """Advance to the next knockout round after current matches are verified"""
    import uuid
    import math
    
    # Verify access
    championship = await db.championships.find_one({"id": championship_id}, {"_id": 0})
    if not championship:
        raise HTTPException(status_code=404, detail="Championship not found")
    if championship.get("creator_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    current_stage = championship.get("current_stage", "")
    if current_stage == "final":
        raise HTTPException(status_code=400, detail="Championship already at final stage")
    
    if not current_stage.startswith("knockout"):
        raise HTTPException(status_code=400, detail="Championship not in knockout stage")
    
    # Check all current knockout matches are verified
    unverified = await db.championship_matches.find_one({
        "championship_id": championship_id,
        "stage": current_stage,
        "verified": False
    }, {"_id": 0})
    
    if unverified:
        raise HTTPException(status_code=400, detail="All current knockout matches must be verified first")
    
    # Get winners from current stage
    current_matches = await db.championship_matches.find({
        "championship_id": championship_id,
        "stage": current_stage
    }, {"_id": 0}).to_list(None)
    
    winners = []
    for match in current_matches:
        if match.get("winner_id"):
            winner = await db.championship_participants.find_one({"id": match["winner_id"]}, {"_id": 0})
            if winner:
                winners.append(winner)
    
    # Add BYE participants from previous round
    bye_participant_ids = championship.get("bye_participant_ids", [])
    for bye_id in bye_participant_ids:
        bye_participant = await db.championship_participants.find_one({"id": bye_id}, {"_id": 0})
        if bye_participant and bye_participant not in winners:
            winners.append(bye_participant)
            logging.info(f"Adding BYE participant to next round: {bye_participant['name']}")
    
    total_next_round = len(winners)
    logging.info(f"Advancing knockout: {total_next_round} participants for next round")
    
    if total_next_round < 2:
        # Championship complete - only one winner
        await db.championships.update_one(
            {"id": championship_id},
            {"$set": {"status": "completed", "current_stage": "completed", "bye_participant_ids": []}}
        )
        return {"message": "Championship completed!", "winner": winners[0]["name"] if winners else None}
    
    # Calculate new bracket size and BYEs for next round
    bracket_size = 2 ** math.ceil(math.log2(total_next_round))
    num_byes = bracket_size - total_next_round
    
    # Determine next round name based on bracket size
    if bracket_size == 2:
        next_round = "final"
    elif bracket_size == 4:
        next_round = "knockout_semi"
    elif bracket_size == 8:
        next_round = "knockout_quarter"
    else:
        # Increment round number
        if current_stage.startswith("knockout_round_"):
            current_round_num = int(current_stage.split("_")[-1])
            next_round = f"knockout_round_{current_round_num + 1}"
        else:
            next_round = "knockout_round_2"
    
    # Generate new access token
    next_access_token = secrets.token_urlsafe(32)
    
    # Sort winners (BYE participants first as they're higher seeded)
    # Then split into BYE and playing participants
    bye_participants = winners[:num_byes]
    playing_participants = winners[num_byes:]
    
    # Generate next round matches
    all_rinks = [("A", i) for i in range(1, 7)] + [("B", i) for i in range(1, 7)]
    created_matches = []
    
    for i in range(0, len(playing_participants), 2):
        if i + 1 >= len(playing_participants):
            # Odd participant gets BYE
            bye_participants.append(playing_participants[i])
            continue
        
        p1 = playing_participants[i]
        p2 = playing_participants[i + 1]
        rink = all_rinks[(i // 2) % len(all_rinks)]
        
        match_id = str(uuid.uuid4())
        match_doc = {
            "id": match_id,
            "championship_id": championship_id,
            "section_id": None,
            "stage": next_round,
            "bracket_position": i // 2,
            "participant1_id": p1["id"],
            "participant2_id": p2["id"],
            "participant1_name": p1["name"],
            "participant2_name": p2["name"],
            "participant1_shots": None,
            "participant2_shots": None,
            "winner_id": None,
            "is_draw": False,
            "green": rink[0],
            "rink": rink[1],
            "scores_entered": False,
            "verified": False,
            "verified_by": None,
            "verified_at": None,
            "status": "pending",
            "access_token": next_access_token
        }
        await db.championship_matches.insert_one(match_doc)
        created_matches.append(match_doc)
    
    # Store BYE participants for the next round
    bye_ids = [p["id"] for p in bye_participants]
    bye_names = [p["name"] for p in bye_participants]
    
    # Update championship
    await db.championships.update_one(
        {"id": championship_id},
        {"$set": {"current_stage": next_round, "bye_participant_ids": bye_ids}}
    )
    
    bye_message = ""
    if bye_participants:
        bye_message = f" ({len(bye_participants)} advance automatically: {', '.join(bye_names)})"
    
    return {
        "message": f"Advanced to {next_round}{bye_message}",
        "round_name": next_round,
        "matches": [ChampionshipMatch(**m) for m in created_matches],
        "access_token": next_access_token,
        "bye_participants": bye_names
    }

@api_router.post("/championships/{championship_id}/manual-knockout-entry")
async def manual_knockout_entry(
    championship_id: str, 
    entries: List[KnockoutBracketEntry], 
    current_user: User = Depends(get_current_user)
):
    """Manually enter knockout bracket for knockout-only championships"""
    import uuid
    
    # Verify access
    championship = await db.championships.find_one({"id": championship_id}, {"_id": 0})
    if not championship:
        raise HTTPException(status_code=404, detail="Championship not found")
    if championship.get("creator_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if championship.get("start_type") != "knockout":
        raise HTTPException(status_code=400, detail="This championship has round-robin stage. Use upload instead.")
    
    if len(entries) < 1:
        raise HTTPException(status_code=400, detail="At least one match is required")
    
    # Clear existing data
    await db.championship_sections.delete_many({"championship_id": championship_id})
    await db.championship_participants.delete_many({"championship_id": championship_id})
    await db.championship_matches.delete_many({"championship_id": championship_id})
    
    # Create a single "knockout" section
    section_id = str(uuid.uuid4())
    await db.championship_sections.insert_one({
        "id": section_id,
        "championship_id": championship_id,
        "name": "Knockout",
        "status": "in_progress"
    })
    
    # Create participants and matches
    participants_map = {}
    knockout_access_token = secrets.token_urlsafe(32)
    all_rinks = [("A", i) for i in range(1, 7)] + [("B", i) for i in range(1, 7)]
    
    # Determine round name
    num_matches = len(entries)
    if num_matches == 1:
        round_name = "final"
    elif num_matches <= 2:
        round_name = "knockout_semi"
    elif num_matches <= 4:
        round_name = "knockout_quarter"
    else:
        round_name = "knockout_round_1"
    
    created_matches = []
    
    for i, entry in enumerate(entries):
        # Create participants if not exists
        for name in [entry.participant1_name, entry.participant2_name]:
            if name not in participants_map:
                participant_id = str(uuid.uuid4())
                participant_doc = {
                    "id": participant_id,
                    "championship_id": championship_id,
                    "section_id": section_id,
                    "name": name,
                    "matches_played": 0,
                    "wins": 0,
                    "draws": 0,
                    "losses": 0,
                    "points": 0,
                    "shots_for": 0,
                    "shots_against": 0,
                    "shot_difference": 0,
                    "eliminated": False,
                    "knockout_seed": len(participants_map) + 1
                }
                await db.championship_participants.insert_one(participant_doc)
                participants_map[name] = participant_doc
        
        # Create match
        p1 = participants_map[entry.participant1_name]
        p2 = participants_map[entry.participant2_name]
        rink = all_rinks[i % len(all_rinks)]
        
        match_id = str(uuid.uuid4())
        match_doc = {
            "id": match_id,
            "championship_id": championship_id,
            "section_id": None,
            "stage": round_name,
            "bracket_position": i,
            "participant1_id": p1["id"],
            "participant2_id": p2["id"],
            "participant1_name": p1["name"],
            "participant2_name": p2["name"],
            "participant1_shots": None,
            "participant2_shots": None,
            "winner_id": None,
            "is_draw": False,
            "green": rink[0],
            "rink": rink[1],
            "scores_entered": False,
            "verified": False,
            "verified_by": None,
            "verified_at": None,
            "status": "pending",
            "access_token": knockout_access_token
        }
        await db.championship_matches.insert_one(match_doc)
        created_matches.append(match_doc)
    
    # Update championship status
    await db.championships.update_one(
        {"id": championship_id},
        {"$set": {"status": "knockout", "current_stage": round_name}}
    )
    
    return {
        "message": f"Created {len(created_matches)} knockout matches",
        "round_name": round_name,
        "matches": [ChampionshipMatch(**m) for m in created_matches],
        "participants": list(participants_map.keys()),
        "access_token": knockout_access_token
    }

@api_router.post("/championships/{championship_id}/setup-full-knockout")
async def setup_full_knockout_bracket(
    championship_id: str,
    bracket_setup: KnockoutBracketSetup,
    current_user: User = Depends(get_current_user)
):
    """
    Set up a complete knockout bracket with all rounds pre-created.
    Supports preliminary rounds for 17-24 teams, with matches linked for auto-advancement.
    """
    import uuid
    
    # Verify access
    championship = await db.championships.find_one({"id": championship_id}, {"_id": 0})
    if not championship:
        raise HTTPException(status_code=404, detail="Championship not found")
    if championship.get("creator_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Clear existing data
    await db.championship_sections.delete_many({"championship_id": championship_id})
    await db.championship_participants.delete_many({"championship_id": championship_id})
    await db.championship_matches.delete_many({"championship_id": championship_id})
    
    # Create a single "knockout" section
    section_id = str(uuid.uuid4())
    await db.championship_sections.insert_one({
        "id": section_id,
        "championship_id": championship_id,
        "name": "Knockout",
        "status": "in_progress"
    })
    
    participants_map = {}  # name -> participant_doc
    all_matches = []  # Store all created matches
    match_by_stage_number = {}  # (stage, match_number) -> match_doc
    
    access_token = secrets.token_urlsafe(32)
    
    async def get_or_create_participant(name: str) -> dict:
        """Get existing participant or create new one"""
        if name == "TBD" or not name:
            return None
        if name in participants_map:
            return participants_map[name]
        
        participant_id = str(uuid.uuid4())
        participant_doc = {
            "id": participant_id,
            "championship_id": championship_id,
            "section_id": section_id,
            "name": name,
            "matches_played": 0,
            "wins": 0, "draws": 0, "losses": 0, "points": 0,
            "shots_for": 0, "shots_against": 0, "shot_difference": 0,
            "eliminated": False,
            "knockout_seed": len(participants_map) + 1
        }
        await db.championship_participants.insert_one(participant_doc)
        participants_map[name] = participant_doc
        return participant_doc
    
    async def create_match(stage: str, setup: KnockoutMatchSetup) -> dict:
        """Create a single match"""
        p1 = await get_or_create_participant(setup.participant1_name)
        p2 = await get_or_create_participant(setup.participant2_name)
        
        match_id = str(uuid.uuid4())
        match_doc = {
            "id": match_id,
            "championship_id": championship_id,
            "section_id": None,
            "stage": stage,
            "bracket_position": setup.match_number,
            "match_number": setup.match_number,
            "participant1_id": p1["id"] if p1 else None,
            "participant2_id": p2["id"] if p2 else None,
            "participant1_name": setup.participant1_name or "TBD",
            "participant2_name": setup.participant2_name or "TBD",
            "participant1_shots": None,
            "participant2_shots": None,
            "winner_id": None,
            "is_draw": False,
            "green": setup.green,
            "rink": setup.rink,
            "scheduled_date": setup.scheduled_date,
            "scheduled_time": setup.scheduled_time,
            "next_match_id": None,
            "next_match_slot": None,
            "source_match_ids": [],
            "scores_entered": False,
            "verified": False,
            "status": "pending",
            "access_token": access_token
        }
        await db.championship_matches.insert_one(match_doc)
        match_by_stage_number[(stage, setup.match_number)] = match_doc
        all_matches.append(match_doc)
        return match_doc
    
    # Create all matches by stage
    # 1. Preliminary matches (if any)
    if bracket_setup.preliminary_matches:
        for setup in bracket_setup.preliminary_matches:
            await create_match("preliminary", setup)
    
    # 2. Last 16 matches
    for setup in bracket_setup.last_16_matches:
        await create_match("last_16", setup)
    
    # 3. Quarter finals (if provided, otherwise create TBD matches)
    if bracket_setup.quarter_final_matches:
        for setup in bracket_setup.quarter_final_matches:
            await create_match("quarter_final", setup)
    else:
        # Auto-create 4 quarter final matches
        for i in range(1, 5):
            setup = KnockoutMatchSetup(match_number=i, participant1_name="TBD", participant2_name="TBD")
            await create_match("quarter_final", setup)
    
    # 4. Semi finals (if provided, otherwise create TBD matches)
    if bracket_setup.semi_final_matches:
        for setup in bracket_setup.semi_final_matches:
            await create_match("semi_final", setup)
    else:
        # Auto-create 2 semi final matches
        for i in range(1, 3):
            setup = KnockoutMatchSetup(match_number=i, participant1_name="TBD", participant2_name="TBD")
            await create_match("semi_final", setup)
    
    # 5. Final
    if bracket_setup.final_match:
        await create_match("final", bracket_setup.final_match)
    else:
        setup = KnockoutMatchSetup(match_number=1, participant1_name="TBD", participant2_name="TBD")
        await create_match("final", setup)
    
    # Now link matches: set next_match_id and next_match_slot
    # Preliminary -> Last 16 (using mapping if provided)
    if bracket_setup.preliminary_to_last16_mapping:
        for mapping in bracket_setup.preliminary_to_last16_mapping:
            prelim_match = match_by_stage_number.get(("preliminary", mapping["preliminary_match"]))
            last16_match = match_by_stage_number.get(("last_16", mapping["last16_match"]))
            if prelim_match and last16_match:
                await db.championship_matches.update_one(
                    {"id": prelim_match["id"]},
                    {"$set": {
                        "next_match_id": last16_match["id"],
                        "next_match_slot": mapping["slot"]
                    }}
                )
                # Add source match reference
                await db.championship_matches.update_one(
                    {"id": last16_match["id"]},
                    {"$push": {"source_match_ids": prelim_match["id"]}}
                )
    
    # Last 16 -> Quarter finals (standard bracket progression)
    # Match 1&2 -> QF1, Match 3&4 -> QF2, etc.
    last16_matches = sorted([m for m in all_matches if m["stage"] == "last_16"], key=lambda x: x["match_number"])
    qf_matches = sorted([m for m in all_matches if m["stage"] == "quarter_final"], key=lambda x: x["match_number"])
    
    for i, l16_match in enumerate(last16_matches):
        qf_index = i // 2
        slot = (i % 2) + 1
        if qf_index < len(qf_matches):
            await db.championship_matches.update_one(
                {"id": l16_match["id"]},
                {"$set": {"next_match_id": qf_matches[qf_index]["id"], "next_match_slot": slot}}
            )
            await db.championship_matches.update_one(
                {"id": qf_matches[qf_index]["id"]},
                {"$push": {"source_match_ids": l16_match["id"]}}
            )
    
    # Quarter finals -> Semi finals
    for i, qf_match in enumerate(qf_matches):
        sf_index = i // 2
        slot = (i % 2) + 1
        sf_matches = sorted([m for m in all_matches if m["stage"] == "semi_final"], key=lambda x: x["match_number"])
        if sf_index < len(sf_matches):
            await db.championship_matches.update_one(
                {"id": qf_match["id"]},
                {"$set": {"next_match_id": sf_matches[sf_index]["id"], "next_match_slot": slot}}
            )
            await db.championship_matches.update_one(
                {"id": sf_matches[sf_index]["id"]},
                {"$push": {"source_match_ids": qf_match["id"]}}
            )
    
    # Semi finals -> Final
    final_match = next((m for m in all_matches if m["stage"] == "final"), None)
    sf_matches = sorted([m for m in all_matches if m["stage"] == "semi_final"], key=lambda x: x["match_number"])
    for i, sf_match in enumerate(sf_matches):
        if final_match:
            await db.championship_matches.update_one(
                {"id": sf_match["id"]},
                {"$set": {"next_match_id": final_match["id"], "next_match_slot": i + 1}}
            )
            await db.championship_matches.update_one(
                {"id": final_match["id"]},
                {"$push": {"source_match_ids": sf_match["id"]}}
            )
    
    # Determine initial stage
    initial_stage = "preliminary" if bracket_setup.preliminary_matches else "last_16"
    
    # Update championship status
    await db.championships.update_one(
        {"id": championship_id},
        {"$set": {"status": "knockout", "current_stage": initial_stage}}
    )
    
    return {
        "message": f"Created complete knockout bracket with {len(all_matches)} matches",
        "stages": {
            "preliminary": len(bracket_setup.preliminary_matches or []),
            "last_16": len(bracket_setup.last_16_matches),
            "quarter_final": len([m for m in all_matches if m["stage"] == "quarter_final"]),
            "semi_final": len([m for m in all_matches if m["stage"] == "semi_final"]),
            "final": 1
        },
        "participants": list(participants_map.keys()),
        "access_token": access_token
    }

@api_router.get("/public/championships/{championship_id}/standings")
async def get_public_championship_standings(championship_id: str):
    """Get public standings for a championship"""
    championship = await db.championships.find_one({"id": championship_id}, {"_id": 0})
    if not championship:
        raise HTTPException(status_code=404, detail="Championship not found")
    
    sections = await db.championship_sections.find({"championship_id": championship_id}, {"_id": 0}).to_list(None)
    
    result = {
        "championship": Championship(**championship),
        "sections": []
    }
    
    for section in sections:
        participants = await db.championship_participants.find(
            {"championship_id": championship_id, "section_id": section["id"]},
            {"_id": 0}
        ).to_list(None)
        
        # Sort by: points (desc), shot_difference (desc), shots_for (desc)
        sorted_participants = sorted(participants, key=lambda p: (
            -p.get("points", 0),
            -p.get("shot_difference", 0),
            -p.get("shots_for", 0)
        ))
        
        result["sections"].append({
            "section": ChampionshipSection(**section),
            "standings": [ChampionshipParticipant(**p) for p in sorted_participants]
        })
    
    return result

@api_router.get("/public/championships/{championship_id}/bracket")
async def get_public_championship_bracket(championship_id: str):
    """Get knockout bracket for a championship"""
    championship = await db.championships.find_one({"id": championship_id}, {"_id": 0})
    if not championship:
        raise HTTPException(status_code=404, detail="Championship not found")
    
    # Get all knockout matches
    matches = await db.championship_matches.find({
        "championship_id": championship_id,
        "stage": {"$ne": "round_robin"}
    }, {"_id": 0}).to_list(None)
    
    # Group by stage
    bracket = {}
    for match in matches:
        stage = match.get("stage", "unknown")
        if stage not in bracket:
            bracket[stage] = []
        bracket[stage].append(ChampionshipMatch(**match))
    
    # Get BYE participants
    bye_ids = championship.get("bye_participant_ids", [])
    bye_participants = []
    for bye_id in bye_ids:
        participant = await db.championship_participants.find_one({"id": bye_id}, {"_id": 0})
        if participant:
            bye_participants.append({
                "id": participant["id"],
                "name": participant["name"],
                "status": "Advances automatically"
            })
    
    return {
        "championship": Championship(**championship),
        "bracket": bracket,
        "bye_participants": bye_participants
    }

# ==================== DELETE ROUTES (Without Archive) ====================

@api_router.delete("/tournaments/{tournament_id}")
async def delete_tournament(tournament_id: str, current_user: User = Depends(get_current_user)):
    """Delete a tournament permanently without archiving"""
    # Get tournament
    tournament = await db.tournaments.find_one({"id": tournament_id}, {"_id": 0})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    # Verify ownership
    if tournament.get("creator_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied - must be tournament creator")
    
    # Delete all related data
    await db.matches.delete_many({"tournament_id": tournament_id})
    await db.rounds.delete_many({"tournament_id": tournament_id})
    await db.teams.delete_many({"tournament_id": tournament_id})
    await db.tournaments.delete_one({"id": tournament_id})
    
    return {"message": "Tournament deleted successfully"}

@api_router.delete("/championships/{championship_id}")
async def delete_championship(championship_id: str, current_user: User = Depends(get_current_user)):
    """Delete a championship permanently without archiving"""
    # Get championship
    championship = await db.championships.find_one({"id": championship_id}, {"_id": 0})
    if not championship:
        raise HTTPException(status_code=404, detail="Championship not found")
    
    # Verify ownership
    if championship.get("creator_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied - must be championship creator")
    
    # Delete all related data
    await db.championship_matches.delete_many({"championship_id": championship_id})
    await db.championship_participants.delete_many({"championship_id": championship_id})
    await db.championship_sections.delete_many({"championship_id": championship_id})
    await db.championships.delete_one({"id": championship_id})
    
    return {"message": "Championship deleted successfully"}

# ==================== ARCHIVE ROUTES ====================

@api_router.post("/tournaments/{tournament_id}/archive")
async def archive_tournament(tournament_id: str, current_user: User = Depends(get_current_user)):
    """Archive a completed tournament and delete original data"""
    import uuid
    from dateutil.relativedelta import relativedelta
    
    # Get tournament
    tournament = await db.tournaments.find_one({"id": tournament_id}, {"_id": 0})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found")
    
    # Verify ownership
    if tournament.get("creator_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied - must be tournament creator")
    
    # Get teams for standings
    teams = await db.teams.find({"tournament_id": tournament_id}, {"_id": 0}).to_list(None)
    
    # Sort teams by points/standings
    tournament_type = tournament.get("type", "skins")
    if tournament_type == "standard":
        sorted_teams = sorted(teams, key=lambda t: (
            -t.get("match_points", 0),
            -t.get("shots_for", 0) + t.get("shots_against", 0),
            -t.get("shots_for", 0)
        ))
    else:
        sorted_teams = sorted(teams, key=lambda t: -t.get("total_points", 0))
    
    # Determine winner and runner-up
    winner = sorted_teams[0]["name"] if len(sorted_teams) > 0 else "N/A"
    runner_up = sorted_teams[1]["name"] if len(sorted_teams) > 1 else "N/A"
    
    # Get final scores
    final_score = ""
    if len(sorted_teams) >= 2:
        if tournament_type == "standard":
            final_score = f"{sorted_teams[0].get('match_points', 0)} - {sorted_teams[1].get('match_points', 0)} (Match Points)"
        else:
            final_score = f"{sorted_teams[0].get('total_points', 0)} - {sorted_teams[1].get('total_points', 0)} (Skin Points)"
    
    # Build final standings
    final_standings = []
    for i, team in enumerate(sorted_teams):
        standing = {
            "position": i + 1,
            "name": team["name"],
            "points": team.get("match_points", 0) if tournament_type == "standard" else team.get("total_points", 0),
            "shots_for": team.get("shots_for", 0),
            "shots_against": team.get("shots_against", 0)
        }
        final_standings.append(standing)
    
    # Create archive record
    archive_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    expires_at = now + relativedelta(years=2)
    
    archive_doc = {
        "id": archive_id,
        "original_id": tournament_id,
        "name": tournament["name"],
        "type": tournament_type,
        "competition_type": None,
        "gender_category": None,
        "winner": winner,
        "runner_up": runner_up,
        "final_score": final_score,
        "participants": [t["name"] for t in teams],
        "final_standings": final_standings,
        "archived_at": now.isoformat(),
        "expires_at": expires_at.isoformat(),
        "archived_by": current_user.id
    }
    
    await db.archived_tournaments.insert_one(archive_doc)
    
    # Delete original tournament data
    await db.matches.delete_many({"tournament_id": tournament_id})
    await db.rounds.delete_many({"tournament_id": tournament_id})
    await db.teams.delete_many({"tournament_id": tournament_id})
    await db.tournaments.delete_one({"id": tournament_id})
    
    return {"message": "Tournament archived successfully", "archive_id": archive_id}

@api_router.post("/championships/{championship_id}/archive")
async def archive_championship(championship_id: str, current_user: User = Depends(get_current_user)):
    """Archive a completed championship and delete original data"""
    import uuid
    from dateutil.relativedelta import relativedelta
    
    # Get championship
    championship = await db.championships.find_one({"id": championship_id}, {"_id": 0})
    if not championship:
        raise HTTPException(status_code=404, detail="Championship not found")
    
    # Verify ownership
    if championship.get("creator_id") != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied - must be championship creator")
    
    # Get participants
    participants = await db.championship_participants.find(
        {"championship_id": championship_id}, 
        {"_id": 0}
    ).to_list(None)
    
    # Get final match to determine winner
    final_match = await db.championship_matches.find_one(
        {"championship_id": championship_id, "stage": "final", "verified": True},
        {"_id": 0}
    )
    
    winner = "N/A"
    runner_up = "N/A"
    final_score = "N/A"
    
    if final_match:
        if final_match.get("winner_id") == final_match.get("participant1_id"):
            winner = final_match["participant1_name"]
            runner_up = final_match["participant2_name"]
        else:
            winner = final_match["participant2_name"]
            runner_up = final_match["participant1_name"]
        final_score = f"{final_match.get('participant1_shots', 0)} - {final_match.get('participant2_shots', 0)}"
    
    # Build final standings (for round robin sections)
    final_standings = []
    sections = await db.championship_sections.find({"championship_id": championship_id}, {"_id": 0}).to_list(None)
    
    for section in sections:
        section_participants = [p for p in participants if p.get("section_id") == section["id"]]
        sorted_participants = sorted(section_participants, key=lambda p: (
            -p.get("points", 0),
            -p.get("shot_difference", 0),
            -p.get("shots_for", 0)
        ))
        
        for i, p in enumerate(sorted_participants):
            final_standings.append({
                "position": i + 1,
                "section": section["name"],
                "name": p["name"],
                "points": p.get("points", 0),
                "wins": p.get("wins", 0),
                "draws": p.get("draws", 0),
                "losses": p.get("losses", 0),
                "shots_for": p.get("shots_for", 0),
                "shots_against": p.get("shots_against", 0)
            })
    
    # Create archive record
    archive_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    expires_at = now + relativedelta(years=2)
    
    archive_doc = {
        "id": archive_id,
        "original_id": championship_id,
        "name": championship["name"],
        "type": "championship",
        "competition_type": championship.get("competition_type"),
        "gender_category": championship.get("gender_category"),
        "winner": winner,
        "runner_up": runner_up,
        "final_score": final_score,
        "participants": [p["name"] for p in participants],
        "final_standings": final_standings,
        "archived_at": now.isoformat(),
        "expires_at": expires_at.isoformat(),
        "archived_by": current_user.id
    }
    
    await db.archived_tournaments.insert_one(archive_doc)
    
    # Delete original championship data
    await db.championship_matches.delete_many({"championship_id": championship_id})
    await db.championship_participants.delete_many({"championship_id": championship_id})
    await db.championship_sections.delete_many({"championship_id": championship_id})
    await db.championships.delete_one({"id": championship_id})
    
    return {"message": "Championship archived successfully", "archive_id": archive_id}

@api_router.get("/archives")
async def get_archived_tournaments(current_user: User = Depends(get_current_user)):
    """Get all archived tournaments for the current user"""
    archives = await db.archived_tournaments.find(
        {"archived_by": current_user.id}, 
        {"_id": 0}
    ).sort("archived_at", -1).to_list(None)
    
    return [ArchivedTournament(**a) for a in archives]

@api_router.get("/archives/{archive_id}")
async def get_archived_tournament(archive_id: str, current_user: User = Depends(get_current_user)):
    """Get a specific archived tournament"""
    archive = await db.archived_tournaments.find_one({"id": archive_id}, {"_id": 0})
    if not archive:
        raise HTTPException(status_code=404, detail="Archive not found")
    
    return ArchivedTournament(**archive)

@api_router.get("/archives/{archive_id}/download")
async def download_archived_tournament(archive_id: str, current_user: User = Depends(get_current_user)):
    """Get archived tournament data in downloadable format"""
    archive = await db.archived_tournaments.find_one({"id": archive_id}, {"_id": 0})
    if not archive:
        raise HTTPException(status_code=404, detail="Archive not found")
    
    # Return data formatted for CSV download
    csv_data = []
    csv_data.append(["Tournament/Championship Results"])
    csv_data.append(["Name", archive["name"]])
    csv_data.append(["Type", archive.get("type", "N/A")])
    if archive.get("competition_type"):
        csv_data.append(["Competition", archive["competition_type"]])
    if archive.get("gender_category"):
        csv_data.append(["Category", archive["gender_category"]])
    csv_data.append(["Winner", archive["winner"]])
    csv_data.append(["Runner-up", archive["runner_up"]])
    csv_data.append(["Final Score", archive["final_score"]])
    csv_data.append(["Archived", archive["archived_at"][:10]])
    csv_data.append([])
    csv_data.append(["Final Standings"])
    
    standings = archive.get("final_standings", [])
    if standings:
        # Determine headers based on type
        if archive.get("type") == "championship":
            csv_data.append(["Position", "Section", "Name", "Points", "W", "D", "L", "SF", "SA"])
            for s in standings:
                csv_data.append([
                    s.get("position", ""),
                    s.get("section", ""),
                    s.get("name", ""),
                    s.get("points", 0),
                    s.get("wins", 0),
                    s.get("draws", 0),
                    s.get("losses", 0),
                    s.get("shots_for", 0),
                    s.get("shots_against", 0)
                ])
        else:
            csv_data.append(["Position", "Name", "Points", "Shots For", "Shots Against"])
            for s in standings:
                csv_data.append([
                    s.get("position", ""),
                    s.get("name", ""),
                    s.get("points", 0),
                    s.get("shots_for", 0),
                    s.get("shots_against", 0)
                ])
    
    csv_data.append([])
    csv_data.append(["Participants"])
    for p in archive.get("participants", []):
        csv_data.append([p])
    
    return {"csv_data": csv_data, "filename": f"{archive['name'].replace(' ', '_')}_results.csv"}

@api_router.delete("/archives/{archive_id}")
async def delete_archived_tournament(archive_id: str, current_user: User = Depends(get_current_user)):
    """Manually delete an archived tournament"""
    archive = await db.archived_tournaments.find_one({"id": archive_id}, {"_id": 0})
    if not archive:
        raise HTTPException(status_code=404, detail="Archive not found")
    
    if archive.get("archived_by") != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    await db.archived_tournaments.delete_one({"id": archive_id})
    
    return {"message": "Archive deleted successfully"}

# Cleanup expired archives (should be called periodically)
@api_router.post("/archives/cleanup-expired")
async def cleanup_expired_archives(current_user: User = Depends(get_current_user)):
    """Delete archives older than 2 years"""
    now = datetime.now(timezone.utc).isoformat()
    
    result = await db.archived_tournaments.delete_many({
        "archived_by": current_user.id,
        "expires_at": {"$lt": now}
    })
    
    return {"message": f"Deleted {result.deleted_count} expired archives"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()