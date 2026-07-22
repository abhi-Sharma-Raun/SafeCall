from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage
from .config import settings
from .schemas import Model_Output

llm_ = ChatGroq(
    model = "llama-3.3-70b-versatile",
    temperature = 0.01,
    max_retries = 3,
    api_key = settings.api_key
)
llm = llm_.with_structured_output(Model_Output)

LLM_SYSTEM_PROMPT = SystemMessage(content="""
    You are an expert in identifying Indian digital arrest scams.

    Given the conversation determine whether this conversation is

    - Legitimate
    - Suspicious
    - Digital Arrest Scam

    and score between 0-1 telling how much how much confident you are that it is a scam along with reason explaining your decision and this may 
    have some conversaton parts.
    """ )