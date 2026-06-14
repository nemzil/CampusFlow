'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import { getUserProfile, updateUserProfile } from '@/lib/api';
import PasswordChangeModal from '@/components/PasswordChangeModal';
import { User, Phone, MapPin, Calendar, CreditCard, Building, BookOpen, Layers, ShieldCheck, Lock, Camera, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export default function StudentProfile() {
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
    guardian_name: '',
    guardian_cnic: '',
  });

  useEffect(() => {
    if (!authLoading && !authUser) {
      router.push('/login');
    } else if (!authLoading && authUser && authUser.role !== 'STUDENT') {
      router.push('/login');
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
        guardian_name: data.guardian_name || '',
        guardian_cnic: data.guardian_cnic || '',
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
      guardian_name: profile.guardian_name || '',
      guardian_cnic: profile.guardian_cnic || '',
    });
    setError('');
  };

  if (authLoading || loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-sky-500 animate-spin" />
          <p className="text-slate-500 font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto min-h-screen font-sans text-slate-800 bg-white">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="space-y-4"
      >
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 font-heading">
            My Profile
          </h1>
          <p className="text-slate-550 mt-1 text-sm">View and manage your personal and academic information.</p>
        </div>

        {/* Alerts */}
        {success && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-xl bg-emerald-50 border border-emerald-150 text-emerald-600 flex items-center gap-2.5 text-sm font-bold">
            <Check className="w-4 h-4 flex-shrink-0" />
            {success}
          </motion.div>
        )}

        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-xl bg-red-50 border border-red-150 text-red-655 flex items-center gap-2.5 text-sm font-bold">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </motion.div>
        )}

        {/* Hero Profile Card */}
        <Card className="border-slate-200 bg-white overflow-hidden shadow-sm rounded-2xl">
          <CardContent className="p-5 relative sm:flex sm:items-center sm:gap-5">
            <div className="relative group inline-block">
              <Avatar className="w-16 h-16 border-2 border-slate-100 shadow-sm bg-white">
                <AvatarImage src={profile.profile_picture_url} />
                <AvatarFallback className="bg-sky-500 text-white font-heading font-bold text-xl">
                  {profile.first_name?.[0]}{profile.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <button className="absolute bottom-0 right-0 p-1 bg-sky-500 hover:bg-sky-600 text-white rounded-full shadow-md transition-transform hover:scale-110" title="Upload coming soon">
                <Camera className="w-3 h-3" />
              </button>
            </div>
            
            <div className="mt-3 sm:mt-0 flex-1">
              <h2 className="text-lg font-bold text-slate-900 font-heading">{profile.first_name} {profile.last_name}</h2>
              <p className="text-sky-600 font-bold tracking-wide text-xs">{profile.registration_no}</p>
              <p className="text-slate-500 text-xs mt-0.5">{profile.email}</p>
            </div>
            
            <div className="mt-3 sm:mt-0">
              <Badge variant="outline" className="bg-sky-50 text-sky-600 border border-sky-100 uppercase tracking-widest text-xs px-2.5 py-0.5 font-bold">Active</Badge>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Read-Only Information (Left Column) */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="border-slate-200 bg-white shadow-sm rounded-2xl h-full">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-sm flex items-center gap-2 text-slate-900 font-heading font-bold">
                  <User className="w-4 h-4 text-sky-500" />
                  Academic Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <InfoRow label="Program" value={profile.program || 'N/A'} Icon={BookOpen} />
                <InfoRow label="Department" value={profile.department || 'N/A'} Icon={Building} />
                <InfoRow label="Batch" value={profile.batch || 'N/A'} Icon={Layers} />
                <InfoRow label="Current Semester" value={`Semester ${profile.current_semester || 'N/A'}`} Icon={Calendar} />
                
                <div className="h-px bg-slate-100 my-4" />
                
                <InfoRow label="Date of Birth" value={profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString() : 'N/A'} Icon={Calendar} />
                <InfoRow label="CNIC" value={profile.nic || 'N/A'} Icon={ShieldCheck} />
                <InfoRow label="Gender" value={profile.gender || 'N/A'} Icon={User} />
              </CardContent>
            </Card>
          </div>

          {/* Editable Information (Right Column) */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-slate-200 bg-white shadow-sm rounded-2xl">
              <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2 text-slate-900 font-heading font-bold">
                  <Phone className="w-4 h-4 text-sky-500" />
                  Contact & Guardian Info
                </CardTitle>
                {!editing && (
                  <Button variant="outline" onClick={() => setEditing(true)} className="h-8 text-xs border-slate-200 text-slate-700 hover:bg-slate-50">
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
                  <FormField
                    label="Guardian Name"
                    value={formData.guardian_name}
                    editing={editing}
                    onChange={(value) => setFormData({ ...formData, guardian_name: value })}
                    placeholder="Enter guardian name"
                    Icon={User}
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
                  <FormField
                    label="Guardian CNIC"
                    value={formData.guardian_cnic}
                    editing={editing}
                    onChange={(value) => setFormData({ ...formData, guardian_cnic: value })}
                    placeholder="XXXXX-XXXXXXX-X"
                    Icon={ShieldCheck}
                  />
                </div>

                {editing && (
                  <div className="flex justify-end gap-2.5 mt-4 pt-3 border-t border-slate-100">
                    <Button variant="ghost" onClick={handleCancel} disabled={saving} className="text-slate-500 hover:text-slate-700 hover:bg-slate-50 h-8 text-xs font-bold rounded-xl">
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving} className="bg-sky-500 hover:bg-sky-600 text-white shadow-sm h-8 text-xs font-bold rounded-xl">
                      {saving ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : null}
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Security Settings */}
            <Card className="border-slate-200 bg-white shadow-sm rounded-2xl">
              <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-full bg-red-50 border border-red-100 text-red-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-0.5">Security Settings</h3>
                    <p className="text-xs text-slate-500 max-w-md">Update your password regularly to keep your account secure.</p>
                  </div>
                </div>
                <Button onClick={() => setShowPasswordModal(true)} variant="outline" className="shrink-0 h-8 text-xs border-red-200 text-red-650 hover:bg-red-50 hover:text-red-700 font-bold rounded-xl">
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
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-lg bg-sky-50 flex items-center justify-center shrink-0 border border-sky-100/50">
        <Icon className="w-3.5 h-3.5 text-sky-500" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">{label}</p>
        <p className="text-sm text-slate-800 font-semibold truncate">{value}</p>
      </div>
    </div>
  );
}

// FormField Component
function FormField({ label, value, editing, onChange, placeholder, Icon, multiline }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider flex items-center gap-1.5 ml-1">
        <Icon className="w-3 h-3" />
        {label}
      </label>
      {editing ? (
        multiline ? (
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="bg-slate-50 border-slate-200 text-slate-800 focus-visible:ring-sky-500 min-h-[60px] resize-none text-xs rounded-xl"
          />
        ) : (
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="bg-slate-50 border-slate-200 text-slate-800 focus-visible:ring-sky-500 h-9 text-xs rounded-xl"
          />
        )
      ) : (
        <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 min-h-[36px] flex items-center">
          <p className={`text-xs ${value ? 'text-slate-800 font-semibold' : 'text-slate-400 italic'}`}>
            {value || 'Not provided'}
          </p>
        </div>
      )}
    </div>
  );
}
