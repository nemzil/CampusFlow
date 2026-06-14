"""
Course data for BSE and BSCS programs
Cleaned and organized by semester
"""

# BSE (Software Engineering) Courses
BSE_COURSES = [
    # Semester 1
    {"course_type": "core", "course_name": "ETHICAL BEHAVIOR", "course_code": "HS104", "category": "TH", "semester": 1, "prerequisites": [], "credit_hours": 2},
    {"course_type": "core", "course_name": "FUNCTIONAL ENGLISH", "course_code": "HS102T", "category": "TH", "semester": 1, "prerequisites": [], "credit_hours": 3},
    {"course_type": "core", "course_name": "ISLAMIC STUDIES", "course_code": "HS101", "category": "TH", "semester": 1, "prerequisites": [], "credit_hours": 2},
    {"course_type": "core", "course_name": "LINEAR ALGEBRA", "course_code": "MS108", "category": "TH", "semester": 1, "prerequisites": [], "credit_hours": 3},
    {"course_type": "core", "course_name": "INTRODUCTION TO COMPUTING", "course_code": "SE105T", "category": "TH", "semester": 1, "prerequisites": [], "credit_hours": 2},
    {"course_type": "core", "course_name": "INTRODUCTION TO COMPUTING LAB", "course_code": "SE105L", "category": "LAB", "semester": 1, "prerequisites": [], "credit_hours": 1},
    {"course_type": "core", "course_name": "PROGRAMMING FUNDAMENTALS", "course_code": "SE102T", "category": "TH", "semester": 1, "prerequisites": [], "credit_hours": 3},
    {"course_type": "core", "course_name": "PROGRAMMING FUNDAMENTALS LAB", "course_code": "SE102L", "category": "LAB", "semester": 1, "prerequisites": [], "credit_hours": 1},
    
    # Semester 2
    {"course_type": "core", "course_name": "CALCULUS AND ANALYTICAL GEOMETRY", "course_code": "MS103", "category": "TH", "semester": 2, "prerequisites": [], "credit_hours": 3},
    {"course_type": "core", "course_name": "PAKISTAN STUDIES AND ALIGARH MOVEMENT", "course_code": "HS103", "category": "TH", "semester": 2, "prerequisites": [], "credit_hours": 3},
    {"course_type": "core", "course_name": "INTRODUCTION TO SOFTWARE ENGINEERING", "course_code": "SE106T", "category": "TH", "semester": 2, "prerequisites": [], "credit_hours": 2},
    {"course_type": "core", "course_name": "INTRODUCTION TO SOFTWARE ENGINEERING LAB", "course_code": "SE106L", "category": "LAB", "semester": 2, "prerequisites": [], "credit_hours": 1},
    {"course_type": "core", "course_name": "OBJECT ORIENTED PROGRAMMING", "course_code": "SE103T", "category": "TH", "semester": 2, "prerequisites": ["SE102T"], "credit_hours": 3},
    {"course_type": "core", "course_name": "OBJECT ORIENTED PROGRAMMING LAB", "course_code": "SE103L", "category": "LAB", "semester": 2, "prerequisites": ["SE102T"], "credit_hours": 1},
    {"course_type": "core", "course_name": "APPLIED PHYSICS", "course_code": "MS110T", "category": "TH", "semester": 2, "prerequisites": [], "credit_hours": 3},
    {"course_type": "core", "course_name": "APPLIED PHYSICS LAB", "course_code": "MS110L", "category": "LAB", "semester": 2, "prerequisites": [], "credit_hours": 1},
    
    # Semester 3
    {"course_type": "core", "course_name": "COMMUNICATION SKILLS", "course_code": "HS201", "category": "TH", "semester": 3, "prerequisites": [], "credit_hours": 3},
    {"course_type": "core", "course_name": "DISCRETE MATHEMATICS", "course_code": "MS204", "category": "TH", "semester": 3, "prerequisites": [], "credit_hours": 3},
    {"course_type": "core", "course_name": "DATA STRUCTURE AND ALGORITHMS", "course_code": "SE203T", "category": "TH", "semester": 3, "prerequisites": ["SE102T"], "credit_hours": 3},
    {"course_type": "core", "course_name": "DATA STRUCTURE AND ALGORITHMS LAB", "course_code": "SE203L", "category": "LAB", "semester": 3, "prerequisites": ["SE102T"], "credit_hours": 1},
    {"course_type": "core", "course_name": "SOFTWARE REQUIREMENT ENGINEERING", "course_code": "SE205", "category": "TH", "semester": 3, "prerequisites": ["SE106T"], "credit_hours": 3},
    {"course_type": "core", "course_name": "COMPUTER ORGANIZATION AND ARCHITECTURE", "course_code": "SE212T", "category": "TH", "semester": 3, "prerequisites": [], "credit_hours": 3},
    {"course_type": "core", "course_name": "COMPUTER ORGANIZATION AND ARCHITECTURE LAB", "course_code": "SE212L", "category": "LAB", "semester": 3, "prerequisites": [], "credit_hours": 1},
    
    # Semester 4
    {"course_type": "core", "course_name": "TECHNICAL WRITING", "course_code": "HS211", "category": "TH", "semester": 4, "prerequisites": ["HS102T"], "credit_hours": 2},
    {"course_type": "core", "course_name": "OPERATING SYSTEMS", "course_code": "SE204T", "category": "TH", "semester": 4, "prerequisites": ["SE203T"], "credit_hours": 3},
    {"course_type": "core", "course_name": "OPERATING SYSTEMS LAB", "course_code": "SE204L", "category": "LAB", "semester": 4, "prerequisites": ["SE203T"], "credit_hours": 1},
    {"course_type": "core", "course_name": "INTRODUCTION TO DATABASE SYSTEMS", "course_code": "SE209T", "category": "TH", "semester": 4, "prerequisites": ["SE203T"], "credit_hours": 3},
    {"course_type": "core", "course_name": "INTRODUCTION TO DATABASE SYSTEMS LAB", "course_code": "SE209L", "category": "LAB", "semester": 4, "prerequisites": ["SE203T"], "credit_hours": 1},
    {"course_type": "core", "course_name": "SOFTWARE DESIGN AND ARCHITECTURE", "course_code": "SE211T", "category": "TH", "semester": 4, "prerequisites": ["SE106T"], "credit_hours": 3},
    {"course_type": "core", "course_name": "SOFTWARE DESIGN AND ARCHITECTURE LAB", "course_code": "SE211L", "category": "LAB", "semester": 4, "prerequisites": ["SE106T"], "credit_hours": 1},
    {"course_type": "core", "course_name": "PROBABILITY AND STATISTICS", "course_code": "MS301", "category": "TH", "semester": 4, "prerequisites": [], "credit_hours": 3},
    
    # Semester 5
    {"course_type": "core", "course_name": "COMPUTER COMMUNICATION AND NETWORKS", "course_code": "SE306T", "category": "TH", "semester": 5, "prerequisites": [], "credit_hours": 3},
    {"course_type": "core", "course_name": "COMPUTER COMMUNICATION AND NETWORKS LAB", "course_code": "SE306L", "category": "LAB", "semester": 5, "prerequisites": [], "credit_hours": 1},
    {"course_type": "core", "course_name": "HUMAN COMPUTER INTERACTION", "course_code": "SE308T", "category": "TH", "semester": 5, "prerequisites": [], "credit_hours": 3},
    {"course_type": "core", "course_name": "SOFTWARE CONSTRUCTION AND DEVELOPMENT", "course_code": "SE312T", "category": "TH", "semester": 5, "prerequisites": [], "credit_hours": 3},
    {"course_type": "core", "course_name": "SOFTWARE CONSTRUCTION AND DEVELOPMENT LAB", "course_code": "SE312L", "category": "LAB", "semester": 5, "prerequisites": [], "credit_hours": 1},
    {"course_type": "core", "course_name": "WEB ENGINEERING", "course_code": "SE315T", "category": "TH", "semester": 5, "prerequisites": ["SE102T"], "credit_hours": 3},
    {"course_type": "core", "course_name": "WEB ENGINEERING LAB", "course_code": "SE315L", "category": "LAB", "semester": 5, "prerequisites": ["SE102T"], "credit_hours": 1},
    
    # Semester 6
    {"course_type": "core", "course_name": "INFORMATION SECURITY", "course_code": "SE313T", "category": "TH", "semester": 6, "prerequisites": [], "credit_hours": 3},
    {"course_type": "core", "course_name": "SOFTWARE TESTING AND QUALITY ASSURANCE", "course_code": "SE314T", "category": "TH", "semester": 6, "prerequisites": ["SE312T"], "credit_hours": 3},
    {"course_type": "core", "course_name": "SOFTWARE TESTING AND QUALITY ASSURANCE LAB", "course_code": "SE314L", "category": "LAB", "semester": 6, "prerequisites": ["SE312T"], "credit_hours": 1},
    {"course_type": "core", "course_name": "MOBILE APPLICATION DEVELOPMENT", "course_code": "SE316T", "category": "TH", "semester": 6, "prerequisites": [], "credit_hours": 3},
    {"course_type": "core", "course_name": "MOBILE APPLICATION DEVELOPMENT LAB", "course_code": "SE316L", "category": "LAB", "semester": 6, "prerequisites": [], "credit_hours": 1},
    
    # Semester 7
    {"course_type": "core", "course_name": "SOFTWARE PROJECT MANAGEMENT", "course_code": "SE401T", "category": "TH", "semester": 7, "prerequisites": [], "credit_hours": 3},
    {"course_type": "core", "course_name": "SOFTWARE RE-ENGINEERING", "course_code": "SE417", "category": "TH", "semester": 7, "prerequisites": ["SE312T"], "credit_hours": 3},
    {"course_type": "core", "course_name": "FINAL YEAR PROJECT-I", "course_code": "SE499", "category": "TH", "semester": 7, "prerequisites": [], "credit_hours": 3},
    {"course_type": "elective", "course_name": "ARTIFICIAL INTELLIGENCE", "course_code": "SE414T", "category": "TH", "semester": 7, "prerequisites": [], "credit_hours": 3},
    {"course_type": "elective", "course_name": "MACHINE LEARNING", "course_code": "SE415T", "category": "TH", "semester": 7, "prerequisites": [], "credit_hours": 3},
    
    # Semester 8
    {"course_type": "core", "course_name": "COMPUTING PROFESSIONAL PRACTICES", "course_code": "HS412T", "category": "TH", "semester": 8, "prerequisites": [], "credit_hours": 3},
    {"course_type": "core", "course_name": "FINAL YEAR PROJECT-II", "course_code": "SE500", "category": "TH", "semester": 8, "prerequisites": ["SE499"], "credit_hours": 3},
    {"course_type": "elective", "course_name": "DEEP LEARNING", "course_code": "SE419T", "category": "TH", "semester": 8, "prerequisites": ["SE414T"], "credit_hours": 3},
    {"course_type": "elective", "course_name": "CLOUD COMPUTING", "course_code": "SE420T", "category": "TH", "semester": 8, "prerequisites": [], "credit_hours": 3},
    {"course_type": "elective", "course_name": "BLOCKCHAIN TECHNOLOGY", "course_code": "SE421T", "category": "TH", "semester": 8, "prerequisites": [], "credit_hours": 3},
]

