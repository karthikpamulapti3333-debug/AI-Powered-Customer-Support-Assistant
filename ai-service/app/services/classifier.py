import os
import joblib
import numpy as np
from typing import Dict, Any, List
from app.config.settings import settings

# Global variables for model state
vectorizer = None
category_model = None
intent_model = None
sentiment_model = None
priority_model = None
root_cause_model = None
escalation_model = None

# Recommendation mapping based on root cause
RECOMMENDATIONS_MAP = {
    "PAYMENT_GATEWAY_FAILURE": [
        "Verify payment transaction reference in Stripe/Paypal logs.",
        "Check status of payment gateway connection.",
        "Initiate refund if funds were debited but order failed.",
        "Escalate ticket to the Billing and Payments team."
    ],
    "REFUND_DELAY": [
        "Query refund batch transaction logs.",
        "Verify if return shipment has been inspected and approved.",
        "Manually authorize immediate wallet or bank credit.",
        "Contact finance desk to expedite payment queue."
    ],
    "LOGISTICS_DELAY": [
        "Check courier tracking database for latest package milestone.",
        "Initiate tracer request with the logistics partner.",
        "Update customer with revised delivery ETA.",
        "Apply shipping fee refund / credit voucher to customer profile."
    ],
    "DAMAGED_IN_TRANSIT": [
        "Inspect photos/videos uploaded by the customer.",
        "Issue prepaid return label to customer.",
        "Dispatch replacement item from inventory.",
        "File damaged-in-transit shipping insurance claim."
    ],
    "CREDENTIALS_ISSUE": [
        "Confirm identity parameters for customer safety.",
        "Check user account lock state in IDP/DB.",
        "Reset login attempts counter.",
        "Send password reset instruction link to registered email."
    ],
    "TECHNICAL_FAILURE": [
        "Check backend service log files for stack traces.",
        "Verify web app server/DB performance metrics.",
        "Liaise with devops to isolate UI/API bugs.",
        "Advise customer to clear session cache."
    ],
    "ACCOUNT_COMPROMISED": [
        "Lock user account and force log out all active sessions.",
        "Initiate MFA reset and secondary contact verification.",
        "Review login audits for foreign IP addresses.",
        "Advise customer to check linked email safety."
    ],
    "SUPPORT_DELAY": [
        "Verify previous ticket agent handovers.",
        "Expedite supervisor review request.",
        "Arrange direct phone support contact.",
        "Apply loyalty/apology voucher to customer file."
    ]
}

DEFAULT_RECOMMENDATIONS = [
    "Review complaint details thoroughly.",
    "Contact customer to clarify particulars if needed.",
    "Check similar historical complaint resolutions.",
    "Liaise with general support team."
]

def load_ml_models():
    """Loads all models and vectorizer into memory from joblib files."""
    global vectorizer, category_model, intent_model, sentiment_model, priority_model, root_cause_model, escalation_model
    
    # Check if vectorizer exists
    vectorizer_path = os.path.join(settings.MODELS_DIR, "vectorizer.joblib")
    if not os.path.exists(vectorizer_path):
        print(f"[Classifier] ML Models not found in {settings.MODELS_DIR}. Inference endpoints will use fallback heuristics until models are trained.")
        return False
        
    try:
        vectorizer = joblib.load(vectorizer_path)
        category_model = joblib.load(os.path.join(settings.MODELS_DIR, "category_model.joblib"))
        intent_model = joblib.load(os.path.join(settings.MODELS_DIR, "intent_model.joblib"))
        sentiment_model = joblib.load(os.path.join(settings.MODELS_DIR, "sentiment_model.joblib"))
        priority_model = joblib.load(os.path.join(settings.MODELS_DIR, "priority_model.joblib"))
        root_cause_model = joblib.load(os.path.join(settings.MODELS_DIR, "root_cause_model.joblib"))
        escalation_model = joblib.load(os.path.join(settings.MODELS_DIR, "escalation_model.joblib"))
        print("[Classifier] All ML models loaded successfully.")
        return True
    except Exception as e:
        print(f"[Classifier] Error loading ML models: {e}.")
        return False

