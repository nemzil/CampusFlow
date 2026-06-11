/**
 * API Client for CampusFlow
 * Handles all API requests to the backend
 */

const API_BASE = 'http://localhost:8000/api';

// Get auth token from localStorage
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

// Error handling wrapper
async function apiRequest(url, options = {}) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout (increased)
    
    const response = await fetch(url, {
      cache: 'no-store',
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      const portal = localStorage.getItem('portal');
      window.location.href = portal === 'exam-portal' ? '/exam-portal/login' : '/login';
      throw new Error('Session expired');
    }
    
    if (!response.ok) {
      let error;
      try {
        error = await response.json();
        
        // Handle FastAPI validation errors (array format)
        if (error.detail && Array.isArray(error.detail)) {
          const messages = error.detail.map(err => {
            const location = err.loc ? err.loc.join('.') : 'unknown';
            return `${location}: ${err.msg}`;
          }).join('; ');
          throw new Error(`API Error (${url}): ${messages}`);
        }
        
        // Handle string error detail
        if (typeof error.detail === 'string') {
          throw new Error(`API Error (${url}): ${error.detail}`);
        }
        
        // Handle object error detail
        if (typeof error.detail === 'object') {
          throw new Error(`API Error (${url}): ${JSON.stringify(error.detail)}`);
        }
        
        throw new Error(`API Error (${url}): ${error.message || JSON.stringify(error) || 'Request failed'}`);
      } catch (e) {
        if (e.message && !e.message.includes('JSON')) {
          // It's our thrown error, re-throw it
          throw e;
        }
        // Response is not JSON
        const text = await response.text();
        console.error('API Error (non-JSON):', text);
        throw new Error(`Request failed with status ${response.status}: ${text || 'Unknown error'}`);
      }
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    // Handle abort errors specifically
    if (error.name === 'AbortError') {
      console.error('Request timeout:', url);
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    console.error('API Error:', error);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════
// AUTHENTICATION & PROFILE
// ═══════════════════════════════════════════════════════════════════

export async function login(username, password) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Login failed');
  }
  return response.json();
}

export async function getUserProfile(username) {
  return apiRequest(`${API_BASE}/auth/users/${username}`);
}

export async function updateUserProfile(username, updates) {
  return apiRequest(`${API_BASE}/auth/users/${username}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  });
}

export async function changePassword(username, oldPassword, newPassword) {
  return apiRequest(`${API_BASE}/auth/users/${username}/password`, {
    method: 'POST',
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword })
  });
}

// ═══════════════════════════════════════════════════════════════════
// TODOS
// ═══════════════════════════════════════════════════════════════════

export async function getTodos(filters = {}) {
  const params = new URLSearchParams();
  if (filters.completed !== null && filters.completed !== undefined) {
    params.append('completed', filters.completed);
  }
  if (filters.priority) params.append('priority', filters.priority);
  if (filters.source) params.append('source', filters.source);
  if (filters.sort_by) params.append('sort_by', filters.sort_by);
  if (filters.sort_order) params.append('sort_order', filters.sort_order);
  
  return apiRequest(`${API_BASE}/todos?${params}`);
}

export async function createTodo(todoData) {
  return apiRequest(`${API_BASE}/todos/`, {
    method: 'POST',
    body: JSON.stringify(todoData)
  });
}

export async function updateTodo(todoId, updates) {
  return apiRequest(`${API_BASE}/todos/${todoId}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
}

export async function deleteTodo(todoId) {
  return apiRequest(`${API_BASE}/todos/${todoId}`, {
    method: 'DELETE'
  });
}

export async function getTodoStats() {
  return apiRequest(`${API_BASE}/todos/stats`);
}

// ═══════════════════════════════════════════════════════════════════
// CHAT & MESSAGING
// ═══════════════════════════════════════════════════════════════════

export async function getConversations(includeArchived = false) {
  const params = new URLSearchParams({ 
    include_archived: includeArchived,
    _t: Date.now()
  });
  return apiRequest(`${API_BASE}/chat/conversations?${params}`);
}

export async function getMessages(conversationId, limit = 50, beforeId = null) {
  const params = new URLSearchParams({ 
    limit,
    _t: Date.now()
  });
  if (beforeId) params.append('before_id', beforeId);
  
  return apiRequest(`${API_BASE}/chat/conversations/${conversationId}/messages?${params}`);
}

export async function sendMessage(conversationId, text, recipientUsername = null) {
  const body = conversationId 
    ? { conversation_id: conversationId, text }
    : { recipient_username: recipientUsername, text };
  
  return apiRequest(`${API_BASE}/chat/messages`, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export async function editMessage(messageId, text) {
  return apiRequest(`${API_BASE}/chat/messages/${messageId}`, {
    method: 'PUT',
    body: JSON.stringify({ text })
  });
}

export async function deleteMessage(messageId, type = 'for_me') {
  return apiRequest(`${API_BASE}/chat/messages/${messageId}?type=${type}`, {
    method: 'DELETE'
  });
}

export async function markConversationAsRead(conversationId) {
  return apiRequest(`${API_BASE}/chat/conversations/${conversationId}/read`, {
    method: 'PUT'
  });
}

export async function markConversationAsUnread(conversationId) {
  return apiRequest(`${API_BASE}/chat/conversations/${conversationId}/unread`, {
    method: 'PUT'
  });
}

export async function archiveConversation(conversationId, archive = true) {
  return apiRequest(`${API_BASE}/chat/conversations/${conversationId}/archive?archive=${archive}`, {
    method: 'PUT'
  });
}

export async function muteConversation(conversationId, mute = true, hours = 'forever') {
  let url = `${API_BASE}/chat/conversations/${conversationId}/mute?mute=${mute}`;
  if (mute && hours !== 'forever') {
    url += `&hours=${hours}`;
  }
  return apiRequest(url, {
    method: 'PUT'
  });
}

export async function deleteConversation(conversationId) {
  return apiRequest(`${API_BASE}/chat/conversations/${conversationId}`, {
    method: 'DELETE'
  });
}

export async function clearChat(conversationId) {
  return apiRequest(`${API_BASE}/chat/conversations/${conversationId}/clear`, {
    method: 'DELETE'
  });
}

export async function searchUsers(query) {
  const params = new URLSearchParams({ query });
  return apiRequest(`${API_BASE}/chat/directory?${params}`);
}

// ═══════════════════════════════════════════════════════════════════
// ADMIN: USER REGISTRATION & MANAGEMENT
// ═══════════════════════════════════════════════════════════════════

export async function registerStudent(studentData) {
  return apiRequest(`${API_BASE}/auth/register/student`, {
    method: 'POST',
    body: JSON.stringify(studentData)
  });
}

export async function registerTeacher(teacherData) {
  return apiRequest(`${API_BASE}/auth/register/teacher`, {
    method: 'POST',
    body: JSON.stringify(teacherData)
  });
}

export async function registerAdmin(adminData) {
  return apiRequest(`${API_BASE}/auth/register/admin`, {
    method: 'POST',
    body: JSON.stringify(adminData)
  });
}

export async function listUsers(role = null, skip = 0, limit = 50) {
  const params = new URLSearchParams({ skip, limit });
  if (role) params.append('role', role);
  return apiRequest(`${API_BASE}/auth/users?${params}`);
}

export async function deleteUser(username) {
  return apiRequest(`${API_BASE}/auth/users/${username}`, {
    method: 'DELETE'
  });
}

export async function activateUser(username) {
  return apiRequest(`${API_BASE}/auth/users/${username}/activate`, {
    method: 'PATCH'
  });
}

export async function deactivateUser(username) {
  return apiRequest(`${API_BASE}/auth/users/${username}/deactivate`, {
    method: 'PATCH'
  });
}

export async function adminEditUser(username, updates) {
  return apiRequest(`${API_BASE}/auth/users/${username}/admin-edit`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  });
}

export async function bulkRegisterUsers(role, file) {
  const formData = new FormData();
  formData.append('file', file);
  
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE}/auth/bulk-register/${role}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Session expired');
  }
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Upload failed');
  }
  
  return response.json();
}