# BSCS (Computer Science) Courses
BSCS_COURSES = [
    # Semester 1
    {"course_type": "core", "course_name": "ETHICAL BEHAVIOR", "course_code": "HS104", "category": "TH", "semester": 1, "prerequisites": [], "credit_hours": 2},
    {"course_type": "core", "course_name": "FUNCTIONAL ENGLISH", "course_code": "HS102T", "category": "TH", "semester": 1, "prerequisites": [], "credit_hours": 3},
    {"course_type": "core", "course_name": "ISLAMIC STUDIES", "course_code": "HS101", "category": "TH", "semester": 1, "prerequisites": [], "credit_hours": 2},
    {"course_type": "core", "course_name": "CALCULUS I", "course_code": "MS101", "category": "TH", "semester": 1, "prerequisites": [], "credit_hours": 3},
    {"course_type": "core", "course_name": "DISCRETE MATHEMATICS", "course_code": "CS102", "category": "TH", "semester": 1, "prerequisites": [], "credit_hours": 3},
    {"course_type": "core", "course_name": "PROGRAMMING FUNDAMENTALS", "course_code": "CS103T", "category": "TH", "semester": 1, "prerequisites": [], "credit_hours": 3},
    {"course_type": "core", "course_name": "PROGRAMMING FUNDAMENTALS LAB", "course_code": "CS103L", "category": "LAB", "semester": 1, "prerequisites": [], "credit_hours": 1},
    
    # Semester 2
    {"course_type": "core", "course_name": "PAKISTAN STUDIES", "course_code": "HS103", "category": "TH", "semester": 2, "prerequisites": [], "credit_hours": 3},
    {"course_type": "core", "course_name": "CALCULUS II", "course_code": "MS102", "category": "TH", "semester": 2, "prerequisites": ["MS101"], "credit_hours": 3},
    {"course_type": "core", "course_name": "LINEAR ALGEBRA", "course_code": "MS108", "category": "TH", "semester": 2, "prerequisites": [], "credit_hours": 3},
    {"course_type": "core", "course_name": "OBJECT ORIENTED PROGRAMMING", "course_code": "CS104T", "category": "TH", "semester": 2, "prerequisites": ["CS103T"], "credit_hours": 3},
    {"course_type": "core", "course_name": "OBJECT ORIENTED PROGRAMMING LAB", "course_code": "CS104L", "category": "LAB", "semester": 2, "prerequisites": ["CS103T"], "credit_hours": 1},
    {"course_type": "core", "course_name": "DIGITAL LOGIC DESIGN", "course_code": "CS105T", "category": "TH", "semester": 2, "prerequisites": [], "credit_hours": 3},
    {"course_type": "core", "course_name": "DIGITAL LOGIC DESIGN LAB", "course_code": "CS105L", "category": "LAB", "semester": 2, "prerequisites": [], "credit_hours": 1},
    
    # Semester 3
    {"course_type": "core", "course_name": "COMMUNICATION SKILLS", "course_code": "HS201", "category": "TH", "semester": 3, "prerequisites": [], "credit_hours": 3},
    {"course_type": "core", "course_name": "DATA STRUCTURES", "course_code": "CS201T", "category": "TH", "semester": 3, "prerequisites": ["CS103T"], "credit_hours": 3},
    {"course_type": "core", "course_name": "DATA STRUCTURES LAB", "course_code": "CS201L", "category": "LAB", "semester": 3, "prerequisites": ["CS103T"], "credit_hours": 1},
    {"course_type": "core", "course_name": "COMPUTER ORGANIZATION AND ASSEMBLY LANGUAGE", "course_code": "CS202T", "category": "TH", "semester": 3, "prerequisites": ["CS105T"], "credit_hours": 3},
    {"course_type": "core", "course_name": "COMPUTER ORGANIZATION AND ASSEMBLY LANGUAGE LAB", "course_code": "CS202L", "category": "LAB", "semester": 3, "prerequisites": ["CS105T"], "credit_hours": 1},
    {"course_type": "core", "course_name": "PROBABILITY AND STATISTICS", "course_code": "MS301", "category": "TH", "semester": 3, "prerequisites": [], "credit_hours": 3},
    {"course_type": "core", "course_name": "DATABASE SYSTEMS", "course_code": "CS203T", "category": "TH", "semester": 3, "prerequisites": [], "credit_hours": 3},
    {"course_type": "core", "course_name": "DATABASE SYSTEMS LAB", "course_code": "CS203L", "category": "LAB", "semester": 3, "prerequisites": [], "credit_hours": 1},
    
    # Semester 4
    {"course_type": "core", "course_name": "TECHNICAL WRITING", "course_code": "HS211", "category": "TH", "semester": 4, "prerequisites": ["HS102T"], "credit_hours": 2},
    {"course_type": "core", "course_name": "ALGORITHMS", "course_code": "CS204T", "category": "TH", "semester": 4, "prerequisites": ["CS201T"], "credit_hours": 3},
    {"course_type": "core", "course_name": "ALGORITHMS LAB", "course_code": "CS204L", "category": "LAB", "semester": 4, "prerequisites": ["CS201T"], "credit_hours": 1},
    {"course_type": "core", "course_name": "OPERATING SYSTEMS", "course_code": "CS205T", "category": "TH", "semester": 4, "prerequisites": ["CS201T"], "credit_hours": 3},
    {"course_type": "core", "course_name": "OPERATING SYSTEMS LAB", "course_code": "CS205L", "category": "LAB", "semester": 4, "prerequisites": ["CS201T"], "credit_hours": 1},
    {"course_type": "core", "course_name": "COMPUTER NETWORKS", "course_code": "CS206T", "category": "TH", "semester": 4, "prerequisites": [], "credit_hours": 3},
    {"course_type": "core", "course_name": "COMPUTER NETWORKS LAB", "course_code": "CS206L", "category": "LAB", "semester": 4, "prerequisites": [], "credit_hours": 1},
    {"course_type": "core", "course_name": "SOFTWARE ENGINEERING", "course_code": "CS207T", "category": "TH", "semester": 4, "prerequisites": [], "credit_hours": 3},
    
    # Semester 5
    {"course_type": "core", "course_name": "THEORY OF AUTOMATA", "course_code": "CS301T", "category": "TH", "semester": 5, "prerequisites": ["CS102"], "credit_hours": 3},
    {"course_type": "core", "course_name": "COMPILER CONSTRUCTION", "course_code": "CS302T", "category": "TH", "semester": 5, "prerequisites": ["CS201T"], "credit_hours": 3},
    {"course_type": "core", "course_name": "COMPILER CONSTRUCTION LAB", "course_code": "CS302L", "category": "LAB", "semester": 5, "prerequisites": ["CS201T"], "credit_hours": 1},
    {"course_type": "core", "course_name": "ARTIFICIAL INTELLIGENCE", "course_code": "CS303T", "category": "TH", "semester": 5, "prerequisites": [], "credit_hours": 3},
    {"course_type": "core", "course_name": "ARTIFICIAL INTELLIGENCE LAB", "course_code": "CS303L", "category": "LAB", "semester": 5, "prerequisites": [], "credit_hours": 1},
    {"course_type": "core", "course_name": "WEB TECHNOLOGIES", "course_code": "CS304T", "category": "TH", "semester": 5, "prerequisites": [], "credit_hours": 3},
    {"course_type": "core", "course_name": "WEB TECHNOLOGIES LAB", "course_code": "CS304L", "category": "LAB", "semester": 5, "prerequisites": [], "credit_hours": 1},
    
    # Semester 6
    {"course_type": "core", "course_name": "INFORMATION SECURITY", "course_code": "CS305T", "category": "TH", "semester": 6, "prerequisites": [], "credit_hours": 3},
    {"course_type": "core", "course_name": "COMPUTER GRAPHICS", "course_code": "CS306T", "category": "TH", "semester": 6, "prerequisites": [], "credit_hours": 3},
    {"course_type": "core", "course_name": "COMPUTER GRAPHICS LAB", "course_code": "CS306L", "category": "LAB", "semester": 6, "prerequisites": [], "credit_hours": 1},
    {"course_type": "core", "course_name": "MOBILE APPLICATION DEVELOPMENT", "course_code": "CS307T", "category": "TH", "semester": 6, "prerequisites": [], "credit_hours": 3},
    {"course_type": "core", "course_name": "MOBILE APPLICATION DEVELOPMENT LAB", "course_code": "CS307L", "category": "LAB", "semester": 6, "prerequisites": [], "credit_hours": 1},
    {"course_type": "elective", "course_name": "MACHINE LEARNING", "course_code": "CS308T", "category": "TH", "semester": 6, "prerequisites": ["CS303T"], "credit_hours": 3},
    
    # Semester 7
    {"course_type": "core", "course_name": "DISTRIBUTED SYSTEMS", "course_code": "CS401T", "category": "TH", "semester": 7, "prerequisites": ["CS205T"], "credit_hours": 3},
    {"course_type": "core", "course_name": "FINAL YEAR PROJECT-I", "course_code": "CS499", "category": "TH", "semester": 7, "prerequisites": [], "credit_hours": 3},
    {"course_type": "elective", "course_name": "DATA MINING", "course_code": "CS402T", "category": "TH", "semester": 7, "prerequisites": ["CS203T"], "credit_hours": 3},
    {"course_type": "elective", "course_name": "NATURAL LANGUAGE PROCESSING", "course_code": "CS403T", "category": "TH", "semester": 7, "prerequisites": ["CS303T"], "credit_hours": 3},
    {"course_type": "elective", "course_name": "CLOUD COMPUTING", "course_code": "CS404T", "category": "TH", "semester": 7, "prerequisites": [], "credit_hours": 3},
    
    # Semester 8
    {"course_type": "core", "course_name": "PROFESSIONAL PRACTICES", "course_code": "HS412T", "category": "TH", "semester": 8, "prerequisites": [], "credit_hours": 3},
    {"course_type": "core", "course_name": "FINAL YEAR PROJECT-II", "course_code": "CS500", "category": "TH", "semester": 8, "prerequisites": ["CS499"], "credit_hours": 3},
    {"course_type": "elective", "course_name": "DEEP LEARNING", "course_code": "CS405T", "category": "TH", "semester": 8, "prerequisites": ["CS308T"], "credit_hours": 3},
    {"course_type": "elective", "course_name": "BLOCKCHAIN TECHNOLOGY", "course_code": "CS406T", "category": "TH", "semester": 8, "prerequisites": [], "credit_hours": 3},
    {"course_type": "elective", "course_name": "BIG DATA ANALYTICS", "course_code": "CS407T", "category": "TH", "semester": 8, "prerequisites": [], "credit_hours": 3},
    {"course_type": "elective", "course_name": "INTERNET OF THINGS", "course_code": "CS408T", "category": "TH", "semester": 8, "prerequisites": [], "credit_hours": 3},
]
