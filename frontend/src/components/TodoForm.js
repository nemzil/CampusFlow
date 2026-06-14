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
    setLoading(false);
  }, [initialData, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    setLoading(true);

    try {
      const todoData = {
        title: formData.title.trim(),
        priority: formData.priority,
        source: formData.source
      };
      
      if (formData.description && formData.description.trim()) {
        todoData.description = formData.description.trim();
      }
      
      if (formData.due_date) {
        todoData.due_date = new Date(formData.due_date).toISOString();
      }
      
      await onSave(todoData);
    } catch (err) {
      console.error('Error stack:', err.stack);
      setError(err.message || 'Failed to save todo');
      setLoading(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
          <DialogContent className="sm:max-w-[500px] bg-white border-x border-b border-t-0 border-slate-200 text-slate-800 shadow-2xl p-0 overflow-hidden rounded-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ 
                duration: 0.2,
                ease: [0.16, 1, 0.3, 1]
              }}
            >
              <div className="p-6">
                <DialogHeader className="mb-6">
                  <DialogTitle className="text-xl font-bold font-heading text-slate-900 tracking-tight">
                    {initialData ? 'Edit Task' : 'Create New Task'}
                  </DialogTitle>
                  <DialogDescription className="text-slate-500 text-xs mt-1">
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
                        className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-650 text-xs"
                      >
                        <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
                        <p className="font-bold">{error}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Title <span className="text-red-550">*</span></label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="bg-slate-50 border-slate-200 text-slate-800 focus-visible:ring-sky-500 text-xs h-10 rounded-xl"
                      placeholder="e.g. Complete Database Assignment"
                      disabled={loading}
                      maxLength={100}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Description</label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="bg-slate-50 border-slate-200 text-slate-800 focus-visible:ring-sky-500 resize-none min-h-[100px] text-xs rounded-xl"
                      placeholder="Add any extra details or links here..."
                      disabled={loading}
                      maxLength={500}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Priority</label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                        className="w-full h-10 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/50 appearance-none cursor-pointer"
                        disabled={loading}
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 0.75rem center',
                          backgroundSize: '16px 16px'
                        }}
                      >
                        <option value="low" className="bg-white text-slate-850">Low Priority</option>
                        <option value="medium" className="bg-white text-slate-855">Medium Priority</option>
                        <option value="high" className="bg-white text-slate-860">High Priority</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1">Due Date</label>
                      <Input
                        type="date"
                        value={formData.due_date}
                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                        className="bg-slate-50 border-slate-200 text-slate-800 focus-visible:ring-sky-500 cursor-pointer text-xs h-10 rounded-xl"
                        disabled={loading}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>

                  <DialogFooter className="pt-4 border-t border-slate-150 mt-6 gap-2 sm:gap-0 shrink-0">
                    <Button type="button" variant="ghost" onClick={onClose} disabled={loading} className="text-slate-500 hover:text-slate-700 hover:bg-slate-50 font-bold text-xs h-9 cursor-pointer">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading} className="bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs h-9 px-4 rounded-xl cursor-pointer shadow-sm">
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