// ═══════════════════════════════════════════════════════════════════
// EXAMS - MANUAL
// ═══════════════════════════════════════════════════════════════════

export async function getManualExams(filters = {}) {
  const params = new URLSearchParams();
  if (filters.teacher_username) params.append('teacher_username', filters.teacher_username);
  if (filters.class_name) params.append('class_name', filters.class_name);
  if (filters.skip) params.append('skip', filters.skip);
  if (filters.limit) params.append('limit', filters.limit);
  
  return apiRequest(`${API_BASE}/manual-exams?${params}`);
}

export async function getManualExam(examId) {
  return apiRequest(`${API_BASE}/manual-exams/${examId}`);
}

export async function createManualExam(examData) {
  return apiRequest(`${API_BASE}/manual-exams`, {
    method: 'POST',
    body: JSON.stringify(examData)
  });
}

export async function setManualExamLive(examId, startTime, endTime) {
  return apiRequest(`${API_BASE}/manual-exams/${examId}/live`, {
    method: 'PUT',
    body: JSON.stringify({ start_time: startTime, end_time: endTime })
  });
}

export async function endManualExam(examId) {
  return apiRequest(`${API_BASE}/manual-exams/${examId}/end`, {
    method: 'PUT'
  });
}

export async function submitManualExam(examId, submissionData) {
  return apiRequest(`${API_BASE}/manual-exams/${examId}/submit`, {
    method: 'POST',
    body: JSON.stringify(submissionData)
  });
}

