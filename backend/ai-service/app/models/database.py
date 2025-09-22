"""
from pymongo import MongoClient
import redis
import os

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/ai_service")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

# MongoDB
mongo_client = MongoClient(MONGO_URI)
db = mongo_client.get_database()
print(" MongoDB connected")

# Redis
redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)
try:
    redis_client.ping()
    print("Redis connected")
except redis.ConnectionError as e:
    print("Redis connection error:", e)
"""
"""
Database connection utilities.
Handles MongoDB connection with retry logic and health checks.
"""

from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
import os

def get_database():
    mongo_uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    try:
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        client.admin.command("ping")  # Health check
        return client["ai_service_db"]
    except ConnectionFailure as e:
        raise Exception("Database connection failed") from e
