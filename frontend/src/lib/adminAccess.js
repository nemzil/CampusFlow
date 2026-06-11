export const ADMIN_LEVELS = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  FEE_MANAGEMENT_ADMIN: 'FEE_MANAGEMENT_ADMIN',
  COURSE_MANAGEMENT_ADMIN: 'COURSE_MANAGEMENT_ADMIN',
  EXAM_MANAGEMENT_ADMIN: 'EXAM_MANAGEMENT_ADMIN',
};

export function isCourseManagementAdmin(user) {
  return user?.admin_level === ADMIN_LEVELS.COURSE_MANAGEMENT_ADMIN;
}

export function isFeeManagementAdmin(user) {
  return user?.admin_level === ADMIN_LEVELS.FEE_MANAGEMENT_ADMIN;
}

export function isExamManagementAdmin(user) {
  return user?.admin_level === ADMIN_LEVELS.EXAM_MANAGEMENT_ADMIN;
}

export function isScopedAdmin(user) {
  return isCourseManagementAdmin(user) || isFeeManagementAdmin(user) || isExamManagementAdmin(user);
}

export function isFullAdmin(user) {
  return user?.role === 'ADMIN' && !isScopedAdmin(user);
}

export function canEditCourseManagement(user) {
  return isCourseManagementAdmin(user);
}

export function canViewCourseManagement(user) {
  if (!user || user.role !== 'ADMIN') return false;
  return isCourseManagementAdmin(user) || isFullAdmin(user);
}

export function canAccessEnrollment(user) {
  return isCourseManagementAdmin(user);
}

export function canEditExamManagement(user) {
  return isExamManagementAdmin(user);
}

export function canViewExamManagement(user) {
  if (!user || user.role !== 'ADMIN') return false;
  return isExamManagementAdmin(user) || isFullAdmin(user);
}

/** @deprecated use canViewCourseManagement or canEditCourseManagement */
export function canAccessCourseManagement(user) {
  return canViewCourseManagement(user);
}

/** @deprecated use canViewExamManagement or canEditExamManagement */
export function canAccessExamManagement(user) {
  return canViewExamManagement(user);
}

export function canAccessFullAdminConsole(user) {
  if (!user || user.role !== 'ADMIN') return false;
  return !isScopedAdmin(user);
}
