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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
          <p className="text-slate-400 font-medium animate-pulse">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-4 max-w-5xl mx-auto min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="space-y-3"
      >
        {/* Header */}
        <div className="mb-3">
          <Badge variant="outline" className="badge-violet mb-1.5 text-xs">Account Settings</Badge>
          <h1 className="text-xl font-bold tracking-tight text-white font-heading">
            My Profile
          </h1>
          <p className="text-slate-400 mt-0.5 text-sm">View and manage your personal and academic information.</p>
        </div>

        {/* Alerts */}
        {success && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-2.5 text-sm">
            <Check className="w-4 h-4 flex-shrink-0" />
            {success}
          </motion.div>
        )}

        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2.5 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </motion.div>
        )}

        {/* Hero Profile Card */}
        <Card className="glass-card border-white/5 overflow-hidden border-t-4 border-t-violet-500">
          <CardContent className="p-3.5 pt-3 relative sm:flex sm:items-center sm:gap-3.5">
            <div className="relative group inline-block">
              <Avatar className="w-14 h-14 border-4 border-[#0d1017] shadow-xl bg-background">
                <AvatarImage src={profile.profile_picture_url} />
                <AvatarFallback className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white font-heading text-lg">
                  {profile.first_name?.[0]}{profile.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <button className="absolute bottom-0 right-0 p-1 bg-violet-600 hover:bg-violet-500 text-white rounded-full shadow-lg transition-transform hover:scale-110" title="Upload coming soon">
                <Camera className="w-2.5 h-2.5" />
              </button>
            </div>
            
            <div className="mt-2 sm:mt-0 flex-1 pb-1">
              <h2 className="text-base font-bold text-white font-heading">{profile.first_name} {profile.last_name}</h2>
              <p className="text-violet-400 font-medium tracking-wide text-xs">{profile.registration_no}</p>
              <p className="text-slate-400 text-xs mt-0.5">{profile.email}</p>
            </div>
            
            <div className="mt-2 sm:mt-0 pb-1">
              <Badge variant="outline" className="badge-emerald uppercase tracking-widest text-xs px-2 py-0.5">Active</Badge>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Read-Only Information (Left Column) */}
          <div className="lg:col-span-1 space-y-3">
            <Card className="glass-card border-white/5 h-full">
              <CardHeader className="pb-2.5 border-b border-white/5">
                <CardTitle className="text-sm flex items-center gap-2 text-white font-heading">
                  <User className="w-4 h-4 text-violet-400" />
                  Academic Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 space-y-3.5">
                <InfoRow label="Program" value={profile.program || 'N/A'} Icon={BookOpen} />
                <InfoRow label="Department" value={profile.department || 'N/A'} Icon={Building} />
                <InfoRow label="Batch" value={profile.batch || 'N/A'} Icon={Layers} />
                <InfoRow label="Current Semester" value={`Semester ${profile.current_semester || 'N/A'}`} Icon={Calendar} />
                
                <div className="h-px bg-white/5 my-3" />
                
                <InfoRow label="Date of Birth" value={profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString() : 'N/A'} Icon={Calendar} />
                <InfoRow label="CNIC" value={profile.nic || 'N/A'} Icon={ShieldCheck} />
                <InfoRow label="Gender" value={profile.gender || 'N/A'} Icon={User} />
              </CardContent>
            </Card>
          </div>

          {/* Editable Information (Right Column) */}
          <div className="lg:col-span-2 space-y-3">
            <Card className="glass-card border-white/5">
              <CardHeader className="pb-2.5 border-b border-white/5 flex flex-row items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2 text-white font-heading">
                  <Phone className="w-4 h-4 text-cyan-400" />
                  Contact & Guardian Info
                </CardTitle>
                {!editing && (
                  <Button variant="outline" onClick={() => setEditing(true)} className="h-8 text-xs border-white/10 text-slate-300 hover:text-white hover:bg-white/10">
                    Edit Details
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-3.5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
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
                  <div className="flex justify-end gap-2.5 mt-4 pt-3 border-t border-white/5">
                    <Button variant="ghost" onClick={handleCancel} disabled={saving} className="text-slate-300 hover:text-white hover:bg-white/5 h-8 text-sm">
                      Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving} className="bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_15px_rgba(124,58,237,0.4)] h-8 text-sm">
                      {saving ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : null}
                      {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Security Settings */}
            <Card className="glass-card border-white/5 bg-gradient-to-br from-[#0d1017] to-rose-950/10">
              <CardContent className="p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white mb-0.5">Security Settings</h3>
                    <p className="text-xs text-slate-400 max-w-md">Update your password regularly to keep your account secure.</p>
                  </div>
                </div>
                <Button onClick={() => setShowPasswordModal(true)} variant="outline" className="shrink-0 h-8 text-sm border-rose-500/30 text-rose-300 hover:bg-rose-500/10 hover:text-rose-200">
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
      <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0 border border-white/5">
        <Icon className="w-3.5 h-3.5 text-slate-400" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{label}</p>
        <p className="text-sm text-slate-200 font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

function FormField({ label, value, editing, onChange, placeholder, Icon, multiline }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 ml-1">
        <Icon className="w-3 h-3" />
        {label}
      </label>
      {editing ? (
        multiline ? (
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="bg-black/30 border-white/10 text-white focus-visible:ring-violet-500 min-h-[60px] resize-none text-sm"
          />
        ) : (
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="bg-black/30 border-white/10 text-white focus-visible:ring-violet-500 h-9 text-sm"
          />
        )
      ) : (
        <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/5 min-h-[36px] flex items-center">
          <p className={`text-sm ${value ? 'text-white font-medium' : 'text-slate-500 italic'}`}>
            {value || 'Not provided'}
          </p>
        </div>
      )}
    </div>
  );
}
