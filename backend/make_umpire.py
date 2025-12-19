#!/usr/bin/env python3
"""
Utility script to promote a user to umpire role
Usage: python make_umpire.py <email>
"""
import sys
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def make_umpire(email: str):
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    result = await db.users.update_one(
        {"email": email},
        {"$set": {"is_umpire": True}}
    )
    
    if result.matched_count == 0:
        print(f"Error: User with email '{email}' not found")
        return False
    
    print(f"✓ User '{email}' is now an umpire")
    client.close()
    return True

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python make_umpire.py <email>")
        sys.exit(1)
    
    email = sys.argv[1]
    asyncio.run(make_umpire(email))
