'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { searchUsers } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Loader2, UserX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function UserSearch({ isOpen, onClose, onSelectUser }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setError('');
    }
  }, [isOpen]);

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (query.trim().length >= 2) {
        handleSearch();
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [query]);

  const handleSearch = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await searchUsers(query.trim());
      setResults(data);
    } catch (err) {
      setError('Failed to search users');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (user) => {
    onSelectUser(user);
    onClose();
  };

  const getRoleBadgeColor = (role) => {
    switch (role?.toUpperCase()) {
      case 'ADMIN': return 'bg-red-50 text-red-600 border-red-100';
      case 'TEACHER': return 'bg-slate-50 text-slate-700 border-slate-200';
      case 'STUDENT': return 'bg-sky-50 text-sky-600 border-sky-100';
      default: return 'bg-slate-50 text-slate-550 border-slate-200';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] bg-white border border-slate-250/20 text-slate-800 shadow-2xl p-0 overflow-hidden rounded-2xl">
        <div className="p-6">
          <DialogHeader className="mb-5">
            <DialogTitle className="text-xl font-bold font-heading text-slate-900 tracking-tight">
              New Message
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Search for students or faculty members to start a conversation.
            </DialogDescription>
          </DialogHeader>

          {/* Search Input */}
          <div className="relative mb-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or username..."
              className="pl-9 h-11 bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus-visible:ring-sky-500 rounded-xl text-xs"
              autoFocus
            />
          </div>

          {/* Results Area */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 h-[280px] overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
                <p className="text-xs">Searching directory...</p>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full text-red-500 text-xs px-4 text-center">
                {error}
              </div>
            ) : query.trim().length < 2 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
                <Search className="w-6 h-6 mb-2 opacity-50 text-slate-450" />
                Type at least 2 characters to search
              </div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-450 text-xs">
                <UserX className="w-6 h-6 mb-2 opacity-50" />
                No users found matching "{query}"
              </div>
            ) : (
              <ScrollArea className="h-full w-full">
                <div className="p-2 space-y-1">
                  <AnimatePresence>
                    {results.map((user) => (
                      <motion.div
                        key={user.username}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        whileHover={{ scale: 1.005 }}
                        whileTap={{ scale: 0.995 }}
                        onClick={() => handleSelect(user)}
                        className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-white border border-transparent hover:border-slate-150 transition-all group"
                      >
                        <Avatar className="w-9 h-9 border border-slate-200 group-hover:border-sky-350 transition-colors">
                          <AvatarImage src={user.profile_picture_url} />
                          <AvatarFallback className="bg-sky-500 text-white font-heading font-bold text-xs">
                            {user.first_name?.[0]}{user.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-slate-800 truncate font-heading group-hover:text-sky-600 transition-colors">
                            {user.first_name} {user.last_name}
                          </h4>
                          <p className="text-[10px] text-slate-450 truncate">@{user.username}</p>
                        </div>

                        <Badge variant="outline" className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${getRoleBadgeColor(user.role)}`}>
                          {user.role}
                        </Badge>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
