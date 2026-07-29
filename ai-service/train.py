import os
import csv
import random
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
import joblib

# Set random seed for reproducibility
random.seed(42)
np.random.seed(42)

# Ensure directories exist
os.makedirs('data', exist_ok=True)
os.makedirs('models', exist_ok=True)

DATASET_PATH = 'data/complaints_dataset.csv'

# Define template categories, intents, sentiments, priorities, root causes
TEMPLATES = [
    # PAYMENT
    {
        "texts": [
            "My payment of ${amount} for order {order_id} failed, but the money was deducted from my account. Please refund immediately.",
            "I tried to purchase {product} and the transaction failed on checkout. However, my credit card was debited twice.",
            "The billing amount on my invoice {order_id} is incorrect. I was charged ${amount} instead of the advertised price of ${less_amount}.",
            "I have been charged for a subscription renewal that I cancelled last week. I want my money back.",
            "My transaction was declined at checkout but my bank statement shows the payment was successfully processed. Please help.",
            "Duplicate charge on my credit card statement for order {order_id}. I see two identical charges of ${amount}."
        ],
        "category": "PAYMENT",
        "intent": "PAYMENT_FAILED",
        "sentiment": "VERY_NEGATIVE",
        "priority": "HIGH",
        "root_cause": "PAYMENT_GATEWAY_FAILURE",
        "escalation_risk": 0.85
    },
    {
        "texts": [
            "I would like to request a refund for order {order_id} since the service was not provided.",
            "Please cancel my order {order_id} and issue a full refund to my original payment method.",
            "Where is my refund for the returned product? It has been over two weeks since you received the item.",
            "I am writing to demand a refund because the software licence key I bought does not work.",
            "You promised a refund within 3 days but I still haven't received it. This is terrible service.",
            "I was charged for shipping even though my order qualified for free shipping. Refund the difference please."
        ],
        "category": "REFUND",
        "intent": "REFUND_REQUEST",
        "sentiment": "NEGATIVE",
        "priority": "MEDIUM",
        "root_cause": "REFUND_DELAY",
        "escalation_risk": 0.55
    },
    # DELIVERY
    {
        "texts": [
            "My order {order_id} has not arrived yet. It was supposed to be delivered 5 days ago.",
            "The tracking number {tracking_id} is not updating at all. It just says shipment pending.",
            "I paid for express shipping but my package {order_id} is delayed. I want a refund on the delivery fee.",
            "Where is my package? The courier says delivered but I haven't received anything at my address.",
            "It has been 10 days since dispatch and the logistics tracking is stuck in transit. Please contact the carrier.",
            "My delivery is severely late and I need this item for a birthday event tomorrow. Help!"
        ],
        "category": "DELIVERY",
        "intent": "ORDER_DELAY",
        "sentiment": "NEGATIVE",
        "priority": "MEDIUM",
        "root_cause": "LOGISTICS_DELAY",
        "escalation_risk": 0.65
    },
    # PRODUCT
    {
        "texts": [
            "The screen of the {product} I received is completely shattered and broken. I want a replacement.",
            "I opened the package and {product} has multiple scratches and is dented. The packaging was damaged.",
            "The item {product} arrived in a damaged condition. The power button does not work at all.",
            "The product quality is extremely poor. The seams are ripped and the fabric is torn.",
            "Received the wrong item. I ordered a blue {product} but received a red one instead.",
            "Parts are missing from the package. I cannot assemble the {product} without the screws and manual."
        ],
        "category": "PRODUCT",
        "intent": "DAMAGED_PRODUCT",
        "sentiment": "VERY_NEGATIVE",
        "priority": "HIGH",
        "root_cause": "DAMAGED_IN_TRANSIT",
        "escalation_risk": 0.75
    },
    # ACCOUNT
    {
        "texts": [
            "My account {username} is locked due to too many login attempts. Please unlock it.",
            "I am locked out of my profile and the password reset link is not arriving in my mailbox.",
            "I cannot log in to my account. It keeps saying invalid credentials but I am using the correct password.",
            "I need to disable my account temporarily because I lost my phone containing the authenticator app.",
            "I cannot access my dashboard. The website redirects me to login repeatedly in an infinite loop.",
            "My profile settings are not saving. Every time I update my email, it reverts back."
        ],
        "category": "ACCOUNT",
        "intent": "ACCOUNT_LOCKED",
        "sentiment": "NEUTRAL",
        "priority": "MEDIUM",
        "root_cause": "CREDENTIALS_ISSUE",
        "escalation_risk": 0.40
    },
    # TECHNICAL
    {
        "texts": [
            "The login screen is giving a 500 internal server error when I click submit. Please fix this bug.",
            "Your website keeps crashing on checkout when using Chrome. I cannot complete my transaction.",
            "The API is returning bad gateway errors repeatedly when we try to fetch our account reports.",
            "I am getting a white screen on the mobile app. I have reinstalled it twice but the problem persists.",
            "Your checkout page is unresponsive. The loading spinner just spins forever without finishing.",
            "The search bar on your store returns no results for any keywords. It seems the database is down."
        ],
        "category": "TECHNICAL",
        "intent": "TECHNICAL_FAILURE",
        "sentiment": "NEGATIVE",
        "priority": "HIGH",
        "root_cause": "TECHNICAL_FAILURE",
        "escalation_risk": 0.70
    },
    # SECURITY
    {
        "texts": [
            "I noticed unauthorized transactions on my bank card from your store. Someone hacked my account.",
            "My password was changed without my permission. I received an alert but I did not initiate this.",
            "I suspect my profile has been compromised because there are active login sessions from unknown locations.",
            "I received a phishing email that seems to have leaked my account information. Please lock my profile.",
            "My email address was changed to a random Outlook address that I do not own. This is a severe hack!",
            "Security breach alert: my account is compromised and someone is trying to transfer my credits."
        ],
        "category": "SECURITY",
        "intent": "SECURITY_ISSUE",
        "sentiment": "VERY_NEGATIVE",
        "priority": "CRITICAL",
        "root_cause": "ACCOUNT_COMPROMISED",
        "escalation_risk": 0.95
    },
    # SERVICE
    {
        "texts": [
            "The support agent I spoke to was extremely rude and unhelpful. I want to make a formal complaint.",
            "I have been waiting on live chat for 2 hours and no agent has connected. This support is useless.",
            "The agent closed my ticket without resolving my issue. This is absolutely unacceptable.",
            "Your company has the worst customer support. No one replies to emails and phone support is disconnected.",
            "I was promised a callback from a supervisor within 24 hours but no one called. Very unprofessional.",
            "I want to complain about the lack of communication regarding my order delay. Nobody updates me."
        ],
        "category": "SERVICE",
        "intent": "OTHER",
        "sentiment": "VERY_NEGATIVE",
        "priority": "MEDIUM",
        "root_cause": "SUPPORT_DELAY",
        "escalation_risk": 0.60
    }
]