def get_text_vector(text: str):
    if vectorizer is None:
        raise RuntimeError("Vectorizer not loaded. Train models first.")
    return vectorizer.transform([text])

def predict_single(text: str, model_name: str) -> Dict[str, Any]:
    """Helper for simple classifier query."""
    if vectorizer is None:
        # Hardcoded quick heuristic fallbacks if ML models are not trained yet
        if model_name == "category":
            return {"prediction": "OTHER", "confidence": 1.0}
        elif model_name == "sentiment":
            return {"prediction": "NEUTRAL", "confidence": 1.0}
        elif model_name == "priority":
            return {"prediction": "MEDIUM", "confidence": 1.0}
        elif model_name == "escalation":
            return {"prediction": "NONE", "confidence": 0.1}
        elif model_name == "root_cause":
            return {"prediction": "TECHNICAL_FAILURE", "confidence": 1.0}
            
    vec = get_text_vector(text)
    
    if model_name == "category":
        pred = category_model.predict(vec)[0]
        probs = category_model.predict_proba(vec)[0]
        return {"prediction": pred, "confidence": float(np.max(probs))}
    elif model_name == "sentiment":
        pred = sentiment_model.predict(vec)[0]
        probs = sentiment_model.predict_proba(vec)[0]
        return {"prediction": pred, "confidence": float(np.max(probs))}
    elif model_name == "priority":
        pred = priority_model.predict(vec)[0]
        probs = priority_model.predict_proba(vec)[0]
        return {"prediction": pred, "confidence": float(np.max(probs))}
    elif model_name == "escalation":
        probs = escalation_model.predict_proba(vec)[0]
        conf = float(probs[1]) # Escalated probability
        return {"prediction": "ESCALATION" if conf >= 0.75 else "NONE", "confidence": conf}
    elif model_name == "root_cause":
        pred = root_cause_model.predict(vec)[0]
        probs = root_cause_model.predict_proba(vec)[0]
        return {"prediction": pred, "confidence": float(np.max(probs))}
        
    raise ValueError(f"Invalid model name: {model_name}")

def analyze_complaint_text(title: str, description: str) -> Dict[str, Any]:
    """Combines all ML classifier predictions for a ticket."""
    combined_text = f"{title}. {description}"
    
    if vectorizer is None:
        # Default heuristic outputs when models are not trained
        return {
            "category": "OTHER",
            "intent": "OTHER",
            "sentiment": "NEUTRAL",
            "priority": "MEDIUM",
            "escalationRisk": 0.25,
            "rootCause": "SUPPORT_DELAY",
            "confidenceScore": 0.50,
            "recommendedActions": DEFAULT_RECOMMENDATIONS
        }
        
    vec = get_text_vector(combined_text)
    
    cat_pred = category_model.predict(vec)[0]
    cat_conf = float(np.max(category_model.predict_proba(vec)[0]))
    
    intent_pred = intent_model.predict(vec)[0]
    intent_conf = float(np.max(intent_model.predict_proba(vec)[0]))
    
    sent_pred = sentiment_model.predict(vec)[0]
    prio_pred = priority_model.predict(vec)[0]
    
    esc_probs = escalation_model.predict_proba(vec)[0]
    esc_risk = float(esc_probs[1])
    
    rc_pred = root_cause_model.predict(vec)[0]
    rc_conf = float(np.max(root_cause_model.predict_proba(vec)[0]))
    
    avg_conf = round(float((cat_conf + intent_conf + rc_conf) / 3.0), 2)
    actions = RECOMMENDATIONS_MAP.get(rc_pred, DEFAULT_RECOMMENDATIONS)
    
    return {
        "category": cat_pred,
        "intent": intent_pred,
        "sentiment": sent_pred,
        "priority": prio_pred,
        "escalationRisk": round(esc_risk, 2),
        "rootCause": rc_pred,
        "confidenceScore": avg_conf,
        "recommendedActions": actions
    }

# Attempt initial load
load_ml_models()
