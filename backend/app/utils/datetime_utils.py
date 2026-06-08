"""
Date and time utility functions
"""
from datetime import datetime, timezone


def utc_now():
    """
    Get current UTC datetime with timezone info
    Replaces deprecated datetime.utcnow()
    """
    return datetime.now(timezone.utc)


def days_between(date1, date2):
    """
    Calculate days between two dates
    Returns positive if date2 is in future, negative if in past
    """
    delta = date2 - date1
    return delta.days
