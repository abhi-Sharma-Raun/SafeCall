from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    model_api_key: str
    
settings=Settings()