# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import ollama
import json
from typing import Optional, List, Dict, Any

app = FastAPI()

# Enable CORS so frontend can call backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace with your domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data format for chat request
class ChatRequest(BaseModel):
    prompt: str
    model: str = "deepseek-r1"  # default model name
    user_info: Optional[Dict[str, Any]] = None
    chat_history: Optional[List[Dict[str, str]]] = None

class ModelConfig(BaseModel):
    temperature: float = 0.7
    top_p: float = 0.9
    max_tokens: int = 2000

# System prompts for different use cases
SYSTEM_PROMPTS = {
    "default": """You are friendly AI assistant. Provide cl a helpful,ear, concise, and accurate responses.
Always format your responses in a readable way. If the question is unclear, ask for clarification.
When thinking about complex questions, use the <think> tag to show your thinking process, then provide a clean answer after.
Example:
<think>
Let me think through this step by step...
[Your reasoning process here]
</think>
[Your final clean answer here]""",
    
    "academic": """You are an academic assistant helping with educational queries. 
Provide detailed explanations with references where appropriate. Break down complex concepts into 
understandable parts. Use examples to illustrate points.
When thinking about complex academic questions, use the <think> tag to show your thinking process, then provide a clean answer after.
For mathematical or scientific content, explain the underlying principles.""",
    
    "professional": """You are a professional assistant helping with work-related queries.
Keep responses concise and focused on practical solutions. Prioritize actionable advice.
For business or technical questions, consider both short-term solutions and long-term implications.
When analyzing complex scenarios, use the <think> tag to outline considerations, then provide clear recommendations."""
}

# API endpoint to handle chat
@app.post("/api/chat")
def chat_endpoint(req: ChatRequest):
    try:
        # Determine the context based on user info and prompt content
        context = determine_context(req.prompt, req.user_info)
        
        # Construct a more effective prompt with system instructions
        system_prompt = construct_system_prompt(context, req.user_info)
        
        # Format the user's prompt with additional instructions if needed
        formatted_prompt = format_user_prompt(req.prompt)
        
        # Create messages array with conversation history if available
        messages = []
        
        # Add system message
        messages.append({"role": "system", "content": system_prompt})
        
        # Add chat history if available
        if req.chat_history:
            messages.extend(req.chat_history)
        
        # Add the current user prompt
        messages.append({"role": "user", "content": formatted_prompt})
        
        # Configure model parameters based on the context
        model_config = get_model_config(context)
        
        # Call the model
        response = ollama.chat(
            model=req.model,
            messages=messages,
            options={
                "temperature": model_config.temperature,
                "top_p": model_config.top_p,
                "num_predict": model_config.max_tokens
            }
        )
        
        # Process the response to enhance it if needed
        processed_response = process_response(response['message']['content'], context)
        
        return {"response": processed_response}
    except Exception as e:
        return {"response": f"Error: {str(e)}"}

def determine_context(prompt: str, user_info: Optional[Dict[str, Any]]):
    """Determine the appropriate context based on prompt and user info."""
    # Simplified logic - you can expand this with more sophisticated analysis
    prompt_lower = prompt.lower()
    
    # Check for academic indicators
    academic_keywords = ["university", "homework", "assignment", "study", "research", "thesis", 
                         "paper", "exam", "class", "course", "professor", "student"]
    
    # Check for professional indicators
    professional_keywords = ["work", "business", "client", "meeting", "project", "company", 
                             "team", "manager", "report", "presentation", "deadline"]
    
    # Count occurrences of keywords
    academic_count = sum(1 for word in academic_keywords if word in prompt_lower)
    professional_count = sum(1 for word in professional_keywords if word in prompt_lower)
    
    # Also consider user info if available
    if user_info:
        # If user is a student, likely academic context
        if user_info.get("university") or user_info.get("courses") or \
           user_info.get("currentYear") in ["Freshman", "Sophomore", "Junior", "Senior"]:
            academic_count += 2
        
        # If user plans for grad school, more weight to academic
        if user_info.get("graduateSchool"):
            academic_count += 1
            
        # If user plans to work, more weight to professional
        if user_info.get("work"):
            professional_count += 1
    
    # Determine context based on counts
    if academic_count > professional_count:
        return "academic"
    elif professional_count > academic_count:
        return "professional"
    else:
        return "default"

def construct_system_prompt(context: str, user_info: Optional[Dict[str, Any]]):
    """Create a tailored system prompt based on context and user info."""
    base_prompt = SYSTEM_PROMPTS.get(context, SYSTEM_PROMPTS["default"])
    
    # Add personalization if user info available
    if user_info and user_info.get("name"):
        personalization = f"The user you're assisting is {user_info.get('name')}."
        
        if context == "academic" and user_info.get("university"):
            personalization += f" They attend {user_info.get('university')}"
            if user_info.get("currentYear"):
                personalization += f" as a {user_info.get('currentYear')}"
            if user_info.get("major"):
                personalization += f" studying {user_info.get('major')}"
            personalization += "."
            
            if user_info.get("courses"):
                personalization += f" They have taken courses in: {user_info.get('courses')}."
                
            if user_info.get("graduateSchool"):
                personalization += " They are planning to apply to graduate school."
        
        base_prompt = personalization + "\n\n" + base_prompt
    
    return base_prompt

def format_user_prompt(prompt: str):
    """Format the user's prompt to get better responses."""
    # Here you could add instructions or structure to the user prompt
    # For example, encouraging step-by-step thinking for complex questions
    
    if len(prompt.split()) > 20 or "?" in prompt:
        # This might be a complex question, suggest structured thinking
        return prompt + "\n\nPlease think about this step-by-step before answering."
    
    return prompt

def get_model_config(context: str):
    """Get model configuration based on the context."""
    config = ModelConfig()
    
    if context == "academic":
        # More detailed, thorough responses for academic queries
        config.temperature = 0.6  # Slightly lower for more factual responses
        config.max_tokens = 2500  # Allow more tokens for detailed explanations
    elif context == "professional":
        # More concise, to-the-point responses for professional queries
        config.temperature = 0.7
        config.max_tokens = 1500
    
    return config

def process_response(response: str, context: str):
    """Process the model's response to enhance it if needed."""
    # You could add post-processing logic here, like:
    # - Ensuring proper formatting
    # - Adding citations for academic contexts
    # - Highlighting key takeaways for professional contexts
    
    return response