export async function getManualExamSubmissions(examId, skip = 0, limit = 50) {
  const params = new URLSearchParams({ skip, limit });
  return apiRequest(`${API_BASE}/manual-exams/${examId}/submissions?${params}`);
}

export async function getManualSubmission(submissionId) {
  return apiRequest(`${API_BASE}/manual-exams/submissions/${submissionId}`);
}

export async function markManualSubmission(submissionId, markingData) {
  return apiRequest(`${API_BASE}/manual-exams/submissions/${submissionId}/mark`, {
    method: 'PUT',
    body: JSON.stringify(markingData)
  });
}

// ═══════════════════════════════════════════════════════════════════
// EXAMS - AI
// ═══════════════════════════════════════════════════════════════════

export async function createAiExam(examData) {
  return apiRequest(`${API_BASE}/ai-exams`, {
    method: 'POST',
    body: JSON.stringify(examData)
  });
}

export async function getAiExams(filters = {}) {
  const params = new URLSearchParams();
  if (filters.teacher_username) params.append('teacher_username', filters.teacher_username);
  if (filters.class_name) params.append('class_name', filters.class_name);
  if (filters.status) params.append('status', filters.status);
  if (filters.skip) params.append('skip', filters.skip);
  if (filters.limit) params.append('limit', filters.limit);
  
  return apiRequest(`${API_BASE}/ai-exams?${params}`);
}

export async function getAiExam(examId) {
  return apiRequest(`${API_BASE}/ai-exams/${examId}`);
}

export async function updateAiQuestion(examId, questionId, questionText) {
  return apiRequest(`${API_BASE}/ai-exams/${examId}/questions/${questionId}`, {
    method: 'PUT',
    body: JSON.stringify({ question: questionText })
  });
}

export async function undoAiQuestion(examId, questionId) {
  return apiRequest(`${API_BASE}/ai-exams/${examId}/questions/${questionId}/undo`, {
    method: 'POST'
  });
}

export async function setAiExamLive(examId, startTime, endTime) {
  return apiRequest(`${API_BASE}/ai-exams/${examId}/live`, {
    method: 'PUT',
    body: JSON.stringify({ start_time: startTime, end_time: endTime })
  });
}

export async function endAiExam(examId) {
  return apiRequest(`${API_BASE}/ai-exams/${examId}/end`, {
    method: 'PUT'
  });
}

export async function loadAiExam(examId, className) {
  console.log('loadAiExam called with:', { examId, className });
  const url = `${API_BASE}/ai-exams/student/load`;
  console.log('Request URL:', url);
  console.log('Request body:', { exam_id: examId, class_name: className });
  
  return apiRequest(url, {
    method: 'POST',
    body: JSON.stringify({ exam_id: examId, class_name: className })
  });
}

