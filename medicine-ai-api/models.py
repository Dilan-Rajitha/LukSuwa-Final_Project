from pydantic import BaseModel

class MedicineQuery(BaseModel):
    name: str
    strength: str | None = None  

class MedicineResponse(BaseModel):
    uses: str
