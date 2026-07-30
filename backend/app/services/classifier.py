import os
import joblib
from app.config.settings import settings

class ClassifierService:
    def __init__(self):
        self.category_model = None
        self.escalation_model = None
        self.intent_model = None
        self.priority_model = None
        self.root_cause_model = None
        self.sentiment_model = None
        self.vectorizer = None
        self.load_models()

    def load_models(self):
        try:
            self.category_model = joblib.load(os.path.join(settings.MODELS_DIR, "category_model.joblib"))
            self.escalation_model = joblib.load(os.path.join(settings.MODELS_DIR, "escalation_model.joblib"))
            self.intent_model = joblib.load(os.path.join(settings.MODELS_DIR, "intent_model.joblib"))
            self.priority_model = joblib.load(os.path.join(settings.MODELS_DIR, "priority_model.joblib"))
            self.root_cause_model = joblib.load(os.path.join(settings.MODELS_DIR, "root_cause_model.joblib"))
            self.sentiment_model = joblib.load(os.path.join(settings.MODELS_DIR, "sentiment_model.joblib"))
            self.vectorizer = joblib.load(os.path.join(settings.MODELS_DIR, "vectorizer.joblib"))
            print("All ML models loaded successfully.")
        except Exception as e:
            print(f"Warning: Could not load ML models from directory: {e}. Falling back to rule-based simulation.")

    def predict(self, text: str):
        if not self.vectorizer or not self.category_model:
            # Fallback simulator for classification if models are missing
            lower_text = text.lower()
            category = "OTHER"
            intent = "GENERAL_INQUIRY"
            sentiment = "NEUTRAL"
            priority = "MEDIUM"
            root_cause = "GENERAL_SUPPORT"
            escalation_risk = 0.15

            if "payment" in lower_text or "billing" in lower_text or "charge" in lower_text or "invoice" in lower_text:
                category = "PAYMENT"
                intent = "PAYMENT_FAILED"
                root_cause = "PAYMENT_GATEWAY_FAILURE"
            elif "delivery" in lower_text or "shipping" in lower_text or "track" in lower_text or "package" in lower_text:
                category = "DELIVERY"
                intent = "ORDER_DELAY"
                root_cause = "LOGISTICS_DELAY"
            elif "defective" in lower_text or "broken" in lower_text or "damage" in lower_text or "quality" in lower_text:
                category = "PRODUCT"
                intent = "DAMAGED_PRODUCT"
                root_cause = "DAMAGED_IN_TRANSIT"
            elif "password" in lower_text or "login" in lower_text or "account" in lower_text or "hacked" in lower_text:
                category = "SECURITY"
                intent = "SECURITY_ISSUE"
                root_cause = "ACCOUNT_COMPROMISED"
                priority = "HIGH"
                escalation_risk = 0.6

            if "urgent" in lower_text or "immediate" in lower_text or "now" in lower_text:
                priority = "HIGH"
                escalation_risk += 0.2
            if "angry" in lower_text or "terrible" in lower_text or "worst" in lower_text or "fail" in lower_text:
                sentiment = "NEGATIVE"
                escalation_risk += 0.25
            elif "thank" in lower_text or "great" in lower_text or "good" in lower_text:
                sentiment = "POSITIVE"
                escalation_risk = 0.05

            escalation_risk = min(max(escalation_risk, 0.0), 1.0)
            return {
                "category": category,
                "intent": intent,
                "sentiment": sentiment,
                "priority": priority,
                "escalation_risk": escalation_risk,
                "root_cause": root_cause,
                "confidence_score": 0.95
            }

        # Vectorize and predict using scikit-learn models
        features = self.vectorizer.transform([text])
        category = self.category_model.predict(features)[0]
        intent = self.intent_model.predict(features)[0]
        sentiment = self.sentiment_model.predict(features)[0]
        priority = self.priority_model.predict(features)[0]
        root_cause = self.root_cause_model.predict(features)[0]

        if hasattr(self.escalation_model, "predict_proba"):
            escalation_risk = self.escalation_model.predict_proba(features)[0][1]
        else:
            escalation_risk = float(self.escalation_model.predict(features)[0])

        confidence_score = 0.85
        if hasattr(self.category_model, "predict_proba"):
            confidence_score = float(max(self.category_model.predict_proba(features)[0]))

        return {
            "category": str(category),
            "intent": str(intent),
            "sentiment": str(sentiment),
            "priority": str(priority),
            "escalation_risk": float(escalation_risk),
            "root_cause": str(root_cause),
            "confidence_score": float(confidence_score)
        }

classifier = ClassifierService()