export async function submitAiExam(examId, className, answers) {
  console.log('submitAiExam called with:', { examId, className, answersCount: answers.length });
  console.log('Request URL:', `${API_BASE}/ai-exams/student/submit`);
  console.log('Request body:', { exam_id: examId, class_name: className, answers });
  
  return apiRequest(`${API_BASE}/ai-exams/student/submit`, {
    method: 'POST',
    body: JSON.stringify({ exam_id: examId, class_name: className, answers })
  });
}

export async function getAiExamSubmissions(examId, skip = 0, limit = 50) {
  const params = new URLSearchParams({ skip, limit });
  return apiRequest(`${API_BASE}/ai-exams/${examId}/submissions?${params}`);
}

export async function gradeAiExam(examId, studentUsername) {
  return apiRequest(`${API_BASE}/ai-exams/${examId}/grade`, {
    method: 'POST',
    body: JSON.stringify({ student_username: studentUsername })
  });
}

export async function confirmAiResult(examId, studentUsername, items) {
  return apiRequest(`${API_BASE}/ai-exams/${examId}/results`, {
    method: 'POST',
    body: JSON.stringify({ student_username: studentUsername, items })
  });
}

export async function getTeacherResults(skip = 0, limit = 50) {
  const params = new URLSearchParams({ skip, limit });
  return apiRequest(`${API_BASE}/ai-exams/results?${params}`);
}

export async function getStudentResults(skip = 0, limit = 50) {
  const params = new URLSearchParams({ skip, limit });
  return apiRequest(`${API_BASE}/ai-exams/student/results?${params}`);
}

export async function getTeacherExamStats() {
  return apiRequest(`${API_BASE}/ai-exams/statistics`);
}

export async function getStudentExamStats() {
  return apiRequest(`${API_BASE}/ai-exams/student/statistics`);
}

export async function deleteAiExam(examId) {
  return apiRequest(`${API_BASE}/ai-exams/${examId}`, { method: 'DELETE' });
}

export async function deleteManualExam(examId) {
  return apiRequest(`${API_BASE}/manual-exams/${examId}`, { method: 'DELETE' });
}

// ═══════════════════════════════════════════════════════════════════
// COURSES & SECTIONS (MODULE 06)
// ═══════════════════════════════════════════════════════════════════

export async function getCourses(filters = {}) {
  const params = new URLSearchParams();
  if (filters.semester) params.append('semester', filters.semester);
  if (filters.term) params.append('term', filters.term);
  if (filters.type) params.append('type', filters.type);
  if (filters.category) params.append('category', filters.category);
  if (filters.department) params.append('department', filters.department);
  if (filters.search) params.append('search', filters.search);
  
  return apiRequest(`${API_BASE}/courses?${params}`);
}

export async function getCourse(courseCode) {
  return apiRequest(`${API_BASE}/courses/${courseCode}`);
}

export async function createCourse(courseData) {
  return apiRequest(`${API_BASE}/courses`, {
    method: 'POST',
    body: JSON.stringify(courseData)
  });
}

