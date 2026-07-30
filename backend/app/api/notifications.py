from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.config.database import get_db
from app.models import User, Notification
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

@router.get("")
def get_notifications(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notifications = db.query(Notification).filter(
        Notification.user_id == user.id
    ).order_by(Notification.created_at.desc()).all()
    
    results = []
    for n in notifications:
        results.append({
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "isRead": n.is_read,
            "type": n.type,
            "complaintId": n.complaint_id,
            "createdAt": n.created_at
        })
    return results

@router.get("/unread")
def get_unread_notifications(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notifications = db.query(Notification).filter(
        Notification.user_id == user.id,
        Notification.is_read == False
    ).order_by(Notification.created_at.desc()).all()
    
    results = []
    for n in notifications:
        results.append({
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "isRead": n.is_read,
            "type": n.type,
            "complaintId": n.complaint_id,
            "createdAt": n.created_at
        })
    return results

@router.put("/{id}/read")
def mark_as_read(id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    n = db.query(Notification).filter(Notification.id == id, Notification.user_id == user.id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.is_read = True
    db.commit()
    return {"message": "Notification marked as read"}

@router.put("/read-all")
def mark_all_as_read(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Notification).filter(
        Notification.user_id == user.id,
        Notification.is_read == False
    ).update({Notification.is_read: True}, synchronize_session=False)
    db.commit()
    return {"message": "All notifications marked as read"}
