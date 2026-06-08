from fastapi import APIRouter, HTTPException, status, Depends, Query
from datetime import datetime, timezone
from typing import Optional
from app.models.announcement import Announcement, AnnouncementCreate, AnnouncementUpdate
from app.models.user import User
from app.api.deps import get_current_user

router = APIRouter()

# ═══════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════

async def get_current_user_object(username: str) -> User:
    """Get full user object from username"""
    user = await User.find_one(User.username == username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# ═══════════════════════════════════════════════════════════════════
# PUBLIC ENDPOINTS (All authenticated users)
# ═══════════════════════════════════════════════════════════════════

@router.get("/")
async def list_announcements(
    category: Optional[str] = Query(None),
    pinned_only: Optional[bool] = Query(False),
    include_deleted: Optional[bool] = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: str = Depends(get_current_user)
):
    """
    List announcements with optional filters
    Available to all authenticated users
    """
    # Build query
    query = {}
    
    if category:
        query["category"] = category.lower()
    
    if pinned_only:
        query["pinned"] = True
    
    # By default, exclude deleted announcements unless explicitly requested
    if not include_deleted:
        query["deleted"] = False
    
    # Fetch announcements
    announcements = await Announcement.find(query).sort([
        ("pinned", -1),  # Pinned first
        ("created_at", -1)  # Then by newest
    ]).skip(skip).limit(limit).to_list()
    
    # Add is_read flag for current user
    result = []
    for ann in announcements:
        ann_dict = ann.dict()
        ann_dict["announcement_id"] = str(ann.id)
        ann_dict["is_read"] = current_user in ann.read_by
        result.append(ann_dict)
    
    return {"announcements": result, "total": len(result)}

@router.get("/{announcement_id}")
async def get_announcement(
    announcement_id: str,
    current_user: str = Depends(get_current_user)
):
    """
    Get single announcement by ID
    Available to all authenticated users
    """
    announcement = await Announcement.get(announcement_id)
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
    
    # Check if deleted
    if announcement.deleted:
        raise HTTPException(status_code=404, detail="Announcement has been archived")
    
    ann_dict = announcement.dict()
    ann_dict["announcement_id"] = str(announcement.id)
    ann_dict["is_read"] = current_user in announcement.read_by
    
    return ann_dict

@router.post("/{announcement_id}/read")
async def mark_announcement_as_read(
    announcement_id: str,
    current_user: str = Depends(get_current_user)
):
    """
    Mark announcement as read by current user
    Available to all authenticated users
    """
    announcement = await Announcement.get(announcement_id)
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
    
    # Check if already read
    if current_user in announcement.read_by:
        return {"message": "Already marked as read"}
    
    # Add user to read_by list and increment read_count
    announcement.read_by.append(current_user)
    announcement.read_count += 1
    announcement.updated_at = datetime.now(timezone.utc)
    
    await announcement.save()
    
    return {"message": "Announcement marked as read"}

@router.get("/unread/count")
async def get_unread_count(
    current_user: str = Depends(get_current_user)
):
    """
    Get count of unread announcements for current user
    Available to all authenticated users
    """
    # Find all non-deleted announcements
    all_announcements = await Announcement.find(
        Announcement.deleted == False
    ).to_list()
    
    # Count unread (not in read_by list)
    unread_count = sum(1 for ann in all_announcements if current_user not in ann.read_by)
    
    return {"unread_count": unread_count}

# ═══════════════════════════════════════════════════════════════════
# ADMIN-ONLY ENDPOINTS
# ═══════════════════════════════════════════════════════════════════

@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_announcement(
    announcement_data: AnnouncementCreate,
    current_user: str = Depends(get_current_user)
):
    """
    Create a new announcement (ADMIN ONLY)
    """
    # Verify admin permission
    user = await get_current_user_object(current_user)
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can create announcements")
    
    # Validate category
    valid_categories = ["general", "academic", "events", "rules", "emergency"]
    if announcement_data.category.lower() not in valid_categories:
        raise HTTPException(status_code=400, detail=f"Category must be one of: {', '.join(valid_categories)}")
    
    # Check pinned limit (max 3 pinned announcements)
    if announcement_data.pinned:
        pinned_count = await Announcement.find(
            Announcement.pinned == True,
            Announcement.deleted == False
        ).count()
        if pinned_count >= 3:
            raise HTTPException(status_code=400, detail="Maximum 3 announcements can be pinned. Unpin another first.")
    
    # Create announcement
    announcement = Announcement(
        title=announcement_data.title,
        content=announcement_data.content,
        category=announcement_data.category.lower(),
        author_id=user.username,
        author_name=f"{user.first_name} {user.last_name}",
        pinned=announcement_data.pinned,
        deleted=False,
        read_count=0,
        read_by=[],
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    
    await announcement.insert()
    
    result = announcement.dict()
    result["announcement_id"] = str(announcement.id)
    
    return result

@router.put("/{announcement_id}")
async def update_announcement(
    announcement_id: str,
    updates: AnnouncementUpdate,
    current_user: str = Depends(get_current_user)
):
    """
    Update announcement details (ADMIN ONLY)
    """
    # Verify admin permission
    user = await get_current_user_object(current_user)
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can update announcements")
    
    # Find announcement
    announcement = await Announcement.get(announcement_id)
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
    
    # Build update dict
    update_data = {}
    
    if updates.title is not None:
        if len(updates.title) < 10:
            raise HTTPException(status_code=400, detail="Title must be at least 10 characters")
        update_data[Announcement.title] = updates.title
    
    if updates.content is not None:
        if len(updates.content) < 15:
            raise HTTPException(status_code=400, detail="Content must be at least 15 characters")
        update_data[Announcement.content] = updates.content
    
    if updates.category is not None:
        valid_categories = ["general", "academic", "events", "rules", "emergency"]
        if updates.category.lower() not in valid_categories:
            raise HTTPException(status_code=400, detail=f"Category must be one of: {', '.join(valid_categories)}")
        update_data[Announcement.category] = updates.category.lower()
    
    if updates.pinned is not None:
        # Check pinned limit if trying to pin
        if updates.pinned and not announcement.pinned:
            pinned_count = await Announcement.find(
                Announcement.pinned == True,
                Announcement.deleted == False
            ).count()
            if pinned_count >= 3:
                raise HTTPException(status_code=400, detail="Maximum 3 announcements can be pinned. Unpin another first.")
        update_data[Announcement.pinned] = updates.pinned
    
    # Add updated_at
    update_data[Announcement.updated_at] = datetime.now(timezone.utc)
    
    # Apply updates
    await announcement.set(update_data)
    await announcement.sync()
    
    result = announcement.dict()
    result["announcement_id"] = str(announcement.id)
    result["is_read"] = current_user in announcement.read_by
    
    return result

@router.delete("/{announcement_id}")
async def delete_announcement(
    announcement_id: str,
    current_user: str = Depends(get_current_user)
):
    """
    Soft delete (archive) an announcement (ADMIN ONLY)
    """
    # Verify admin permission
    user = await get_current_user_object(current_user)
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can delete announcements")
    
    # Find announcement
    announcement = await Announcement.get(announcement_id)
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
    
    # Soft delete
    await announcement.set({
        Announcement.deleted: True,
        Announcement.pinned: False,  # Unpin when deleting
        Announcement.updated_at: datetime.now(timezone.utc)
    })
    
    return {"message": "Announcement archived successfully"}

@router.post("/{announcement_id}/restore")
async def restore_announcement(
    announcement_id: str,
    current_user: str = Depends(get_current_user)
):
    """
    Restore a deleted announcement (ADMIN ONLY)
    """
    # Verify admin permission
    user = await get_current_user_object(current_user)
    if user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Only admins can restore announcements")
    
    # Find announcement
    announcement = await Announcement.get(announcement_id)
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
    
    # Restore
    await announcement.set({
        Announcement.deleted: False,
        Announcement.updated_at: datetime.now(timezone.utc)
    })
    
    return {"message": "Announcement restored successfully"}