export async function updateCourse(courseCode, updates) {
  return apiRequest(`${API_BASE}/courses/${courseCode}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
}

export async function deleteCourse(courseCode) {
  return apiRequest(`${API_BASE}/courses/${courseCode}`, {
    method: 'DELETE'
  });
}

export async function assignTeacher(courseCode, teacherUsername) {
  return apiRequest(`${API_BASE}/courses/${courseCode}/assign-teacher`, {
    method: 'POST',
    body: JSON.stringify({ teacher_username: teacherUsername })
  });
}

export async function unassignTeacher(courseCode) {
  return apiRequest(`${API_BASE}/courses/${courseCode}/unassign-teacher`, {
    method: 'POST'
  });
}

export async function getMyCourses() {
  return apiRequest(`${API_BASE}/courses/my-courses`);
}

export async function getAvailableCourses() {
  // For students, this returns courses for their current semester
  return apiRequest(`${API_BASE}/courses/my-courses`);
}

// ═══════════════════════════════════════════════════════════════════
// ANNOUNCEMENTS (MODULE 13)
// ═══════════════════════════════════════════════════════════════════

export async function getAnnouncements(filters = {}) {
  const params = new URLSearchParams();
  if (filters.skip !== undefined) params.append('skip', filters.skip);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.category && filters.category !== 'ALL') params.append('category', filters.category.toLowerCase());
  
  return apiRequest(`${API_BASE}/announcements?${params}`);
}

export async function getAnnouncement(announcementId) {
  return apiRequest(`${API_BASE}/announcements/${announcementId}`);
}

export async function createAnnouncement(announcementData) {
  return apiRequest(`${API_BASE}/announcements`, {
    method: 'POST',
    body: JSON.stringify(announcementData)
  });
}

export async function updateAnnouncement(announcementId, updates) {
  return apiRequest(`${API_BASE}/announcements/${announcementId}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
}

export async function deleteAnnouncement(announcementId) {
  return apiRequest(`${API_BASE}/announcements/${announcementId}`, {
    method: 'DELETE'
  });
}

export async function markAnnouncementAsRead(announcementId) {
  return apiRequest(`${API_BASE}/announcements/${announcementId}/read`, {
    method: 'POST'
  });
}

export async function getUnreadAnnouncementsCount() {
  return apiRequest(`${API_BASE}/announcements/unread/count`);
}

// ==========================================
// MODULE 07: ENROLLMENT SYSTEM
// ==========================================
export async function openRegistration(windowData) {
  return apiRequest(`${API_BASE}/enrollment/registration/open`, {
    method: 'POST',
    body: JSON.stringify(windowData)
  });
}

export async function closeRegistration(term) {
  return apiRequest(`${API_BASE}/enrollment/registration/close?term=${term}`, {
    method: 'POST'
  });
}

export async function getRegistrationStatus(term) {
  return apiRequest(`${API_BASE}/enrollment/registration/status?term=${term}`);
}

export async function getEnrollmentAvailableCourses(term) {
  return apiRequest(`${API_BASE}/enrollment/available-courses?term=${term}`);
}

export async function registerForCourse(courseId, term) {
  return apiRequest(`${API_BASE}/enrollment/register?term=${term}`, {
    method: 'POST',
    body: JSON.stringify({ course_id: courseId })
  });
}

export async function dropCourse(enrollmentId, term) {
  return apiRequest(`${API_BASE}/enrollment/${enrollmentId}?term=${term}`, {
    method: 'DELETE'
  });
}

export async function getMyEnrollments(term) {
  return apiRequest(`${API_BASE}/enrollment/my-enrollments?term=${term}`);
}

export async function getCourseEnrollments(courseId) {
  return apiRequest(`${API_BASE}/enrollment/course/${courseId}/students`);
}

export async function forceEnrollStudent(studentId, courseId, reason, term) {
  return apiRequest(`${API_BASE}/enrollment/admin/force-enroll?term=${term}`, {
    method: 'POST',
    body: JSON.stringify({ student_id: studentId, course_id: courseId, reason })
  });
}

export async function removeStudentEnrollment(enrollmentId, reason) {
  return apiRequest(`${API_BASE}/enrollment/admin/remove`, {
    method: 'DELETE',
    body: JSON.stringify({ enrollment_id: enrollmentId, reason })
  });
}

// ==========================================
// MODULE 08: ATTENDANCE MANAGEMENT
// ==========================================
export async function createAttendanceSession(sessionData, term) {
  return apiRequest(`${API_BASE}/attendance/session?term=${term}`, {
    method: 'POST',
    body: JSON.stringify(sessionData)
  });
}

export async function getCourseSessions(courseId, dateFrom = null, dateTo = null) {
  let url = `${API_BASE}/attendance/course/${courseId}/sessions`;
  const params = [];
  if (dateFrom) params.push(`date_from=${dateFrom}`);
  if (dateTo) params.push(`date_to=${dateTo}`);
  if (params.length > 0) url += `?${params.join('&')}`;
  return apiRequest(url);
}

export async function getSessionDetails(sessionId) {
  return apiRequest(`${API_BASE}/attendance/session/${sessionId}`);
}

export async function markAttendance(sessionId, attendanceList) {
  return apiRequest(`${API_BASE}/attendance/session/${sessionId}/mark`, {
    method: 'POST',
    body: JSON.stringify({ attendance: attendanceList })
  });
}

export async function markAllAttendance(sessionId, status) {
  return apiRequest(`${API_BASE}/attendance/session/${sessionId}/mark-all`, {
    method: 'POST',
    body: JSON.stringify({ status })
  });
}

export async function getMyAttendance(courseId) {
  return apiRequest(`${API_BASE}/attendance/my-attendance?course_id=${courseId}`);
}

export async function getMyAttendanceSummary(term) {
  return apiRequest(`${API_BASE}/attendance/my-attendance/summary?term=${term}`);
}

export async function getCourseAttendanceReport(courseId) {
  return apiRequest(`${API_BASE}/attendance/course/${courseId}/report`);
}

export async function lockAttendance(courseId, term) {
  return apiRequest(`${API_BASE}/attendance/admin/lock`, {
    method: 'POST',
    body: JSON.stringify({ course_id: courseId, term })
  });
}

export async function unlockAttendance(courseId, reason) {
  return apiRequest(`${API_BASE}/attendance/admin/unlock`, {
    method: 'POST',
    body: JSON.stringify({ course_id: courseId, reason })
  });
}

// ═══════════════════════════════════════════════════════════════════
// ASSIGNMENTS & QUIZZES (MODULE 09)
// ═══════════════════════════════════════════════════════════════════

export async function createAssignment(assignmentData, term) {
  return apiRequest(`${API_BASE}/assignments?term=${term}`, {
    method: 'POST',
    body: JSON.stringify(assignmentData)
  });
}

export async function getCourseAssignments(courseId, type = null) {
  const query = type ? `?assignment_type=${type}` : '';
  return apiRequest(`${API_BASE}/assignments/course/${courseId}${query}`);
}

export async function getAssignmentDetails(assignmentId) {
  return apiRequest(`${API_BASE}/assignments/${assignmentId}`);
}

export async function updateAssignment(assignmentId, updateData) {
  return apiRequest(`${API_BASE}/assignments/${assignmentId}`, {
    method: 'PUT',
    body: JSON.stringify(updateData)
  });
}

export async function deleteAssignment(assignmentId) {
  return apiRequest(`${API_BASE}/assignments/${assignmentId}`, {
    method: 'DELETE'
  });
}

export async function getStudentAssignments(courseId = null) {
  const query = courseId ? `?course_id=${courseId}` : '';
  return apiRequest(`${API_BASE}/assignments/my-assignments/list${query}`);
}

export async function uploadPdf(file) {
  const formData = new FormData();
  formData.append('file', file);
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE}/upload/pdf`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Upload failed');
  }
  return response.json();
}

export async function submitAssignment(assignmentId, submissionData) {
  return apiRequest(`${API_BASE}/assignments/${assignmentId}/submit`, {
    method: 'POST',
    body: JSON.stringify(submissionData)
  });
}

export async function getAssignmentSubmissions(assignmentId) {
  return apiRequest(`${API_BASE}/assignments/${assignmentId}/submissions`);
}

export async function getSubmissionDetails(submissionId) {
  return apiRequest(`${API_BASE}/assignments/submissions/${submissionId}`);
}

export async function gradeSubmission(submissionId, marksObtained, feedback) {
  return apiRequest(`${API_BASE}/assignments/submissions/${submissionId}/grade`, {
    method: 'PUT',
    body: JSON.stringify({ marks_obtained: marksObtained, feedback })
  });
}

export async function aiGradeSubmission(submissionId) {
  return apiRequest(`${API_BASE}/assignments/submissions/${submissionId}/ai-grade`, {
    method: 'POST'
  });
}

export async function bulkGradeSubmissions(assignmentId, gradesList) {
  return apiRequest(`${API_BASE}/assignments/${assignmentId}/bulk-grade`, {
    method: 'POST',
    body: JSON.stringify({ grades: gradesList })
  });
}

export async function aiGenerateAssignment(requestData, term) {
  return apiRequest(`${API_BASE}/assignments/ai-generate?term=${term}`, {
    method: 'POST',
    body: JSON.stringify(requestData)
  });
}

export async function updateAssignmentQuestion(assignmentId, questionId, question) {
  return apiRequest(`${API_BASE}/assignments/${assignmentId}/questions/${questionId}`, {
    method: 'PUT',
    body: JSON.stringify({ question })
  });
}

export async function undoAssignmentQuestion(assignmentId, questionId) {
  return apiRequest(`${API_BASE}/assignments/${assignmentId}/questions/${questionId}/undo`, {
    method: 'POST'
  });
}






// ═══════════════════════════════════════════════════════════════════
// LECTURES
// ═══════════════════════════════════════════════════════════════════

export async function uploadLecture(file, meta, onProgress) {
  const token = localStorage.getItem('token');

  // Step 1: get signed upload params from backend
  const signRes = await fetch(
    `${API_BASE}/lectures/sign?filename=${encodeURIComponent(file.name)}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  if (!signRes.ok) {
    const err = await signRes.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to get upload signature');
  }
  const { upload_url, api_key, timestamp, folder, signature } = await signRes.json();

  // Step 2: upload directly from browser to Cloudinary
  const fd = new FormData();
  fd.append('file', file, file.name);
  fd.append('api_key', api_key);
  fd.append('timestamp', timestamp);
  fd.append('folder', folder);
  fd.append('signature', signature);

  // Use fetch — more reliable CORS handling than XHR for Cloudinary
  // Progress tracking not available with fetch but upload works for all sizes
  if (onProgress) onProgress(10); // indicate upload started

  const cloudRes = await fetch(upload_url, { method: 'POST', body: fd });
  if (!cloudRes.ok) {
    const err = await cloudRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Upload failed (${cloudRes.status})`);
  }
  if (onProgress) onProgress(100);
  const cloudData = await cloudRes.json();

  // Step 3: confirm with backend to save the lecture record
  return apiRequest(`${API_BASE}/lectures`, {
    method: 'POST',
    body: JSON.stringify({
      ...meta,
      file_url: cloudData.secure_url,
      file_name: file.name,
    }),
  });
}

export async function getCourseLectures(courseId) {
  return apiRequest(`${API_BASE}/lectures/course/${courseId}`);
}

export async function deleteLecture(lectureId) {
  return apiRequest(`${API_BASE}/lectures/${lectureId}`, { method: 'DELETE' });
}

export async function getMyLectures() {
  return apiRequest(`${API_BASE}/lectures/my-lectures`);
}


// ── Department Fee Structures ──────────────────────────────────────
export async function getFeeStructures() {
  return apiRequest(`${API_BASE}/fees/structure`);
}

export async function saveFeeStructure(data) {
  return apiRequest(`${API_BASE}/fees/structure`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteFeeStructure(department) {
  return apiRequest(`${API_BASE}/fees/structure/${encodeURIComponent(department)}`, {
    method: 'DELETE',
  });
}

export async function getMyFeeVoucher() {
  return apiRequest(`${API_BASE}/fees/my-voucher`);
}

export async function getMyCgpa() {
  return apiRequest(`${API_BASE}/grades/cgpa`);
}

// ── Manage Results (Teacher / Exam Dept / Student) ────────────────
export async function getManageResults(courseId, term) {
  const params = new URLSearchParams({ term });
  return apiRequest(`${API_BASE}/grades/manage-results/course/${courseId}?${params}`);
}

export async function updateManageResult(data) {
  return apiRequest(`${API_BASE}/grades/manage-results/student`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function submitResultsToExamDept(courseId, term) {
  const params = new URLSearchParams({ course_id: courseId, term });
  return apiRequest(`${API_BASE}/grades/manage-results/submit?${params}`, { method: 'POST' });
}

export async function getExamDeptPendingResults(term = null) {
  const params = new URLSearchParams();
  if (term) params.append('term', term);
  const qs = params.toString();
  return apiRequest(`${API_BASE}/grades/exam-dept/pending${qs ? '?' + qs : ''}`);
}

export async function examDeptUpdateResult(data) {
  return apiRequest(`${API_BASE}/grades/exam-dept/student`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function examDeptPublishResults(courseId, term) {
  const params = new URLSearchParams({ course_id: courseId, term });
  return apiRequest(`${API_BASE}/grades/exam-dept/publish?${params}`, { method: 'POST' });
}

export async function getMyResults(term) {
  const params = new URLSearchParams({ term });
  return apiRequest(`${API_BASE}/grades/my-results?${params}`);
}

export async function getMyTranscript(term) {
  const params = new URLSearchParams({ term });
  return apiRequest(`${API_BASE}/grades/my-results/transcript?${params}`);
}

export async function submitPayment(paymentData) {
  return apiRequest(`${API_BASE}/fees/payment/submit`, {
    method: 'POST',
    body: JSON.stringify(paymentData)
  });
}

export async function getPendingPayments() {
  return apiRequest(`${API_BASE}/fees/admin/pending`);
}

export async function verifyPayment(paymentId, notes = '') {
  return apiRequest(`${API_BASE}/fees/admin/verify`, {
    method: 'POST',
    body: JSON.stringify({ payment_id: paymentId, verified: true, notes })
  });
}

export async function rejectPayment(paymentId, reason) {
  return apiRequest(`${API_BASE}/fees/admin/reject`, {
    method: 'POST',
    body: JSON.stringify({ payment_id: paymentId, reason })
  });
}

export async function getFeeDashboardStats() {
  return apiRequest(`${API_BASE}/fees/admin/dashboard-stats`);
}

export async function downloadFeeStatement(type, year, month = null) {
  const token = localStorage.getItem('token');
  const params = new URLSearchParams({ type, year });
  if (month) params.append('month', month);
  
  const response = await fetch(`${API_BASE}/fees/admin/statement?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to download statement');
  }
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fee_statement_${type}_${year}${month ? `_${month}` : ''}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}


