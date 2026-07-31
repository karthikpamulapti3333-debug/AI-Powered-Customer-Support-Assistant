class IntentDetector:
    @staticmethod
    def detect_intent(text: str) -> str:
        t = text.lower()
        if any(w in t for w in ["billing", "payment", "invoice", "charge", "refund", "card"]):
            return "BILLING"
        elif any(w in t for w in ["bug", "error", "broken", "failed", "crash", "code", "api"]):
            return "TECHNICAL"
        elif any(w in t for w in ["delivery", "order", "shipping", "logistics", "package"]):
            return "LOGISTICS"
        elif any(w in t for w in ["pricing", "plan", "upgrade", "discount", "account"]):
            return "ACCOUNT"
        return "GENERAL"

    @staticmethod
    def analyze_sentiment(text: str) -> str:
        t = text.lower()
        negative_words = ["angry", "bad", "terrible", "worst", "unacceptable", "broken", "fail", "slow", "disappointed", "urgent", "frustrated"]
        positive_words = ["great", "awesome", "thanks", "thank", "love", "helpful", "good", "excellent", "solved"]
        
        neg_count = sum(1 for w in negative_words if w in t)
        pos_count = sum(1 for w in positive_words if w in t)

        if neg_count > pos_count:
            return "NEGATIVE"
        elif pos_count > neg_count:
            return "POSITIVE"
        return "NEUTRAL"
