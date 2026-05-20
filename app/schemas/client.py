from pydantic import BaseModel

class ClientCreate(BaseModel):
    name: str

class ClientResponse(BaseModel):
    id: int
    name: str
    team_id: int

    class Config:
        from_attributes = True