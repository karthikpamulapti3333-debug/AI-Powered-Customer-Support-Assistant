class AgentTools:
    def get_order_status(self, order_id: str) -> str:
        return f"Order {order_id} status check: DISPATCHED. Currently in transit with courier. Expected arrival: 1-2 business days."

    def get_billing_status(self, charge_id: str) -> str:
        return f"Transaction {charge_id} status check: SUCCESSFUL. Funds captured on payment gateway. Invoice generated."

    def reset_mfa(self, username: str) -> str:
        return f"MFA security flags cleared successfully for user '{username}'. The user can re-enroll during next login."

tools = AgentTools()
