"""
Response formatting utilities
"""
from typing import Any, Dict


def success_response(message: str, data: Any = None) -> Dict:
    """
    Standard success response format
    """
    response = {"success": True, "message": message}
    if data is not None:
        response["data"] = data
    return response


def error_response(message: str, details: Any = None) -> Dict:
    """
    Standard error response format
    """
    response = {"success": False, "error": message}
    if details is not None:
        response["details"] = details
    return response
