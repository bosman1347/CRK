from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
import random
import secrets

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

class Tournament(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    creator_id: str
    umpire_id: str
    umpire_name: str
    status: str
    current_round: int
    created_at: str

class Team(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    tournament_id: str
    name: str
    total_points: float
    matches_played: int
    matches_won: int

class Round(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    tournament_id: str
    round_number: int
    status: str

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
    access_token: str
    skin1_team1_shots: Optional[int] = None
    skin1_team2_shots: Optional[int] = None
    skin2_team1_shots: Optional[int] = None
    skin2_team2_shots: Optional[int] = None
    skin3_team1_shots: Optional[int] = None
    skin3_team2_shots: Optional[int] = None
    team1_skin_points: float = 0.0
    team2_skin_points: float = 0.0
    team1_match_points: float = 0.0
    team2_match_points: float = 0.0
    team1_scores_entered: bool = False
    team2_scores_entered: bool = False
    verified: bool = False
    verified_by: Optional[str] = None
    verified_at: Optional[str] = None
    status: str = "pending"

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
    if not current_user.is_umpire:
        raise HTTPException(status_code=403, detail="Umpire access required")
    return current_user

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
            "matches_won": 0
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

# Umpire routes
@api_router.get("/umpire/tournaments")
async def get_umpire_tournaments(current_user: User = Depends(get_current_umpire)):
    tournaments = await db.tournaments.find({"umpire_id": current_user.id}, {"_id": 0}).to_list(None)
    return [Tournament(**t) for t in tournaments]

@api_router.post("/umpire/tournaments/{tournament_id}/rounds/generate")
async def umpire_generate_round(tournament_id: str, current_user: User = Depends(get_current_umpire)):
    tournament = await db.tournaments.find_one({"id": tournament_id, "umpire_id": current_user.id}, {"_id": 0})
    if not tournament:
        raise HTTPException(status_code=404, detail="Tournament not found or access denied")
    
    current_round_num = tournament["current_round"]
    
    # Check if current round matches are all verified
    if current_round_num > 0:
        current_round = await db.rounds.find_one({"tournament_id": tournament_id, "round_number": current_round_num}, {"_id": 0})
        if current_round:
            matches = await db.matches.find({"round_id": current_round["id"]}, {"_id": 0}).to_list(None)
            if any(not m["verified"] for m in matches):
                raise HTTPException(status_code=400, detail="All matches must be verified before generating next round")
    
    if current_round_num >= 7:
        raise HTTPException(status_code=400, detail="Tournament already has 7 rounds")
    
    import uuid
    next_round_num = current_round_num + 1
    round_id = str(uuid.uuid4())
    round_doc = {
        "id": round_id,
        "tournament_id": tournament_id,
        "round_number": next_round_num,
        "status": "active"
    }
    await db.rounds.insert_one(round_doc)
    
    # Generate matches
    matches = await generate_draw(tournament_id, next_round_num)
    
    for match_data in matches:
        match_id = str(uuid.uuid4())
        access_token = secrets.token_urlsafe(32)
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
            "access_token": access_token,
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
            "team1_scores_entered": False,
            "team2_scores_entered": False,
            "verified": False,
            "verified_by": None,
            "verified_at": None,
            "status": "pending"
        }
        await db.matches.insert_one(match_doc)
    
    # Update tournament
    await db.tournaments.update_one(
        {"id": tournament_id},
        {"$set": {"status": "active", "current_round": next_round_num}}
    )
    
    return {"message": f"Round {next_round_num} created", "round_id": round_id}

@api_router.get("/umpire/rounds/{round_id}/matches")
async def get_umpire_round_matches(round_id: str, current_user: User = Depends(get_current_umpire)):
    matches = await db.matches.find({"round_id": round_id}, {"_id": 0}).to_list(None)
    return [Match(**m) for m in matches]

@api_router.post("/umpire/matches/{match_id}/verify")
async def verify_match(match_id: str, verification: UmpireVerification, current_user: User = Depends(get_current_umpire)):
    match = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    if match["verified"]:
        raise HTTPException(status_code=400, detail="Match already verified")
    
    # Calculate points
    t1_sp, t2_sp, t1_mp, t2_mp = calculate_match_points(
        verification.skin1_team1_shots, verification.skin1_team2_shots,
        verification.skin2_team1_shots, verification.skin2_team2_shots,
        verification.skin3_team1_shots, verification.skin3_team2_shots
    )
    
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
            "verified": True,
            "verified_by": current_user.id,
            "verified_at": datetime.now(timezone.utc).isoformat(),
            "status": "completed"
        }}
    )
    
    # Update team stats
    await db.teams.update_one(
        {"id": match["team1_id"]},
        {"$inc": {"total_points": t1_mp, "matches_played": 1, "matches_won": 1 if t1_mp > t2_mp else 0}}
    )
    await db.teams.update_one(
        {"id": match["team2_id"]},
        {"$inc": {"total_points": t2_mp, "matches_played": 1, "matches_won": 1 if t2_mp > t1_mp else 0}}
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

# Public token-based score entry
@api_router.get("/matches/by-token/{token}")
async def get_match_by_token(token: str):
    match = await db.matches.find_one({"access_token": token}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    # Don't return access_token in response
    match_data = Match(**match)
    return match_data

@api_router.post("/matches/by-token/{token}/scores")
async def submit_team_scores(token: str, score_entry: TeamScoreEntry):
    match = await db.matches.find_one({"access_token": token}, {"_id": 0})
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
    entered_field = f"team{team_num}_scores_entered"
    
    await db.matches.update_one(
        {"access_token": token},
        {"$set": {field_name: score_entry.shots, entered_field: True}}
    )
    
    return {"message": "Score submitted successfully"}

# Public routes
@api_router.get("/public/tournaments/{tournament_id}/standings")
async def get_public_standings(tournament_id: str):
    teams = await db.teams.find({"tournament_id": tournament_id}, {"_id": 0}).sort("total_points", -1).to_list(None)
    return [Team(**t) for t in teams]

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