# app/models/database.py
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
import os

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")

def get_database():
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        client.admin.command("ping")
        return client["ai_service_db"]
    except ConnectionFailure as e:
        raise Exception("Database connection failed") from e

db = get_database()
