#!/usr/bin/env python3
"""
Fix existing rounds that don't have access_tokens
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path
import secrets

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def fix_round_tokens():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    # Find all rounds without access_token
    rounds = await db.rounds.find({"access_token": None}, {"_id": 0}).to_list(None)
    
    print(f"Found {len(rounds)} rounds without access_token")
    
    for round_data in rounds:
        access_token = secrets.token_urlsafe(32)
        await db.rounds.update_one(
            {"id": round_data["id"]},
            {"$set": {"access_token": access_token}}
        )
        print(f"✓ Added token to Round {round_data['round_number']} (ID: {round_data['id']})")
    
    print(f"\n✓ Fixed {len(rounds)} rounds")
    client.close()

if __name__ == "__main__":
    asyncio.run(fix_round_tokens())
