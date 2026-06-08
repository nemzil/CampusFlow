'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { X, User, Mail, Building, IdCard, Briefcase } from 'lucide-react';

export default function UserInfoModal({ user, isOpen, onClose }) {
  if (!user) return null;

  const getRoleBadgeColor = (role) => {
    switch (role?.toUpperCase()) {
      case 'STUDENT':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'TEACHER':
        return 'bg-violet-500/20 text-violet-300 border-violet-500/30';
      case 'ADMIN':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="bg-[#0d1017] border border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white font-heading flex items-center gap-2">
                <User className="w-5 h-5 text-violet-400" />
                User Information
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Avatar and Name */}
            <div className="flex flex-col items-center mb-6">
              <Avatar className="w-24 h-24 border-4 border-white/10 shadow-lg mb-4">
                <AvatarImage src={user.profile_picture_url} />
                <AvatarFallback className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white font-heading font-semibold text-2xl">
                  {user.first_name?.[0]}{user.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <h4 className="text-xl font-bold text-white font-heading mb-2">
                {user.first_name} {user.last_name}
              </h4>
              <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${getRoleBadgeColor(user.role)}`}>
                {user.role}
              </div>
            </div>

            {/* User Details */}
            <div className="space-y-3">
              {/* Username */}
              <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-400 mb-0.5">Username</p>
                  <p className="text-sm text-white font-medium truncate">@{user.username}</p>
                </div>
              </div>

              {/* Registration No / Employee ID */}
              {(user.registration_no || user.employee_id) && (
                <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                    <IdCard className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-400 mb-0.5">
                      {user.registration_no ? 'Registration No' : 'Employee ID'}
                    </p>
                    <p className="text-sm text-white font-medium truncate">
                      {user.registration_no || user.employee_id}
                    </p>
                  </div>
                </div>
              )}

              {/* Email */}
              {user.email && (
                <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-400 mb-0.5">Email</p>
                    <p className="text-sm text-white font-medium truncate">{user.email}</p>
                  </div>
                </div>
              )}

              {/* Department */}
              {user.department && (
                <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                  <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
                    <Building className="w-4 h-4 text-orange-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-400 mb-0.5">Department</p>
                    <p className="text-sm text-white font-medium truncate">{user.department}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Close Button */}
            <div className="mt-6 pt-4 border-t border-white/5">
              <Button
                onClick={onClose}
                className="w-full bg-violet-600 hover:bg-violet-500 text-white rounded-xl h-10"
              >
                Close
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
