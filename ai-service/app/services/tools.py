import requests
from typing import List, Dict, Any, Optional
from app.services.vector_store import search_knowledge
from app.config.settings import settings

BACKEND_URL = settings.BACKEND_URL


def search_knowledge_base(query: str) -> List[Dict[str, Any]]:
    """Searches company knowledge base documents for relevant chunks."""
    print(f"[Tool Call] search_knowledge_base with query: '{query}'")
    return search_knowledge(query)

def get_order_status(order_id: str, auth_token: Optional[str] = None) -> Dict[str, Any]:
    """Retrieves shipping and delivery status of an order."""
    print(f"[Tool Call] get_order_status for order_id: '{order_id}'")
    # Simulate database or ERP order lookup
    clean_id = order_id.replace("#", "").strip()
    if clean_id in ["12345", "123", "1234", "10245"]:
        return {
            "orderId": clean_id,
            "status": "IN_TRANSIT",
            "courier": "FedEx" if clean_id != "123" else "DHL Express",
            "trackingNumber": f"FEX-992104-{clean_id}" if clean_id != "123" else "DHL-887124-B",
            "estimatedDelivery": "Tomorrow by 5:00 PM" if clean_id != "123" else "Friday by 3:00 PM",
            "items": ["Dell XPS 15 Laptop"] if clean_id != "123" else ["Wireless Noise-Cancelling Headphones"],
            "totalAmount": 1499.99 if clean_id != "123" else 199.99
        }
    return {
        "orderId": order_id,
        "status": "NOT_FOUND",
        "message": f"No order found matching identifier '{order_id}'. Please verify the order number."
    }

def get_customer_details(customer_id: str, auth_token: Optional[str] = None) -> Dict[str, Any]:
    """Retrieves customer account profile data."""
    print(f"[Tool Call] get_customer_details for customer_id: '{customer_id}'")
    if customer_id in ["customer", "cust-101", "101"]:
        return {
            "customerId": "cust-101",
            "name": "Jane Customer",
            "email": "customer@resolveai.com",
            "membership": "Gold Member",
            "accountStatus": "ACTIVE"
        }
    return {
        "customerId": customer_id,
        "name": "Anonymous Guest",
        "email": "unknown@resolveai.com",
        "membership": "Standard",
        "accountStatus": "ACTIVE"
    }

def check_refund_status(order_id: str, auth_token: Optional[str] = None) -> Dict[str, Any]:
    """Checks the refund logs for a cancelled or returned order transaction."""
    print(f"[Tool Call] check_refund_status for order_id: '{order_id}'")
    clean_id = order_id.replace("#", "").strip()
    if clean_id in ["12345", "123", "1234", "10245"]:
        return {
            "orderId": clean_id,
            "refundStatus": "APPROVED",
            "amountRefunded": 1499.99 if clean_id != "123" else 199.99,
            "refundDate": "2026-07-22",
            "paymentMethod": "Credit Card ending in 4111"
        }
    return {
        "orderId": order_id,
        "refundStatus": "NO_REFUND_FOUND",
        "message": f"No refund logs found for Order ID '{order_id}'."
    }

def get_support_ticket_status(ticket_id: str, auth_token: Optional[str] = None) -> Dict[str, Any]:
    """Calls backend REST API to find the live status of a support ticket."""
    print(f"[Tool Call] get_support_ticket_status for ticket_id: '{ticket_id}'")
    clean_id = ticket_id.upper().replace("CMP-", "").replace("#", "").strip()
    try:
        url = f"{BACKEND_URL}/complaints/{clean_id}"
        headers = {}
        if auth_token:
            headers["Authorization"] = auth_token
        res = requests.get(url, headers=headers, timeout=3)
        if res.status_code == 200:
            data = res.json()
            return {
                "ticketId": ticket_id,
                "title": data.get("title"),
                "status": data.get("status"),
                "priority": data.get("priority"),
                "createdAt": data.get("createdAt"),
                "agentName": data.get("assignedAgent", {}).get("username", "Unassigned") if data.get("assignedAgent") else "Unassigned"
            }
        elif res.status_code == 403:
            return {
                "ticketId": ticket_id,
                "status": "ACCESS_DENIED",
                "message": "Unauthorized access to this ticket resource."
            }
    except Exception as e:
        print(f"[Tool Call] Backend ticket lookup failed: {e}. Falling back to simulator.")
    
    # Fallback simulation
    if clean_id == "1" or clean_id == "10245":
        return {
            "ticketId": f"CMP-{clean_id}",
            "title": "Refund Delayed Issue",
            "status": "ASSIGNED_TO_AGENT",
            "priority": "HIGH",
            "createdAt": "2026-07-23T12:00:00",
            "agentName": "agent_billing"
        }
    return {
        "ticketId": ticket_id,
        "status": "NOT_FOUND",
        "message": f"Could not locate ticket '{ticket_id}' in the system."
    }

def get_complaint_statistics(auth_token: Optional[str] = None) -> Dict[str, Any]:
    """Retrieves high-level summary and category distribution of complaints."""
    print("[Tool Call] get_complaint_statistics")
    headers = {}
    if auth_token:
        headers["Authorization"] = auth_token
    try:
        res = requests.get(f"{BACKEND_URL}/analytics/summary", headers=headers, timeout=3)
        summary = res.json() if res.status_code == 200 else {}
        res_cat = requests.get(f"{BACKEND_URL}/analytics/categories", headers=headers, timeout=3)
        categories = res_cat.json() if res_cat.status_code == 200 else {}
        return {"summary": summary, "categories": categories}
    except Exception as e:
        print(f"[Tool Call] get_complaint_statistics failed: {e}")
        return {"summary": "Offline or unauthorized", "categories": {}}

def get_ticket_statistics(auth_token: Optional[str] = None) -> Dict[str, Any]:
    """Retrieves SLA compliance and priority breakdown of tickets."""
    print("[Tool Call] get_ticket_statistics")
    headers = {}
    if auth_token:
        headers["Authorization"] = auth_token
    try:
        res_sla = requests.get(f"{BACKEND_URL}/analytics/sla", headers=headers, timeout=3)
        sla = res_sla.json() if res_sla.status_code == 200 else {}
        res_pri = requests.get(f"{BACKEND_URL}/analytics/priority", headers=headers, timeout=3)
        priority = res_pri.json() if res_pri.status_code == 200 else {}
        return {"sla": sla, "priority": priority}
    except Exception as e:
        print(f"[Tool Call] get_ticket_statistics failed: {e}")
        return {"sla": {}, "priority": {}}

def generate_chart_data(auth_token: Optional[str] = None) -> Dict[str, Any]:
    """Generates time-series trends data for visual charts."""
    print("[Tool Call] generate_chart_data")
    headers = {}
    if auth_token:
        headers["Authorization"] = auth_token
    try:
        res = requests.get(f"{BACKEND_URL}/analytics/trends", headers=headers, timeout=3)
        return res.json() if res.status_code == 200 else {}
    except Exception as e:
        print(f"[Tool Call] generate_chart_data failed: {e}")
        return {}