// ═══════════════════════════════════════════════════════════════════
// COURSES (helper for timetable)
// ═══════════════════════════════════════════════════════════════════

export async function getCoursesBySemester(semester) {
  const params = new URLSearchParams({ semester, is_active: true, limit: 200 });
  return apiRequest(`${API_BASE}/courses/?${params.toString()}`);
}

// ═══════════════════════════════════════════════════════════════════
// CLASS TIMETABLE
// ═══════════════════════════════════════════════════════════════════

export async function adminGetTimetables(department = null, semester = null) {
  const params = new URLSearchParams();
  if (department) params.append('department', department);
  if (semester) params.append('semester', semester);
  const qs = params.toString();
  return apiRequest(`${API_BASE}/class-timetable/admin${qs ? '?' + qs : ''}`);
}

export async function adminCreateTimetable(data) {
  return apiRequest(`${API_BASE}/class-timetable/admin`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function adminUpdateTimetable(ttId, data) {
  return apiRequest(`${API_BASE}/class-timetable/admin/${ttId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function adminDeleteTimetable(ttId) {
  return apiRequest(`${API_BASE}/class-timetable/admin/${ttId}`, {
    method: 'DELETE'
  });
}

export async function adminGetTeachersList() {
  return apiRequest(`${API_BASE}/class-timetable/admin/teachers/list`);
}

export async function getMyClassTimetable() {
  return apiRequest(`${API_BASE}/class-timetable/student/my`);
}

export async function getMyTeachingSchedule() {
  return apiRequest(`${API_BASE}/class-timetable/teacher/my`);
}

// ═══════════════════════════════════════════════════════════════════
// EXAM SCHEDULE / ADMIT CARD
// ═══════════════════════════════════════════════════════════════════

export async function adminGetExamSchedules(department = null, semester = null) {
  const params = new URLSearchParams();
  if (department) params.append('department', department);
  if (semester)   params.append('semester', semester);
  const qs = params.toString();
  return apiRequest(`${API_BASE}/exam-schedule/admin${qs ? '?' + qs : ''}`);
}

export async function adminCreateExamSchedule(data) {
  return apiRequest(`${API_BASE}/exam-schedule/admin`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function adminUpdateExamSchedule(scheduleId, data) {
  return apiRequest(`${API_BASE}/exam-schedule/admin/${scheduleId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function adminDeleteExamSchedule(scheduleId) {
  return apiRequest(`${API_BASE}/exam-schedule/admin/${scheduleId}`, {
    method: 'DELETE',
  });
}

export async function adminGetExamTeachersList() {
  return apiRequest(`${API_BASE}/exam-schedule/admin/teachers/list`);
}

export async function getMyAdmitCard() {
  return apiRequest(`${API_BASE}/exam-schedule/student/my-admit-card`);
}

export async function getMyInvigilationDuties() {
  return apiRequest(`${API_BASE}/exam-schedule/teacher/my-invigilation`);
}
