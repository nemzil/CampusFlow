'use client';

import { useState } from 'react';
import { changePassword } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { KeyRound, Lock, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function PasswordChangeModal({ isOpen, onClose, username }) {
  const [passwords, setPasswords] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (passwords.new_password !== passwords.confirm_password) {
      setError('New passwords do not match');
      return;
    }

    if (passwords.new_password.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      await changePassword(username, {
        current_password: passwords.current_password,
        new_password: passwords.new_password
      });
      
      setSuccess('Password changed successfully');
      setPasswords({ current_password: '', new_password: '', confirm_password: '' });
      
      setTimeout(() => {
        onClose();
        setSuccess('');
      }, 2000);
      
    } catch (err) {
      setError(err.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPasswords({ current_password: '', new_password: '', confirm_password: '' });
    setError('');
    setSuccess('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[425px] glass border-white/10 text-white shadow-2xl p-0 overflow-hidden rounded-2xl">
        <div className="h-2 w-full bg-gradient-to-r from-rose-500 via-violet-500 to-indigo-500" />
        
        <div className="p-6">
          <DialogHeader className="mb-6">
            <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center mb-4 border border-rose-500/20">
              <KeyRound className="w-6 h-6 text-rose-400" />
            </div>
            <DialogTitle className="text-2xl font-bold font-heading text-white text-center tracking-tight">
              Change Password
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-center">
              Enter your current password and choose a new secure password.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </motion.div>
              )}
              {success && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Current Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  type="password"
                  value={passwords.current_password}
                  onChange={(e) => setPasswords({...passwords, current_password: e.target.value})}
                  className="pl-9 bg-background/50 border-white/10 text-white focus-visible:ring-violet-500 h-11"
                  placeholder="••••••••"
                  required
                  disabled={loading || success}
                />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  type="password"
                  value={passwords.new_password}
                  onChange={(e) => setPasswords({...passwords, new_password: e.target.value})}
                  className="pl-9 bg-background/50 border-white/10 text-white focus-visible:ring-violet-500 h-11"
                  placeholder="••••••••"
                  required
                  disabled={loading || success}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Confirm New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  type="password"
                  value={passwords.confirm_password}
                  onChange={(e) => setPasswords({...passwords, confirm_password: e.target.value})}
                  className="pl-9 bg-background/50 border-white/10 text-white focus-visible:ring-violet-500 h-11"
                  placeholder="••••••••"
                  required
                  disabled={loading || success}
                />
              </div>
            </div>

            <DialogFooter className="mt-8 pt-4 gap-2 sm:gap-0">
              <Button type="button" variant="ghost" onClick={handleClose} disabled={loading} className="text-slate-300 hover:text-white hover:bg-white/5">
                Cancel
              </Button>
              <Button type="submit" disabled={loading || success} className="bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_15px_rgba(124,58,237,0.4)] px-6">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
