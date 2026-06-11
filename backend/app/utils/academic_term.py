from datetime import datetime


def get_current_academic_term() -> str:
    """
    Get the current academic term with year based on the current date.
    
    Rules:
    - January to May: Spring (e.g., 2025S)
    - June to December: Fall (e.g., 2025F)
    
    Returns:
        str: Term in format YYYYF or YYYS
    """
    now = datetime.now()
    year = now.year
    month = now.month
    
    if 1 <= month <= 5:
        return f"{year}S"
    else:
        return f"{year}F"


def resolve_term(term: str) -> str:
    """
    Resolve a term identifier to a full academic term string with year.
    
    If term is 'Fall' or 'Spring', automatically appends the current year.
    If term is already a full term (e.g., '2025F'), returns as-is.
    
    Args:
        term: Term identifier ('Fall', 'Spring', 'fall', 'spring', '2025F', '2025S', etc.)
    
    Returns:
        str: Full academic term string with year (e.g., '2025F', '2025S')
    """
    term_upper = term.upper().strip()
    
    # Convert 'Fall' or 'Spring' to current year term
    if term_upper == "FALL":
        year = datetime.now().year
        return f"{year}F"
    elif term_upper == "SPRING":
        year = datetime.now().year
        return f"{year}S"
    
    # Return as-is if already in YYYYF or YYYYS format
    return term


def get_current_session() -> str:
    """
    Get just the current session name (Fall or Spring) without year.
    
    Returns:
        str: 'Fall' or 'Spring'
    """
    now = datetime.now()
    month = now.month
    
    if 1 <= month <= 5:
        return "Spring"
    else:
        return "Fall"


def get_term_display_name(term: str) -> str:
    """
    Convert a full term string (e.g., '2025F') to a display name (e.g., 'Fall 2025').
    
    Args:
        term: Full term string (e.g., '2025F', '2025S')
    
    Returns:
        str: Display name (e.g., 'Fall 2025', 'Spring 2025')
    """
    if not term:
        return "Unknown"
    
    term_upper = term.upper().strip()
    
    # Handle simple 'Fall' or 'Spring'
    if term_upper == "FALL":
        return f"Fall {datetime.now().year}"
    elif term_upper == "SPRING":
        return f"Spring {datetime.now().year}"
    
    # Handle YYYYF or YYYYS format
    if len(term_upper) >= 5 and term_upper[-1] in ['F', 'S']:
        year = term_upper[:-1]
        season = 'Fall' if term_upper[-1] == 'F' else 'Spring'
        return f"{season} {year}"
    
    return term
