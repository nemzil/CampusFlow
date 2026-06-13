'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  listUsers, 
  registerStudent, 
  registerTeacher, 
  registerAdmin,
  deleteUser,
  activateUser,
  deactivateUser,
  adminEditUser,
  bulkRegisterUsers
} from '@/lib/api';
import { 
  Users, UserPlus, Upload, ShieldCheck, Mail, Phone, 
  MapPin, Calendar, Briefcase, Hash, CreditCard, Layers,
  Trash2, Edit2, CheckCircle2, XCircle, Search, Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { canAccessFullAdminConsole } from '@/lib/adminAccess';

export default function UsersManagementPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showSuccess, showError } = useToast();
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [registerType, setRegisterType] = useState('student');
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/login');
    } else if (!authLoading && user && !canAccessFullAdminConsole(user)) {
      router.push('/admin');
    } else if (!authLoading && user) {
      fetchUsers();
    }
  }, [user, authLoading, router, filter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const role = filter === 'ALL' ? null : filter;
      const data = await listUsers(role);
      setUsers(data);
    } catch (error) {
      showError(error.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (username) => {
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) return;
    try {
      await deleteUser(username);
      showSuccess('User deleted successfully');
      fetchUsers();
    } catch (error) {
      showError(error.message || 'Failed to delete user');
    }
  };

  const handleToggleActive = async (username, isActive) => {
    try {
      if (isActive) {
        await deactivateUser(username);
        showSuccess('User deactivated');
      } else {
        await activateUser(username);
        showSuccess('User activated');
      }
      fetchUsers();
    } catch (error) {
      showError(error.message || 'Failed to update user status');
    }
  };

  const openRegisterModal = (type) => {
    setRegisterType(type);
    setShowRegisterModal(true);
  };

  const openEditModal = (u) => {
    setEditingUser(u);
    setShowEditModal(true);
  };

  const filteredUsers = users.filter(u => 
    u.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading || loading && users.length === 0) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
          <p className="text-slate-400 font-medium">Loading users...</p>
        </div>
      </div>
    );
  }

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN': return 'badge-rose';
      case 'TEACHER': return 'badge-cyan';
      case 'STUDENT': return 'badge-violet';
      default: return 'badge-indigo';
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <Badge variant="outline" className="badge-violet mb-2">Directory</Badge>
          <h1 className="text-3xl font-bold font-heading text-white tracking-tight">User Management</h1>
          <p className="text-slate-400 mt-1">Manage students, faculty, and administrative staff.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => setShowBulkUploadModal(true)} variant="outline" className="border-white/10 text-slate-300 hover:text-white hover:bg-white/10">
            <Upload className="w-4 h-4 mr-2" /> Bulk Upload
          </Button>
          <Button onClick={() => openRegisterModal('student')} className="bg-violet-600 hover:bg-violet-500 text-white">
            <UserPlus className="w-4 h-4 mr-2" /> Add Student
          </Button>
          <Button onClick={() => openRegisterModal('teacher')} className="bg-cyan-600 hover:bg-cyan-500 text-white">
            <UserPlus className="w-4 h-4 mr-2" /> Add Teacher
          </Button>
          {user?.admin_level === 'SUPER_ADMIN' && (
            <Button onClick={() => openRegisterModal('admin')} className="bg-rose-600 hover:bg-rose-500 text-white">
              <UserPlus className="w-4 h-4 mr-2" /> Add Admin
            </Button>
          )}
        </div>
      </div>

      {/* Filters & Search */}
      <Card className="glass-card border-white/5 bg-black/20">
        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative inline-flex p-1 bg-white/5 border border-white/10 rounded-lg">
            {['ALL', 'STUDENT', 'TEACHER', 'ADMIN'].map((f) => (
              <button
                key={f}
                className={`relative z-10 px-4 py-2 text-xs font-semibold tracking-wider transition-colors ${
                  filter === f ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
                onClick={() => setFilter(f)}
              >
                {f === 'ALL' ? 'ALL USERS' : f}
                {filter === f && (
                  <motion.div
                    layoutId="userTabHighlight"
                    className="absolute inset-0 bg-violet-600 rounded-md"
                    style={{ zIndex: -1 }}
                    transition={{
                      type: 'spring',
                      stiffness: 400,
                      damping: 35,
                      mass: 0.8
                    }}
                  />
                )}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..." 
              className="pl-9 bg-background/50 border-white/10 text-white"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users Grid */}
      {filteredUsers.length === 0 ? (
        <Card className="glass-card border-white/5 bg-transparent">
          <CardContent className="p-16 flex flex-col items-center justify-center text-center">
            <Users className="w-16 h-16 text-slate-600 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No users found</h3>
            <p className="text-slate-400">Try adjusting your filters or search query.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredUsers.map((u) => (
              <motion.div
                key={u.username}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                layout
              >
                <Card className={`glass-card border-white/5 h-full flex flex-col relative overflow-hidden transition-all duration-300 ${!u.is_active ? 'opacity-75 grayscale-[0.5]' : 'hover:border-violet-500/30'}`}>
                  {/* Status Indicator */}
                  <div className={`absolute top-0 left-0 w-full h-1 ${u.is_active ? 'bg-emerald-500/50' : 'bg-rose-500/50'}`} />
                  
                  <CardContent className="p-5 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12 border-2 border-white/10">
                          <AvatarFallback className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white font-heading font-semibold">
                            {u.first_name?.[0]}{u.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-bold text-white font-heading leading-tight flex items-center gap-2">
                            {u.first_name} {u.last_name}
                            {!u.is_active && <Badge variant="outline" className="badge-rose px-1 text-[9px]">Inactive</Badge>}
                          </h3>
                          <p className="text-xs text-slate-400 font-mono">@{u.username}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={`${getRoleBadge(u.role)} uppercase text-[10px]`}>{u.role}</Badge>
                    </div>

                    <div className="space-y-2 mb-6 flex-1">
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <Mail className="w-4 h-4 text-slate-500" />
                        <span className="truncate">{u.email}</span>
                      </div>
                      {u.registration_no && (
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                          <Hash className="w-4 h-4 text-slate-500" />
                          <span>{u.registration_no}</span>
                        </div>
                      )}
                      {u.employee_id && (
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                          <Briefcase className="w-4 h-4 text-slate-500" />
                          <span>{u.employee_id}</span>
                        </div>
                      )}
                      {u.department && (
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                          <Layers className="w-4 h-4 text-slate-500" />
                          <span className="truncate">{u.department}</span>
                        </div>
                      )}
                      {u.role === 'ADMIN' && (
                        <div className="flex items-center gap-2 text-sm text-slate-300">
                          <ShieldCheck className="w-4 h-4 text-slate-500" />
                          <span className="truncate">Level: {u.admin_level || 'ADMIN'}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 mt-auto pt-4 border-t border-white/5">
                      <Button variant="secondary" size="sm" onClick={() => openEditModal(u)} className="flex-1 bg-white/5 hover:bg-white/10 text-white">
                        <Edit2 className="w-4 h-4 mr-1.5" /> Edit
                      </Button>
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => handleToggleActive(u.username, u.is_active)}
                        disabled={u.username === user?.username}
                        className={`flex-1 text-white ${u.is_active ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400' : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'}`}
                      >
                        {u.is_active ? <XCircle className="w-4 h-4 mr-1.5" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />}
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button 
                        variant="secondary" 
                        size="sm"
                        onClick={() => handleDelete(u.username)}
                        disabled={u.username === user?.username}
                        className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-3"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modals */}
      {showRegisterModal && (
        <RegisterModal
          type={registerType}
          onClose={() => setShowRegisterModal(false)}
          onSuccess={() => {
            setShowRegisterModal(false);
            fetchUsers();
          }}
        />
      )}
      
      {showEditModal && editingUser && (
        <EditModal
          user={editingUser}
          onClose={() => {
            setShowEditModal(false);
            setEditingUser(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setEditingUser(null);
            fetchUsers();
          }}
        />
      )}
      
      {showBulkUploadModal && (
        <BulkUploadModal
          onClose={() => setShowBulkUploadModal(false)}
          onSuccess={() => {
            setShowBulkUploadModal(false);
            fetchUsers();
          }}
        />
      )}
    </div>
  );
}

// ---------------- Register Modal ----------------
function RegisterModal({ type, onClose, onSuccess }) {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let dataToSend = { ...formData };
      if (dataToSend.email) dataToSend.email = dataToSend.email.toLowerCase();
      if (type === 'student' && dataToSend.current_semester) {
        dataToSend.current_semester = parseInt(dataToSend.current_semester);
      }
      
      if (type === 'student') await registerStudent(dataToSend);
      else if (type === 'teacher') await registerTeacher(dataToSend);
      else if (type === 'admin') await registerAdmin(dataToSend);
      
      showSuccess(`${type.charAt(0).toUpperCase() + type.slice(1)} registered successfully!`);
      onSuccess();
    } catch (error) {
      showError(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  return (
    <AnimatePresence mode="wait">
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-[80vw] xl:max-w-[75vw] glass border-white/10 text-white shadow-2xl p-0 overflow-hidden rounded-xl max-h-[90vh] flex flex-col">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ 
              duration: 0.25, 
              ease: [0.16, 1, 0.3, 1]
            }}
            className="flex flex-col h-full"
          >
            <div className="h-1 w-full bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-500 shrink-0" />
            <DialogHeader className="p-3 pb-2.5 border-b border-white/5 shrink-0">
              <DialogTitle className="text-base font-bold font-heading">Register {type.charAt(0).toUpperCase() + type.slice(1)}</DialogTitle>
              <DialogDescription className="text-[11px] text-slate-400">Fill in the details to create a new {type} account.</DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="flex-1 p-3">
              <form id="register-form" onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  <FormGroupCompact label="First Name *" name="first_name" required onChange={handleChange} />
                  <FormGroupCompact label="Last Name *" name="last_name" required onChange={handleChange} />
                  <FormGroupCompact label="Username *" name="username" required onChange={handleChange} placeholder={type === 'student' ? '2024F-BSE-001' : 'johndoe'} />
                  <FormGroupCompact label="Email *" name="email" type="email" required onChange={handleChange} placeholder="user@ssuet.edu.pk" />
                  <FormGroupCompact label="Password *" name="password" type="password" required minLength={6} onChange={handleChange} />
                  
                  {type === 'student' && (
                    <>
                      <FormGroupCompact label="Registration No *" name="registration_no" required onChange={handleChange} placeholder="2024F-BSE-001" />
                      <FormGroupCompact label="Date of Birth *" name="date_of_birth" type="date" required onChange={handleChange} max={new Date().toISOString().split('T')[0]} />
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-300 ml-1 uppercase tracking-wider">Gender *</label>
                        <Select required onValueChange={(val) => setFormData({ ...formData, gender: val })}>
                          <SelectTrigger className="h-8 text-xs bg-background/50 border-white/10">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <FormGroupCompact label="NIC *" name="nic" required onChange={handleChange} placeholder="42101-1234567-1" />
                      <FormGroupCompact label="Department *" name="department" required onChange={handleChange} placeholder="Computer Science" />
                      <FormGroupCompact label="Program *" name="program" required onChange={handleChange} placeholder="BSE" />
                      <FormGroupCompact label="Batch *" name="batch" required onChange={handleChange} placeholder="2024F" />
                      <FormGroupCompact label="Semester *" name="current_semester" type="number" required onChange={handleChange} min="1" max="8" />
                      <FormGroupCompact label="Cell No *" name="cell_no" required onChange={handleChange} placeholder="0300-1234567" />
                      <FormGroupCompact label="Address" name="address" onChange={handleChange} />
                      <FormGroupCompact label="Guardian Name" name="guardian_name" onChange={handleChange} />
                      <FormGroupCompact label="Guardian CNIC" name="guardian_cnic" onChange={handleChange} />
                      <FormGroupCompact label="Guardian Contact" name="guardian_contact" onChange={handleChange} />
                    </>
                  )}

                  {type === 'teacher' && (
                    <>
                      <FormGroupCompact label="Cell No *" name="cell_no" required onChange={handleChange} />
                      <FormGroupCompact label="Employee ID *" name="employee_id" required onChange={handleChange} />
                      <FormGroupCompact label="Department *" name="department" required onChange={handleChange} />
                      <FormGroupCompact label="Designation *" name="designation" required onChange={handleChange} />
                      <FormGroupCompact label="Qualification *" name="qualification" required onChange={handleChange} />
                    </>
                  )}

                  {type === 'admin' && (
                    <>
                      <FormGroupCompact label="Cell No *" name="cell_no" required onChange={handleChange} />
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-300 ml-1 uppercase tracking-wider">Admin Level *</label>
                        <Select required onValueChange={(val) => setFormData({ ...formData, admin_level: val })}>
                          <SelectTrigger className="h-8 text-xs bg-background/50 border-white/10">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                            <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                            <SelectItem value="FEE_MANAGEMENT_ADMIN">Fee Management Admin</SelectItem>
                            <SelectItem value="COURSE_MANAGEMENT_ADMIN">Course Management Admin</SelectItem>
                            <SelectItem value="EXAM_MANAGEMENT_ADMIN">Exam Management Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </div>
              </form>
            </ScrollArea>
            
            <div className="p-2.5 border-t border-white/5 bg-black/20 flex justify-end gap-2 shrink-0">
              <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={loading} className="text-slate-300 hover:text-white hover:bg-white/5 h-7 text-[11px]">
                Cancel
              </Button>
              <Button type="submit" form="register-form" size="sm" disabled={loading} className="bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_15px_rgba(124,58,237,0.4)] h-7 text-[11px]">
                {loading ? <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Registering...</> : 'Register User'}
              </Button>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
    </AnimatePresence>
  );
}

// ---------------- Edit Modal ----------------
function EditModal({ user, onClose, onSuccess }) {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: user.first_name || '', last_name: user.last_name || '', email: user.email || '', cell_no: user.cell_no || '', address: user.address || '',
    date_of_birth: user.date_of_birth ? user.date_of_birth.split('T')[0] : '', nic: user.nic || '', gender: user.gender || '', department: user.department || '', program: user.program || '', batch: user.batch || '', current_semester: user.current_semester || '', guardian_name: user.guardian_name || '', guardian_cnic: user.guardian_cnic || '', guardian_contact: user.guardian_contact || '',
    employee_id: user.employee_id || '', designation: user.designation || '', qualification: user.qualification || '', specialization: user.specialization || '', office_location: user.office_location || '',
    admin_level: user.admin_level || '',
    new_username: '', new_password: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updates = {};
      Object.keys(formData).forEach(key => {
        if (key === 'new_username' || key === 'new_password') {
          if (formData[key] !== '') updates[key] = formData[key];
        } else if (formData[key] !== '' && formData[key] !== user[key]) {
          updates[key] = formData[key];
        }
      });
      await adminEditUser(user.username, updates);
      showSuccess('User updated successfully!');
      onSuccess();
    } catch (error) {
      showError(error.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  return (
    <AnimatePresence mode="wait">
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-[80vw] xl:max-w-[75vw] glass border-white/10 text-white shadow-2xl p-0 overflow-hidden rounded-xl max-h-[85vh] flex flex-col">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ 
              duration: 0.25, 
              ease: [0.16, 1, 0.3, 1]
            }}
            className="flex flex-col h-full"
          >
            <div className="h-1 w-full bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-500 shrink-0" />
            <DialogHeader className="p-3 pb-2.5 border-b border-white/5 shrink-0">
              <DialogTitle className="text-base font-bold font-heading">Edit User: {user.username}</DialogTitle>
              <DialogDescription className="text-[11px] text-slate-400">Update user information below.</DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="flex-1 p-3">
              <form id="edit-form" onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  <FormGroupCompact label="First Name" name="first_name" value={formData.first_name} onChange={handleChange} />
                  <FormGroupCompact label="Last Name" name="last_name" value={formData.last_name} onChange={handleChange} />
                  <FormGroupCompact label="Email" name="email" value={formData.email} onChange={handleChange} />
                  <FormGroupCompact label="Cell No" name="cell_no" value={formData.cell_no} onChange={handleChange} />
                  <div className="md:col-span-2">
                    <FormGroupCompact label="Address" name="address" value={formData.address} onChange={handleChange} />
                  </div>

                  {/* ── Login Credentials ── */}
                  <div className="md:col-span-4 pt-1 pb-0.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400">Login Credentials</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Leave blank to keep current values.</p>
                  </div>
                  <FormGroupCompact label="New Username" name="new_username" value={formData.new_username} onChange={handleChange} placeholder={`Current: ${user.username}`} />
                  <FormGroupCompact label="New Password" name="new_password" type="password" value={formData.new_password} onChange={handleChange} placeholder="Min 6 characters" />
                  
                  {user.role === 'STUDENT' && (
                    <>
                      <FormGroupCompact label="Date of Birth" name="date_of_birth" type="date" value={formData.date_of_birth} onChange={handleChange} />
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-slate-300 ml-1 uppercase tracking-wider">Gender</label>
                        <Select value={formData.gender} onValueChange={(val) => setFormData({ ...formData, gender: val })}>
                          <SelectTrigger className="h-8 text-xs bg-background/50 border-white/10">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <FormGroupCompact label="NIC" name="nic" value={formData.nic} onChange={handleChange} />
                      <FormGroupCompact label="Department" name="department" value={formData.department} onChange={handleChange} />
                      <FormGroupCompact label="Program" name="program" value={formData.program} onChange={handleChange} />
                      <FormGroupCompact label="Batch" name="batch" value={formData.batch} onChange={handleChange} />
                      <FormGroupCompact label="Current Semester" name="current_semester" type="number" value={formData.current_semester} onChange={handleChange} min="1" max="8" />
                      <FormGroupCompact label="Guardian Name" name="guardian_name" value={formData.guardian_name} onChange={handleChange} />
                      <FormGroupCompact label="Guardian CNIC" name="guardian_cnic" value={formData.guardian_cnic} onChange={handleChange} />
                      <FormGroupCompact label="Guardian Contact" name="guardian_contact" value={formData.guardian_contact} onChange={handleChange} />
                    </>
                  )}

                  {user.role === 'TEACHER' && (
                    <>
                      <FormGroupCompact label="Employee ID" name="employee_id" value={formData.employee_id} onChange={handleChange} />
                      <FormGroupCompact label="Department" name="department" value={formData.department} onChange={handleChange} />
                      <FormGroupCompact label="Designation" name="designation" value={formData.designation} onChange={handleChange} />
                      <FormGroupCompact label="Qualification" name="qualification" value={formData.qualification} onChange={handleChange} />
                      <FormGroupCompact label="Specialization" name="specialization" value={formData.specialization} onChange={handleChange} />
                      <FormGroupCompact label="Office Location" name="office_location" value={formData.office_location} onChange={handleChange} />
                    </>
                  )}

                  {user.role === 'ADMIN' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-300 ml-1 uppercase tracking-wider">Admin Level</label>
                      <Select value={formData.admin_level} onValueChange={(val) => setFormData({ ...formData, admin_level: val })}>
                        <SelectTrigger className="h-8 text-xs bg-background/50 border-white/10">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                          <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                          <SelectItem value="FEE_MANAGEMENT_ADMIN">Fee Management Admin</SelectItem>
                          <SelectItem value="COURSE_MANAGEMENT_ADMIN">Course Management Admin</SelectItem>
                          <SelectItem value="EXAM_MANAGEMENT_ADMIN">Exam Management Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </form>
            </ScrollArea>
            
            <div className="p-2.5 border-t border-white/5 bg-black/20 flex justify-end gap-2 shrink-0">
              <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={loading} className="text-slate-300 hover:text-white hover:bg-white/5 h-7 text-[11px]">
                Cancel
              </Button>
              <Button type="submit" form="edit-form" size="sm" disabled={loading} className="bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_15px_rgba(124,58,237,0.4)] h-7 text-[11px]">
                {loading ? <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Updating...</> : 'Update User'}
              </Button>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>
    </AnimatePresence>
  );
}

// ---------------- Bulk Upload Modal ----------------
function BulkUploadModal({ onClose, onSuccess }) {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState('student');
  const [file, setFile] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { showError('Please select a CSV file'); return; }
    setLoading(true);
    try {
      const result = await bulkRegisterUsers(role, file);
      showSuccess(`Uploaded: ${result.success_count} created, ${result.error_count} errors`);
      onSuccess();
    } catch (error) {
      showError(error.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = (type) => {
    let csv = '';
    if (type === 'student') {
      csv = 'username,password,email,first_name,last_name,registration_no,date_of_birth,nic,gender,department,program,batch,current_semester,cell_no,address,guardian_name,guardian_cnic,guardian_contact\n2024F-BSE-001,student123,user@ssuet.edu.pk,Ahmed,Ali,2024F-BSE-001,2005-03-15,42101-1234567-1,Male,CS,BSE,2024F,1,0300-1234567,Karachi,Ali Ahmed,42101-7654321-1,0300-7654321\n';
    } else if (type === 'teacher') {
      csv = 'username,password,email,first_name,last_name,employee_id,department,designation,qualification,specialization,office_location,cell_no,address\nahmedkhan,teacher123,akhan@ssuet.edu.pk,Ahmed,Khan,EMP-001,CS,Lecturer,PhD,ML,Room 301,0300-1234567,Karachi\n';
    } else if (type === 'admin') {
      csv = 'username,password,email,first_name,last_name,admin_level,cell_no\nadmin2,admin123,a2@ssuet.edu.pk,Sarah,Ahmed,COURSE_MANAGEMENT_ADMIN,0300-1234567\n';
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${type}_template.csv`;
    a.click(); window.URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence mode="wait">
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-xl glass border-white/10 text-white shadow-2xl p-0 overflow-hidden rounded-xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ 
              duration: 0.25, 
              ease: [0.16, 1, 0.3, 1]
            }}
            className="flex flex-col"
          >
            <div className="h-1 w-full bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-500 shrink-0" />
            <DialogHeader className="p-3 pb-2.5 border-b border-white/5">
              <DialogTitle className="text-base font-bold font-heading">Bulk Upload Users</DialogTitle>
              <DialogDescription className="text-[11px] text-slate-400">Upload multiple users via CSV file.</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="p-3 space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-300 ml-1 uppercase tracking-wider">User Role</label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="h-8 text-xs bg-background/50 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="p-2.5 bg-white/5 border border-white/10 rounded-lg space-y-2">
                <p className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider">Download Templates:</p>
                <div className="flex flex-wrap gap-1.5">
                  <Button type="button" variant="outline" size="sm" onClick={() => downloadTemplate('student')} className="border-white/10 text-[10px] h-6 px-2">
                    Student CSV
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => downloadTemplate('teacher')} className="border-white/10 text-[10px] h-6 px-2">
                    Teacher CSV
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => downloadTemplate('admin')} className="border-white/10 text-[10px] h-6 px-2">
                    Admin CSV
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-300 ml-1 uppercase tracking-wider">Select CSV File</label>
                <Input 
                  type="file" 
                  accept=".csv" 
                  onChange={(e) => setFile(e.target.files[0])} 
                  className="h-8 text-xs bg-background/50 border-white/10 text-white file:text-white file:text-[10px] file:mr-2" 
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={loading} className="text-slate-300 hover:text-white hover:bg-white/5 h-7 text-[11px]">
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={loading || !file} className="bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_15px_rgba(124,58,237,0.4)] h-7 text-[11px]">
                  {loading ? <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Uploading...</> : <><Upload className="w-3 h-3 mr-1" /> Upload</>}
                </Button>
              </div>
            </form>
          </motion.div>
        </DialogContent>
      </Dialog>
    </AnimatePresence>
  );
}

// ---------------- Helper Components ----------------
function FormGroup({ label, name, type = 'text', required, onChange, value, placeholder, pattern, minLength, min, max, hint }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-slate-300 ml-1">{label}</label>
      <Input
        type={type} name={name} required={required} onChange={onChange} value={value}
        placeholder={placeholder} pattern={pattern} minLength={minLength} min={min} max={max}
        className="bg-background/50 border-white/10 text-white focus-visible:ring-violet-500"
      />
      {hint && <p className="text-[10px] text-slate-500 ml-1">{hint}</p>}
    </div>
  );
}

function FormGroupCompact({ label, name, type = 'text', required, onChange, value, placeholder, pattern, minLength, min, max }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-semibold text-slate-300 ml-1 uppercase tracking-wider">{label}</label>
      <Input
        type={type} name={name} required={required} onChange={onChange} value={value}
        placeholder={placeholder} pattern={pattern} minLength={minLength} min={min} max={max}
        className="h-8 text-xs bg-background/50 border-white/10 text-white focus-visible:ring-violet-500"
      />
    </div>
  );
}
