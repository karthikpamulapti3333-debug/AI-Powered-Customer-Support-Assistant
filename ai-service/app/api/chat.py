import os
import re
import shutil
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from app.services.document_parser import extract_text_from_file, chunk_text
from app.services.vector_store import index_document_chunks, delete_document_chunks, search_knowledge
from app.services.classifier import analyze_complaint_text
from app.services.llm_gateway import generate_chatbot_answer, generate_copilot_suggestions

router = APIRouter()

# Schema definitions
class ChatHistoryItem(BaseModel):
    role: str # "user", "assistant"
    content: str

class ChatInput(BaseModel):
    query: str
    history: List[ChatHistoryItem] = []
    conversationId: Optional[int] = None

class ChatResponseSchema(BaseModel):
    answer: str
    intent: str
    confidence: float
    sources: List[str]
    requiresHuman: bool
    sentiment: str
    priority: str
    escalationRisk: float

class CopilotInput(BaseModel):
    title: str
    description: str
    history: List[ChatHistoryItem] = []

class CopilotResponseSchema(BaseModel):
    summary: str
    intent: str
    sentiment: str
    priority: str
    escalationRisk: float
    rootCause: str
    recommendedActions: List[str]
    suggestedResponse: str
    sources: List[str]

@router.post("/upload-document", response_model=List[str])
async def upload_document(
    file: UploadFile = File(...),
    category: str = Form("GENERAL")
):
    """Saves file temporarily, extracts text, chunks it, indexes it, and returns the chunks."""
    temp_dir = "temp"
    os.makedirs(temp_dir, exist_ok=True)
    temp_file_path = os.path.join(temp_dir, file.filename)
    
    try:
        with open(temp_file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
            
        # Parse and Chunk
        text = extract_text_from_file(temp_file_path)
        chunks = chunk_text(text)
        
        if not chunks:
            raise HTTPException(status_code=400, detail="Document contains no readable text.")
            
        # Index in Vector Database
        index_document_chunks(file.filename, category, chunks)
        
        return chunks
    except Exception as e:
        print(f"Error indexing file: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")
    finally:
        # Clean up temp file
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

@router.delete("/delete-document")
async def delete_document(fileName: str):
    """Deletes document chunks from vector store."""
    try:
        delete_document_chunks(fileName)
        return {"status": "success", "message": f"Document '{fileName}' successfully deleted."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from fastapi import Header
import requests
from app.config.settings import settings

@router.post("/chat", response_model=ChatResponseSchema)
async def chat_with_ai(input_data: ChatInput, authorization: Optional[str] = Header(None)):
    """Orchestrates intent detection, conversation memory, tool calling, and RAG routing."""
    query = input_data.query
    q_clean = query.lower().strip()
    history_list = [{"role": h.role, "content": h.content} for h in input_data.history]

    user_roles = []
    username = "User"
    if authorization:
        try:
            res = requests.get(f"{settings.BACKEND_URL}/auth/me", headers={"Authorization": authorization}, timeout=2)

            if res.status_code == 200:
                data = res.json()
                username = data.get("username", "User")
                roles = data.get("roles", [])
                for r in roles:
                    if isinstance(r, dict):
                        user_roles.append(r.get("name", ""))
                    else:
                        user_roles.append(str(r))
        except Exception as e:
            print(f"Error calling /auth/me in chat_with_ai: {e}")
    
    # 1. CONVERSATION MEMORY: Extract Order ID from query or search backward through history
    order_id = None
    order_match = re.search(r"order\s*(?:id|number|no|#|\s|is|of|for|:)*\s*#?\s*(\d+)", query, re.IGNORECASE) or re.search(r"\b\d{3,10}\b", query)
    if order_match:
        order_id = order_match.group(1) if (len(order_match.groups()) > 0 and order_match.group(1)) else order_match.group(0)
    else:
        for h in reversed(history_list):
            hist_match = re.search(r"order\s*(?:id|number|no|#|\s|is|of|for|:)*\s*#?\s*(\d+)", h["content"], re.IGNORECASE) or re.search(r"\b\d{3,10}\b", h["content"])
            if hist_match:
                order_id = hist_match.group(1) if (len(hist_match.groups()) > 0 and hist_match.group(1)) else hist_match.group(0)
                break

    # 2. RUN CLASSIFIERS (for metadata tags: sentiment, priority, risk)
    nlp_results = analyze_complaint_text(title="Customer Chat", description=query)

    # 3. RULE-BASED INTENT CLASSIFICATION & ROUTING
    # Greetings & Conversation pleasantries
    greetings = ["hi", "hello", "hey", "hii", "greetings", "good morning", "good afternoon", "good evening", "howdy", "sup", "thank you", "thanks", "bye", "goodbye"]
    is_greeting = any(q_clean == g or q_clean.startswith(g + " ") or f" {g} " in f" {q_clean} " for g in greetings)

    # Human Escalation Request
    human_keywords = ["human", "agent", "person", "representative", "support team", "escalate", "talk to an agent", "talk to agent"]
    is_human_request = any(k in q_clean for k in human_keywords)

    # Support Ticket Request
    ticket_keywords = ["ticket", "complaint", "open ticket", "create ticket", "problem", "not solved", "not resolved"]
    is_ticket_request = any(k in q_clean for k in ticket_keywords)

    # Order status request
    order_keywords = ["order", "track", "shipment", "delivery", "tracking", "it arrive", "where is it", "find it"]
    is_order_query = any(k in q_clean for k in order_keywords) or (order_id is not None and any(k in q_clean for k in ["where", "track", "status", "arrive", "when", "check"]))

    # Knowledge Base / RAG Request
    kb_keywords = ["policy", "return", "refund", "warranty", "shipping", "delivery time", "how to return", "how long", "guarantee", "faq", "payment failed", "payment declined", "locked account", "security issue"]
    is_kb_query = any(k in q_clean for k in kb_keywords)

    # Chart / Analytics override: if user asks for chart, trends, statistics, categories or SLA
    is_chart_query = any(k in q_clean for k in ["chart", "graph", "visualize", "plot", "trends", "statistics", "stats"])
    if is_chart_query:
        is_ticket_request = False
        is_order_query = False
        is_kb_query = False

    # Unknown / gibberish check
    is_unknown = len(q_clean) < 4 or q_clean == "asdfghjkl" or (q_clean == "help" and not is_order_query and not is_kb_query)

    # Initialize routing response variables
    context_chunks = []
    sources = []
    requires_human = False
    detected_intent = "OTHER"
    confidence = 0.50
    answer = ""

    # 4. EXECUTE ROUTING RULES
    if is_greeting:
        detected_intent = "GREETING"
        confidence = 0.95
        answer = generate_chatbot_answer(query, history_list, context_chunks, detected_intent, conversation_id=input_data.conversationId, auth_token=authorization, user_roles=user_roles, username=username)
        
    elif is_human_request:
        detected_intent = "HUMAN_AGENT_REQUEST"
        confidence = 0.99
        requires_human = True
        answer = "It looks like you want to speak with a human support agent. You can click the 'Talk to Agent' button in the upper-right corner at any time to escalate this session and create a formal support ticket immediately."
        
    elif is_ticket_request:
        detected_intent = "CREATE_TICKET"
        confidence = 0.99
        requires_human = True
        answer = "I see that you have a problem that requires support. I'm happy to help. I can open a support ticket for you. I have automatically flagged this conversation so our team can review it. A support representative will assist you shortly."
        
    elif is_order_query:
        detected_intent = "ORDER_STATUS"
        confidence = 0.98
        if not order_id:
            answer = "Sure! I can help you find your order. Could you please provide your order number?"
        else:
            # We pass order_id back inside query to let the generator execute tools
            answer = generate_chatbot_answer(f"order {order_id}", history_list, context_chunks, detected_intent, conversation_id=input_data.conversationId, auth_token=authorization, user_roles=user_roles, username=username)
            
    elif is_kb_query:
        detected_intent = "KNOWLEDGE_BASE_QUERY"
        # Run semantic search inside RAG path only!
        context_chunks = search_knowledge(query)
        sources = list(set([c["file_name"] for c in context_chunks]))
        
        if context_chunks:
            # Real confidence score mapped from document retrieval relevance
            confidence = float(max([c.get("score", 0.8) for c in context_chunks]))
            answer = generate_chatbot_answer(query, history_list, context_chunks, detected_intent, conversation_id=input_data.conversationId, auth_token=authorization, user_roles=user_roles, username=username)
        else:
            confidence = 0.30
            answer = "I'm sorry, I couldn't find any specific company policy matching your query in my knowledge base. Would you like me to explain our general procedures or escalate this query to a support agent?"
            
    elif is_unknown:
        detected_intent = "UNKNOWN"
        confidence = 0.20
        answer = "Of course! I'm happy to help. Could you tell me what issue you're facing? For example, is it related to an order, payment, delivery, return, or product?"
        
    else:
        # General LLM conversation fallback
        detected_intent = "GENERAL_CONVERSATION"
        confidence = 0.70
        answer = generate_chatbot_answer(query, history_list, context_chunks, detected_intent, conversation_id=input_data.conversationId, auth_token=authorization, user_roles=user_roles, username=username)

    from app.config.settings import settings
    print(f"[CHAT] User message: {query}")
    print(f"[CHAT] Detected intent: {detected_intent}")
    print(f"[CHAT] RAG called: {is_kb_query}")
    print(f"[CHAT] RAG result count: {len(context_chunks)}")
    print(f"[CHAT] LLM called: {settings.AI_PROVIDER != 'LOCAL_SIMULATOR'}")
    try:
        print(f"[CHAT] LLM response: {answer}")
        print(f"[CHAT] Final response: {answer}")
    except Exception:
        pass

    return ChatResponseSchema(
        answer=answer,
        intent=detected_intent,
        confidence=confidence,
        sources=sources,
        requiresHuman=requires_human,
        sentiment=nlp_results["sentiment"],
        priority=nlp_results["priority"],
        escalationRisk=nlp_results["escalationRisk"]
    )

@router.post("/copilot-suggest", response_model=CopilotResponseSchema)
async def get_copilot_suggestions(input_data: CopilotInput):
    """Generates AI Copilot details for support agents."""
    title = input_data.title
    description = input_data.description
    
    # 1. Semantic Search
    context_chunks = search_knowledge(f"{title} {description}")
    sources = list(set([c["file_name"] for c in context_chunks]))
    
    # 2. NLP Classifier
    nlp_results = analyze_complaint_text(title=title, description=description)
    
    # 3. Suggested Response & Summary
    history_list = [{"role": h.role, "content": h.content} for h in input_data.history]
    suggestions = generate_copilot_suggestions(title, description, history_list, context_chunks)
    
    return CopilotResponseSchema(
        summary=suggestions["summary"],
        intent=nlp_results["intent"],
        sentiment=nlp_results["sentiment"],
        priority=nlp_results["priority"],
        escalationRisk=nlp_results["escalationRisk"],
        rootCause=nlp_results["rootCause"],
        recommendedActions=nlp_results["recommendedActions"],
        suggestedResponse=suggestions["suggestedResponse"],
        sources=sources
    )
