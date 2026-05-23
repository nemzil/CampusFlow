'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TodoForm({ isOpen, onClose, onSave, initialData }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
    source: 'manual'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        priority: initialData.priority || 'medium',
        due_date: initialData.due_date ? initialData.due_date.split('T')[0] : '',
        source: 'manual'
      });
    } else {
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        due_date: '',
        source: 'manual'
      });
    }
    setError('');
    setLoading(false); // Reset loading state when dialog opens/closes
  }, [initialData, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    setLoading(true);
    console.log('Form data before processing:', formData); // Debug log

    try {
      const todoData = {
        title: formData.title.trim(),
        priority: formData.priority,
        source: formData.source
      };
      
      // Only add optional fields if they have values
      if (formData.description && formData.description.trim()) {
        todoData.description = formData.description.trim();
      }
      
      if (formData.due_date) {
        todoData.due_date = new Date(formData.due_date).toISOString();
      }
      
      console.log('Submitting todo data:', todoData); // Debug log
      console.log('Calling onSave with data:', JSON.stringify(todoData)); // Debug log
      
      const result = await onSave(todoData);
      console.log('onSave result:', result); // Debug log
      // Close is handled by parent on success
    } catch (err) {
      console.error('Todo save error:', err); // Debug log
      console.error('Error message:', err.message); // Debug log
      console.error('Error stack:', err.stack); // Debug log
      setError(err.message || 'Failed to save todo');
      setLoading(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
          <DialogContent className="sm:max-w-[500px] glass border-white/10 text-white shadow-2xl p-0 overflow-hidden rounded-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ 
                duration: 0.2,
                ease: [0.16, 1, 0.3, 1]
              }}
            >
              {/* Header gradient bar */}
              <div className="h-2 w-full bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-500" />
              
              <div className="p-6">
                <DialogHeader className="mb-6">
                  <DialogTitle className="text-2xl font-bold font-heading text-white tracking-tight">
                    {initialData ? 'Edit Task' : 'Create New Task'}
                  </DialogTitle>
                  <DialogDescription className="text-slate-400">
                    {initialData ? 'Update the details of your task.' : 'Add a new manual task to your tracking list.'}
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, y: -10 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-center gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm"
                      >
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <p>{error}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-300 ml-1">Title <span className="text-violet-400">*</span></label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="bg-background/50 border-white/10 text-white focus-visible:ring-violet-500"
                      placeholder="e.g. Complete Database Assignment"
                      disabled={loading}
                      maxLength={100}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-300 ml-1">Description</label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="bg-background/50 border-white/10 text-white focus-visible:ring-violet-500 resize-none min-h-[100px]"
                      placeholder="Add any extra details or links here..."
                      disabled={loading}
                      maxLength={500}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-300 ml-1">Priority</label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                        className="w-full h-10 px-3 py-2 rounded-md bg-background/50 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 appearance-none cursor-pointer"
                        disabled={loading}
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 0.75rem center',
                          backgroundSize: '16px 16px'
                        }}
                      >
                        <option value="low" className="bg-[#07090f]">Low Priority</option>
                        <option value="medium" className="bg-[#07090f]">Medium Priority</option>
                        <option value="high" className="bg-[#07090f]">High Priority</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-300 ml-1">Due Date</label>
                      <Input
                        type="date"
                        value={formData.due_date}
                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                        className="bg-background/50 border-white/10 text-white focus-visible:ring-violet-500 cursor-pointer [color-scheme:dark]"
                        disabled={loading}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>

                  <DialogFooter className="pt-4 border-t border-white/5 mt-6 gap-2 sm:gap-0">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={loading} className="text-slate-300 hover:text-white hover:bg-white/5">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading} className="bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_15px_rgba(124,58,237,0.5)]">
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        initialData ? 'Save Changes' : 'Create Task'
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </div>
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
