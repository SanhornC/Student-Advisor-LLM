from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import os
from contextlib import asynccontextmanager

# -------------------------
# LlamaIndex configuration
# -------------------------
from llama_index.core import Settings, StorageContext, load_index_from_storage
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.llms.openai import OpenAI

# Ensure your OpenAI key is set in the environment
if "OPENAI_API_KEY" not in os.environ:
    os.environ["OPENAI_API_KEY"] = "<YOUR_OPENAI_API_KEY_HERE>"

# Global Settings for LlamaIndex (v0.10+)
Settings.embed_model = HuggingFaceEmbedding(
    model_name="BAAI/bge-small-en-v1.5",
    embed_batch_size=10,
    trust_remote_code=True,
)
Settings.llm = OpenAI(
    model="gpt-4o",
    api_key=os.environ["OPENAI_API_KEY"],
)

# -------------------------
# System prompts
# -------------------------
SYSTEM_PROMPTS = {
    "default": (
        "You are friendly AI assistant. Provide helpful, clear, concise, and accurate responses."
        " Always format your responses in a readable way. If the question is unclear, ask for clarification."
        " When thinking about complex questions, use the <think> tag to show your thinking process, then provide a clean answer after."
    ),
    "academic": (
        "You are an academic assistant helping with educational queries."
        " Provide detailed explanations with references where appropriate."
        " Break down complex concepts into understandable parts. Use examples to illustrate points."
    ),
    "professional": (
        "You are a professional assistant helping with work-related queries."
        " Keep responses concise and focused on practical solutions. Prioritize actionable advice."
    ),
}

# -------------------------
# FastAPI app setup
# -------------------------
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

index = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app.router.lifespan_context = lifespan

@app.on_event("startup")
async def startup_event():
    global index
    vectors_dir = os.path.expanduser(
        "~/Desktop/Internships/AI:ML Team/Student-Advisor-LLM/Website/vectors"
    )
    storage_context = StorageContext.from_defaults(persist_dir=vectors_dir)

    # Load the persisted index; Settings.* already has embed_model & llm
    index = load_index_from_storage(storage_context)
    print("✅ Successfully loaded index")

# -------------------------
# Request/response models
# -------------------------
class ChatRequest(BaseModel):
    prompt: str
    model: str = "gpt-4o"
    user_info: Optional[Dict[str, Any]] = None
    chat_history: Optional[List[Dict[str, str]]] = None

# -------------------------
# Helper functions
# -------------------------
def determine_context(prompt: str, user_info: Optional[Dict[str, Any]]):
    prompt_lower = prompt.lower()
    academic_keywords = ["university","homework","assignment","study","research","thesis","paper","exam","class","course","professor","student"]
    professional_keywords = ["work","business","client","meeting","project","company","team","manager","report","presentation","deadline"]
    academic_count = sum(1 for w in academic_keywords if w in prompt_lower)
    professional_count = sum(1 for w in professional_keywords if w in prompt_lower)
    if user_info:
        if user_info.get("university") or user_info.get("courses"):
            academic_count += 2
        if user_info.get("graduateSchool"):
            academic_count += 1
        if user_info.get("work"):
            professional_count += 1
    if academic_count > professional_count:
        return "academic"
    if professional_count > academic_count:
        return "professional"
    return "default"


def construct_system_prompt(context: str, user_info: Optional[Dict[str, Any]]):
    base = SYSTEM_PROMPTS.get(context, SYSTEM_PROMPTS["default"])
    if user_info and user_info.get("name"):
        p = f"The user you're assisting is {user_info['name']}."
        if context == "academic" and user_info.get("university"):
            p += f" They attend {user_info['university']}"
            if user_info.get("currentYear"):
                p += f" as a {user_info['currentYear']}"
            if user_info.get("major"):
                p += f" studying {user_info['major']}"
            p += "."
            if user_info.get("courses"):
                p += f" They have taken courses in: {user_info['courses']}."
            if user_info.get("graduateSchool"):
                p += " They are planning to apply to graduate school."
        base = p + "\n\n" + base
    return base

# -------------------------
# Chat endpoint
# -------------------------
@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    global index
    if index is None:
        await startup_event()

    context = determine_context(req.prompt, req.user_info)
    system_prompt = construct_system_prompt(context, req.user_info)

    # Optionally override llm per request
    llm = OpenAI(model=req.model, api_key=os.environ["OPENAI_API_KEY"])
    query_engine = index.as_query_engine(
        llm=llm,
        system_prompt=system_prompt,
    )
    response = query_engine.query(req.prompt)
    return {"response": str(response)}
