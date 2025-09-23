from typing import Optional
from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel, Field


# Helper to handle MongoDB ObjectId inside Pydantic
class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)


class AIModel(BaseModel):
    id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    name: str
    provider: str
    version: Optional[str] = None
    size: Optional[str] = None
    quantization: Optional[str] = None
    description: Optional[str] = None
    active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        # Allows returning ObjectId as string in JSON
        json_encoders = {ObjectId: str}
        allow_population_by_field_name = True
