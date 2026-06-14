'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { X, User, Mail, Building, IdCard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function UserInfoModal({ user, isOpen, onClose }) {
  if (!user) return null;

  const getRoleBadgeColor = (role) => {
    switch (role?.toUpperCase()) {
      case 'STUDENT':
        return 'bg-sky-50 text-sky-600 border-sky-100';
      case 'TEACHER':
        return 'bg-slate-50 text-slate-700 border-slate-200';
      case 'ADMIN':
        return 'bg-red-50 text-red-600 border-red-100';
      default:
        return 'bg-slate-50 text-slate-500 border-slate-100';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-bold text-slate-800 font-heading flex items-center gap-2">
                <User className="w-5 h-5 text-sky-500" />
                User Information
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-50 cursor-pointer"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Avatar and Name */}
            <div className="flex flex-col items-center mb-6">
              <Avatar className="w-24 h-24 border border-slate-200 shadow-md mb-4">
                <AvatarImage src={user.profile_picture_url} />
                <AvatarFallback className="bg-sky-500 text-white font-heading font-bold text-2xl">
                  {user.first_name?.[0]}{user.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              <h4 className="text-lg font-bold text-slate-900 font-heading mb-2">
                {user.first_name} {user.last_name}
              </h4>
              <Badge variant="outline" className={`${getRoleBadgeColor(user.role)} font-bold text-xs px-2.5 py-0.5 rounded-full uppercase`}>
                {user.role}
              </Badge>
            </div>

            {/* User Details */}
            <div className="space-y-3">
              {/* Username */}
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-8 h-8 rounded-full bg-sky-50 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-sky-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Username</p>
                  <p className="text-xs font-bold text-slate-800 truncate">@{user.username}</p>
                </div>
              </div>

              {/* Registration No / Employee ID */}
              {(user.registration_no || user.employee_id) && (
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-8 h-8 rounded-full bg-sky-50 flex items-center justify-center shrink-0">
                    <IdCard className="w-4 h-4 text-sky-650" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                      {user.registration_no ? 'Registration No' : 'Employee ID'}
                    </p>
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {user.registration_no || user.employee_id}
                    </p>
                  </div>
                </div>
              )}

              {/* Email */}
              {user.email && (
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-8 h-8 rounded-full bg-sky-50 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-sky-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Email</p>
                    <p className="text-xs font-bold text-slate-800 truncate">{user.email}</p>
                  </div>
                </div>
              )}

              {/* Department */}
              {user.department && (
                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-8 h-8 rounded-full bg-sky-50 flex items-center justify-center shrink-0">
                    <Building className="w-4 h-4 text-sky-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Department</p>
                    <p className="text-xs font-bold text-slate-800 truncate">{user.department}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Close Button */}
            <div className="mt-6 pt-4 border-t border-slate-150">
              <Button
                onClick={onClose}
                className="w-full bg-sky-500 hover:bg-sky-600 text-white rounded-xl h-10 font-bold text-xs cursor-pointer shadow-sm"
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