PRODUCTS = ["iPhone 15", "Samsung Galaxy S24", "MacBook Pro", "Wireless Headphones", "Mechanical Keyboard", "Gaming Mouse", "4K Monitor", "Bluetooth Speaker"]
DEFFECTS = ["broken in half", "completely scratched", "cracked and dead", "malfunctioning", "missing pieces"]
ACTIONS = ["full refund", "replacement immediately", "store credit", "chargeback"]

def generate_dataset():
    """Generates a rich, synthetic complaints dataset and writes to CSV."""
    rows = []
    
    # Generate around 400 complaints by mutating templates
    for i in range(400):
        tpl = random.choice(TEMPLATES)
        txt = random.choice(tpl["texts"])
        
        # Populate placeholders
        text = txt.format(
            amount=random.randint(20, 1500),
            less_amount=random.randint(10, 1400),
            order_id=f"ORD-{random.randint(100000, 999999)}",
            product=random.choice(PRODUCTS),
            defect=random.choice(DEFFECTS),
            action=random.choice(ACTIONS),
            tracking_id=f"TRK{random.randint(10000000, 99999999)}",
            username=f"user_{random.randint(100, 999)}",
            days=random.randint(3, 15)
        )
        
        # Add some random variations to sentiment/priority/escalation risk to make it realistic
        sentiment = tpl["sentiment"]
        priority = tpl["priority"]
        risk = tpl["escalation_risk"]
        
        # Add tiny noise to escalation risk
        risk = min(1.0, max(0.0, risk + random.uniform(-0.1, 0.1)))
        
        # Determine target binary escalation for classification training (escalation risk >= 0.75)
        is_escalated = 1 if risk >= 0.75 else 0
        
        rows.append({
            "text": text,
            "category": tpl["category"],
            "intent": tpl["intent"],
            "sentiment": sentiment,
            "priority": priority,
            "root_cause": tpl["root_cause"],
            "escalation_risk": round(risk, 2),
            "is_escalated": is_escalated
        })
        
    # Write to CSV
    with open(DATASET_PATH, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    print(f"Dataset generated at {DATASET_PATH} with {len(rows)} samples.")

def train_models():
    """Reads dataset, fits TF-IDF and trains Logistic Regression models."""
    if not os.path.exists(DATASET_PATH):
        generate_dataset()
        
    df = pd.read_csv(DATASET_PATH)
    
    print("Training TF-IDF Vectorizer...")
    vectorizer = TfidfVectorizer(stop_words='english', max_features=1500, ngram_range=(1, 2))
    X = vectorizer.fit_transform(df['text'])
    
    # Save Vectorizer
    joblib.dump(vectorizer, 'models/vectorizer.joblib')
    print("Vectorizer saved.")
    
    # Train Category Model
    print("Training Category classifier...")
    cat_model = LogisticRegression(max_iter=1000, C=2.0)
    cat_model.fit(X, df['category'])
    joblib.dump(cat_model, 'models/category_model.joblib')
    
    # Train Intent Model
    print("Training Intent classifier...")
    intent_model = LogisticRegression(max_iter=1000, C=2.0)
    intent_model.fit(X, df['intent'])
    joblib.dump(intent_model, 'models/intent_model.joblib')
    
    # Train Sentiment Model
    print("Training Sentiment classifier...")
    sent_model = LogisticRegression(max_iter=1000, C=2.0)
    sent_model.fit(X, df['sentiment'])
    joblib.dump(sent_model, 'models/sentiment_model.joblib')
    
    # Train Priority Model
    print("Training Priority classifier...")
    prio_model = LogisticRegression(max_iter=1000, C=2.0)
    prio_model.fit(X, df['priority'])
    joblib.dump(prio_model, 'models/priority_model.joblib')
    
    # Train Root Cause Model
    print("Training Root Cause classifier...")
    rc_model = LogisticRegression(max_iter=1000, C=2.0)
    rc_model.fit(X, df['root_cause'])
    joblib.dump(rc_model, 'models/root_cause_model.joblib')
    
    # Train Escalation Risk Classifier (Predicts probability of escalation)
    print("Training Escalation Risk model...")
    esc_model = LogisticRegression(max_iter=1000, C=1.5)
    esc_model.fit(X, df['is_escalated'])
    joblib.dump(esc_model, 'models/escalation_model.joblib')
    
    print("\nAll models trained and saved successfully in 'models/' directory!")
    
    # Quick self-test
    test_text = "I paid for order ORD-12345 but transaction failed and money got debited. Refund my cash!"
    test_vector = vectorizer.transform([test_text])
    print(f"\nSelf-Test Input: '{test_text}'")
    print(f"Predicted Category: {cat_model.predict(test_vector)[0]}")
    print(f"Predicted Intent: {intent_model.predict(test_vector)[0]}")
    print(f"Predicted Sentiment: {sent_model.predict(test_vector)[0]}")
    print(f"Predicted Priority: {prio_model.predict(test_vector)[0]}")
    print(f"Predicted Root Cause: {rc_model.predict(test_vector)[0]}")
    print(f"Predicted Escalation Risk: {esc_model.predict_proba(test_vector)[0][1]:.2f}")

if __name__ == '__main__':
    train_models()
