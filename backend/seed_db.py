import asyncio
import random
import uuid
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

# Import the database session and models
from db.models import User, Farm, InsurancePolicy, Claim, FarmStatus, PolicyStatus, ClaimStatus
from core.security import get_password_hash
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

import os
from core.config import settings

DATABASE_URL = os.getenv("DATABASE_URL") or settings.DATABASE_URL
engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Common Hindi names and surnames in MP
FIRST_NAMES = ["Rajesh", "Suresh", "Amit", "Ramesh", "Mukesh", "Vijay", "Anil", "Sunil", "Prakash", "Dinesh", "Kailash", "Gopal", "Ram", "Shyam", "Hari", "Babulal", "Santosh", "Mahesh", "Narendra", "Ashok"]
LAST_NAMES = ["Patel", "Sharma", "Singh", "Yadav", "Chouhan", "Verma", "Rathore", "Rajput", "Kushwaha", "Mishra", "Jain", "Lodhi", "Vishwakarma", "Prajapati", "Gupta"]

CROPS = ["Wheat", "Soybean", "Gram", "Mustard", "Maize", "Cotton", "Paddy"]

# MP approximate center (Bhopal region)
BASE_LAT = 23.2599
BASE_LON = 77.4126

def generate_polygon() -> str:
    # Generate a small square polygon roughly representing 1-2 hectares
    offset_lat = (random.random() - 0.5) * 5.0 # Spread across MP
    offset_lon = (random.random() - 0.5) * 5.0
    
    center_lat = BASE_LAT + offset_lat
    center_lon = BASE_LON + offset_lon
    
    # Square of roughly 100x100 meters (0.001 degrees)
    delta = 0.001
    
    return f"SRID=4326;POLYGON(({center_lon} {center_lat}, {center_lon + delta} {center_lat}, {center_lon + delta} {center_lat + delta}, {center_lon} {center_lat + delta}, {center_lon} {center_lat}))"

async def clear_db(session: AsyncSession):
    # Clear existing data (optional, but good for fresh seeding)
    # Caution: This deletes everything! We will just append for now unless requested.
    pass

async def seed():
    print("Starting database seed for 1000 Farmers x 5 Farms...")
    async with AsyncSessionLocal() as session:
        # Pre-hash password for all farmers to save time
        default_pwd_hash = get_password_hash("password123")
        
        users_to_add = []
        all_farms = []
        all_policies = []
        all_claims = []
        
        # Batching because 1000 users * 5 farms is 6000 objects
        for i in range(1000):
            first_name = random.choice(FIRST_NAMES)
            last_name = random.choice(LAST_NAMES)
            
            user = User(
                id=uuid.uuid4(),
                name=f"{first_name} {last_name}",
                phone=f"9{random.randint(100000000, 999999999)}", # 10 digit random
                email=f"farmer{i}_{random.randint(1000,9999)}@example.com",
                language="hi",
                hashed_password=default_pwd_hash
            )
            users_to_add.append(user)
            
            # Farm 1: Insured + Claim (Calamity)
            f1 = Farm(
                id=uuid.uuid4(),
                user_id=user.id,
                name="North Plot (Claim Pending)",
                crop=random.choice(CROPS),
                sowing_date=datetime.utcnow() - timedelta(days=60),
                area_m2=random.randint(10000, 50000),
                boundary=generate_polygon(),
                status=FarmStatus.VERIFIED
            )
            p1 = InsurancePolicy(
                id=uuid.uuid4(),
                user_id=user.id,
                farm_id=f1.id,
                premium_amount=random.uniform(500, 2000),
                coverage_amount=random.uniform(20000, 100000),
                status=PolicyStatus.ACTIVE
            )
            c1 = Claim(
                id=uuid.uuid4(),
                farm_id=f1.id,
                policy_id=p1.id,
                incident_date=datetime.utcnow() - timedelta(days=5),
                event_type=random.choice(["Drought", "Flooding", "Pest Infestation"]),
                description="Crop damaged due to extreme weather.",
                status=ClaimStatus.SUBMITTED,
                damage_pct=random.uniform(30.0, 80.0),
                ai_confidence=random.uniform(0.7, 0.95)
            )
            all_farms.append(f1)
            all_policies.append(p1)
            all_claims.append(c1)
            
            # Farm 2: Uninsured (Sown, ready for buy flow)
            f2 = Farm(
                id=uuid.uuid4(),
                user_id=user.id,
                name="South Field (Uninsured)",
                crop=random.choice(CROPS),
                sowing_date=datetime.utcnow() - timedelta(days=30),
                area_m2=random.randint(10000, 50000),
                boundary=generate_polygon(),
                status=FarmStatus.VERIFIED
            )
            all_farms.append(f2)
            
            # Farm 3: AI-Ready (Healthy, Insured)
            f3 = Farm(
                id=uuid.uuid4(),
                user_id=user.id,
                name="Main Field (Healthy)",
                crop=random.choice(CROPS),
                sowing_date=datetime.utcnow() - timedelta(days=45),
                area_m2=random.randint(10000, 50000),
                boundary=generate_polygon(),
                status=FarmStatus.VERIFIED
            )
            p3 = InsurancePolicy(
                id=uuid.uuid4(),
                user_id=user.id,
                farm_id=f3.id,
                premium_amount=random.uniform(500, 2000),
                coverage_amount=random.uniform(20000, 100000),
                status=PolicyStatus.ACTIVE
            )
            all_farms.append(f3)
            all_policies.append(p3)
            
            # Farm 4: Empty Land (Unsown)
            f4 = Farm(
                id=uuid.uuid4(),
                user_id=user.id,
                name="New acquired land",
                crop=None,
                sowing_date=None,
                area_m2=random.randint(10000, 50000),
                boundary=generate_polygon(),
                status=FarmStatus.PENDING
            )
            all_farms.append(f4)
            
            # Farm 5: The "Extra" (e.g. Recently harvested or low risk)
            f5 = Farm(
                id=uuid.uuid4(),
                user_id=user.id,
                name="East Plot",
                crop=random.choice(CROPS),
                sowing_date=datetime.utcnow() - timedelta(days=120),
                area_m2=random.randint(10000, 50000),
                boundary=generate_polygon(),
                status=FarmStatus.VERIFIED
            )
            all_farms.append(f5)
            
            # Print progress
            if (i + 1) % 100 == 0:
                print(f"Generated {i + 1} farmers in memory...")

        print("Writing to database. This may take a moment...")
        
        # Batch insert to avoid huge memory spike
        batch_size = 500
        for i in range(0, len(users_to_add), batch_size):
            session.add_all(users_to_add[i:i+batch_size])
        await session.commit()
        
        for i in range(0, len(all_farms), batch_size):
            session.add_all(all_farms[i:i+batch_size])
        await session.commit()
        
        for i in range(0, len(all_policies), batch_size):
            session.add_all(all_policies[i:i+batch_size])
        await session.commit()
        
        for i in range(0, len(all_claims), batch_size):
            session.add_all(all_claims[i:i+batch_size])
        await session.commit()

        print("Database seed complete! 1000 farmers and 5000 farms added.")

if __name__ == "__main__":
    asyncio.run(seed())
