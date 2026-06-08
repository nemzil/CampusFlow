'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { searchUsers } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Loader2, UserX } from 'lucide-react';

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
      case 'ADMIN': return 'badge-rose';
      case 'TEACHER': return 'badge-cyan';
      case 'STUDENT': return 'badge-violet';
      default: return 'badge-indigo';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] glass border-white/10 text-white shadow-2xl p-0 overflow-hidden rounded-2xl">
        {/* Header gradient bar */}
        <div className="h-2 w-full bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-500" />
        
        <div className="p-6">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-bold font-heading text-white tracking-tight">
              New Message
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Search for students or faculty members to start a conversation.
            </DialogDescription>
          </DialogHeader>

          {/* Search Input */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or username..."
              className="pl-10 h-12 bg-background/50 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-violet-500 rounded-xl"
              autoFocus
            />
          </div>

          {/* Results Area */}
          <div className="bg-black/20 rounded-xl border border-white/5 h-[300px] overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
                <p className="text-sm">Searching directory...</p>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full text-rose-400 text-sm px-4 text-center">
                {error}
              </div>
            ) : query.trim().length < 2 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
                <Search className="w-8 h-8 mb-2 opacity-50" />
                Type at least 2 characters to search
              </div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
                <UserX className="w-8 h-8 mb-2 opacity-50 text-slate-500" />
                No users found matching "{query}"
              </div>
            ) : (
              <ScrollArea className="h-full w-full">
                <div className="p-2 space-y-1">
                  <AnimatePresence>
                    {results.map((user) => (
                      <motion.div
                        key={user.username}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => handleSelect(user)}
                        className="flex items-center gap-4 p-3 rounded-xl cursor-pointer hover:bg-white/10 transition-colors group"
                      >
                        <Avatar className="w-10 h-10 border border-white/10 group-hover:border-violet-500/50 transition-colors">
                          <AvatarImage src={user.profile_picture_url} />
                          <AvatarFallback className="bg-gradient-to-br from-violet-600 to-indigo-600 text-white font-heading font-semibold text-xs">
                            {user.first_name?.[0]}{user.last_name?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-white truncate font-heading group-hover:text-violet-300 transition-colors">
                            {user.first_name} {user.last_name}
                          </h4>
                          <p className="text-xs text-slate-400 truncate">@{user.username}</p>
                        </div>

                        <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${getRoleBadgeColor(user.role)}`}>
                          {user.role}
                        </div>
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
