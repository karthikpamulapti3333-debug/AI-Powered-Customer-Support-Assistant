import csv
import io
from app.models.ticket import Ticket

def export_tickets_csv():
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow([
        "Ticket Code", "Customer Name", "Customer Email", "Customer Phone",
        "Subject", "Category", "Priority", "Status", "Created At", "Updated At"
    ])

    tickets = Ticket.query.order_by(Ticket.created_at.desc()).all()
    for t in tickets:
        writer.writerow([
            t.ticket_code,
            t.customer_name,
            t.email,
            t.phone or "",
            t.subject,
            t.category,
            t.priority,
            t.status,
            t.created_at.strftime("%Y-%m-%d %H:%M:%S") if t.created_at else "",
            t.updated_at.strftime("%Y-%m-%d %H:%M:%S") if t.updated_at else ""
        ])

    output.seek(0)
    return output.getvalue()
