from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import List, Optional
from app.services.classifier import predict_single, analyze_complaint_text

router = APIRouter()

class SinglePredictionInput(BaseModel):
    text: str = Field(..., example="I want a refund on order ORD-1234")

class PredictionResponse(BaseModel):
    prediction: str
    confidence: float

class ComplaintInput(BaseModel):
    complaintId: Optional[str] = Field(None, example="CMP-1001")
    title: str = Field(..., example="Payment failed but money debited")
    description: str = Field(..., example="I tried checking out but it failed. The money was deducted from my account.")

class AnalysisResponse(BaseModel):
    category: str
    intent: str
    sentiment: str
    priority: str
    escalationRisk: float
    rootCause: str
    confidenceScore: float
    recommendedActions: List[str]

@router.post("/predict-category", response_model=PredictionResponse)
async def predict_category(input_data: SinglePredictionInput):
    res = predict_single(input_data.text, "category")
    return PredictionResponse(prediction=res["prediction"], confidence=res["confidence"])

@router.post("/predict-sentiment", response_model=PredictionResponse)
async def predict_sentiment(input_data: SinglePredictionInput):
    res = predict_single(input_data.text, "sentiment")
    return PredictionResponse(prediction=res["prediction"], confidence=res["confidence"])

@router.post("/predict-priority", response_model=PredictionResponse)
async def predict_priority(input_data: SinglePredictionInput):
    res = predict_single(input_data.text, "priority")
    return PredictionResponse(prediction=res["prediction"], confidence=res["confidence"])

@router.post("/predict-escalation", response_model=PredictionResponse)
async def predict_escalation(input_data: SinglePredictionInput):
    res = predict_single(input_data.text, "escalation")
    return PredictionResponse(prediction=res["prediction"], confidence=res["confidence"])

@router.post("/predict-root-cause", response_model=PredictionResponse)
async def predict_root_cause(input_data: SinglePredictionInput):
    res = predict_single(input_data.text, "root_cause")
    return PredictionResponse(prediction=res["prediction"], confidence=res["confidence"])

@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_complaint(input_data: ComplaintInput):
    res = analyze_complaint_text(input_data.title, input_data.description)
    return AnalysisResponse(**res)
