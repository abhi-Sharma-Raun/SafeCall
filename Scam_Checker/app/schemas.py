from pydantic import BaseModel, Field
from typing import Literal

class Model_Output(BaseModel):
    reason: str = Field(description="Provide explanation for you decision, You can cite some conversation parts indicating why the conversation is suspicious pr scam")
    score: float = Field(description="How much confident you are that it is a scam")
    final_decision: Literal["Legitimate", "Suspicious", "Digital Arrest Scam"]
    
    
