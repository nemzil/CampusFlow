import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
<<<<<<< HEAD

/**
 * Get the current academic term based on the current date.
 * 
 * Rules:
 * - January to May: Spring (e.g., 2025S)
 * - June to December: Fall (e.g., 2025F)
 * 
 * @returns {string} Term in format YYYYF or YYYS
 */
export function getCurrentAcademicTerm() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  
  if (month >= 1 && month <= 5) {
    return `${year}S`;
  } else {
    return `${year}F`;
  }
}

/**
 * Get just the current session name (Fall or Spring) without year.
 * 
 * @returns {string} 'Fall' or 'Spring'
 */
export function getCurrentSession() {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  
  if (month >= 1 && month <= 5) {
    return "Spring";
  } else {
    return "Fall";
  }
}

/**
 * Resolve a term identifier to a full academic term string.
 * If term is 'Fall' or 'Spring', appends the current year.
 * If term is already a full term (e.g., '2025F'), returns as-is.
 * 
 * @param {string} term - Term identifier
 * @returns {string} Full academic term string
 */
export function resolveTerm(term) {
  const upper = term.toUpperCase();
  const year = new Date().getFullYear();
  
  if (upper === "FALL") {
    return `${year}F`;
  } else if (upper === "SPRING") {
    return `${year}S`;
  }
  
  return term;
}
=======
>>>>>>> dfcb8b4dcbd245453f1448c935a8ac364f27767e
