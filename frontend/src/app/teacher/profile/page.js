'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import { getUserProfile, updateUserProfile } from '@/lib/api';
import PasswordChangeModal from '@/components/PasswordChangeModal';
import { User, Phone, MapPin, Briefcase, Building, GraduationCap, MapPinned, Lock, Camera, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export default function TeacherProfile() {
  const router = useRouter();
  const { user: authUser, loading: authLoading, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
  const [formData, setFormData] = useState({
    cell_no: '',
    address: '',
  });

  useEffect(() => {
    if (!authLoading && !authUser) {
      router.push('/teacher/login');
    } else if (!authLoading && authUser && authUser.role !== 'TEACHER') {
      router.push('/teacher/login');
    } else if (!authLoading && authUser) {
      fetchProfile();
    }
  }, [authUser, authLoading, router]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await getUserProfile(authUser.username);
      setProfile(data);
      setFormData({
        cell_no: data.cell_no || '',
        address: data.address || '',
      });
    } catch (err) {
      setError('Failed to load profile');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const updatedProfile = await updateUserProfile(authUser.username, formData);
      setProfile(updatedProfile);
      updateUser(updatedProfile);
      setSuccess('Profile updated successfully!');
      setEditing(false);
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setFormData({
      cell_no: profile.cell_no || '',
      address: profile.address || '',
    });
    setError('');
  };

  if (authLoading || loading || !profile) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center bg-slate-50/50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
          <p className="text-slate-400 font-medium animate-pulse">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="space-y-4"
      >
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 font-heading">
            My Profile
          </h1>
          <p className="text-slate-500 mt-1 text-sm font-medium">View and manage your professional information.</p>
        </div>

        {/* Alerts */}
        {success && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-2.5 text-sm font-medium shadow-sm">
            <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            {success}
          </motion.div>
        )}

        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2.5 text-sm font-medium shadow-sm">
            <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
            {error}
          </motion.div>
        )}

        {/* Hero Profile Card */}
        <Card className="bg-white border-slate-200 shadow-sm overflow-hidden border-t-4 border-t-emerald-500">
          <CardContent className="p-5 relative sm:flex sm:items-center sm:gap-5">
            <div className="relative group inline-block">
              <Avatar className="w-16 h-16 border-4 border-white shadow-md bg-slate-50">
                <AvatarImage src={profile.profile_picture_url} />
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-heading text-xl">
                  {profile.first_name?.[0]}{profile.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <button className="absolute bottom-0 right-0 p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg transition-transform hover:scale-110" title="Upload coming soon">
                <Camera className="w-3 h-3" />
              </button>
            </div>
            
            <div className="mt-3 sm:mt-0 flex-1">
              <h2 className="text-xl font-bold text-slate-900 font-heading tracking-tight">{profile.first_name} {profile.last_name}</h2>
              <p className="text-emerald-600 font-bold tracking-wide text-xs uppercase mt-0.5">{profile.employee_id}</p>
              <p className="text-slate-500 text-sm mt-1">{profile.email}</p>
            </div>
            
            <div className="mt-3 sm:mt-0">
              <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 uppercase tracking-widest text-[10px] px-3 py-1 font-bold">Active</Badge>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Read-Only Information (Left Column) */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="bg-white border-slate-200 shadow-sm h-full">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm flex items-center gap-2 text-slate-800 font-bold font-heading uppercase tracking-wider">
                  <Briefcase className="w-4 h-4 text-emerald-500" />
                  Professional Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <InfoRow label="Employee ID" value={profile.employee_id || 'N/A'} Icon={Briefcase} />
                <InfoRow label="Department" value={profile.department || 'N/A'} Icon={Building} />
                <InfoRow label="Designation" value={profile.designation || 'N/A'} Icon={User} />
                <InfoRow label="Qualification" value={profile.qualification || 'N/A'} Icon={GraduationCap} />
                <InfoRow label="Specialization" value={profile.specialization || 'N/A'} Icon={GraduationCap} />
                <InfoRow label="Office Location" value={profile.office_location || 'N/A'} Icon={MapPinned} />
              </CardContent>
            </Card>
          </div>

          {/* Editable Information (Right Column) */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2 text-slate-800 font-bold font-heading uppercase tracking-wider">
                  <Phone className="w-4 h-4 text-emerald-500" />
                  Contact Information
                </CardTitle>
                {!editing && (
                  <Button variant="outline" onClick={() => setEditing(true)} className="h-8 text-xs border-slate-200 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200 transition-colors font-semibold shadow-sm">
                    Edit Details
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    label="Cell Phone"
                    value={formData.cell_no}
                    editing={editing}
                    onChange={(value) => setFormData({ ...formData, cell_no: value })}
                    placeholder="+92-300-1234567"
                    Icon={Phone}
                  />
                  <div className="md:col-span-2">
                    <FormField
                      label="Address"
                      value={formData.address}
                      editing={editing}
                      onChange={(value) => setFormData({ ...formData, address: value })}
                      placeholder="Enter your address"
                      Icon={MapPin}
                      multiline
                    />
                  </div>
                </div>

                {editing && (
                  <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-slate-100">
                    <Button variant="ghost" onClick={handleCancel} disabled={saving} className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 h-9 text-sm font-semibold">
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving} className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_4px_10px_rgba(16,185,129,0.3)] h-9 text-sm font-bold">
                      {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Security Settings */}
            <Card className="bg-rose-50/50 border-rose-100 shadow-sm">
              <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-full bg-rose-100 text-rose-600 border border-rose-200">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 mb-0.5">Security Settings</h3>
                    <p className="text-xs font-medium text-slate-500 max-w-md leading-relaxed">Update your password regularly to keep your account secure and prevent unauthorized access.</p>
                  </div>
                </div>
                <Button onClick={() => setShowPasswordModal(true)} variant="outline" className="shrink-0 h-9 text-xs font-bold border-rose-200 text-rose-600 hover:bg-rose-100 hover:text-rose-700 hover:border-rose-300 transition-colors shadow-sm bg-white">
                  Change Password
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>

      {/* Password Change Modal */}
      <PasswordChangeModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        username={authUser.username}
      />
    </div>
  );
}

// Helper Components
function InfoRow({ label, value, Icon }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
        <Icon className="w-4 h-4 text-slate-400" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-sm text-slate-800 font-semibold truncate">{value}</p>
      </div>
    </div>
  );
}

function FormField({ label, value, editing, onChange, placeholder, Icon, multiline }) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 ml-1">
        <Icon className="w-3 h-3" />
        {label}
      </label>
      {editing ? (
        multiline ? (
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="bg-white border-slate-200 text-slate-800 focus-visible:ring-emerald-500 min-h-[80px] resize-none text-sm shadow-sm"
          />
        ) : (
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="bg-white border-slate-200 text-slate-800 focus-visible:ring-emerald-500 h-10 text-sm shadow-sm"
          />
        )
      ) : (
        <div className="px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-100 min-h-[40px] flex items-center shadow-sm">
          <p className={`text-sm ${value ? 'text-slate-800 font-semibold' : 'text-slate-400 italic font-medium'}`}>
            {value || 'Not provided'}
          </p>
        </div>
      )}
    </div>
  );
}
