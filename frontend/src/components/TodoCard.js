'use client';

import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Calendar, AlertCircle, Clock, BookOpen, Bot, Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TodoCard({ todo, onToggleComplete, onEdit, onDelete }) {
  const formatDate = (dateString) => {
    if (!dateString) return 'No deadline';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)} days`;
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    return `Due in ${diffDays} days`;
  };

  const isOverdue = !todo.completed && todo.due_date && new Date(todo.due_date) < new Date();

  const priorityConfig = {
    high: { label: 'High Priority', class: 'badge-rose' },
    medium: { label: 'Medium Priority', class: 'badge-amber' },
    low: { label: 'Low Priority', class: 'badge-emerald' },
  };

  const pConfig = priorityConfig[todo.priority] || { label: 'Priority', class: 'bg-slate-500/20 text-slate-400' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      layout
      whileHover={{ y: -2 }}
    >
      <Card className={`glass-card overflow-hidden transition-all duration-300 ${
        todo.completed ? 'opacity-60 grayscale-[0.3]' : isOverdue ? 'border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.1)]' : 'border-white/5'
      }`}>
        {isOverdue && <div className="absolute top-0 left-0 w-1 h-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]" />}
        {!isOverdue && !todo.completed && <div className="absolute top-0 left-0 w-1 h-full bg-violet-500 shadow-[0_0_10px_rgba(167,139,250,0.5)]" />}
        {todo.completed && <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />}

        <CardContent className="p-2 flex gap-3">
          <div className="pt-0.5">
            <Checkbox 
              checked={todo.completed} 
              onCheckedChange={() => onToggleComplete(todo.id, todo.completed)}
              className="w-4 h-4 rounded-md border-white/20 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-0.5">
              <h4 className={`text-sm font-bold font-heading truncate ${todo.completed ? 'line-through text-slate-400' : 'text-white'}`}>
                {todo.title}
              </h4>
              <div className="flex gap-1.5 shrink-0">
                {!todo.is_auto_generated && (
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 rounded-full" onClick={() => onEdit(todo)}>
                    <Edit2 className="w-3 h-3" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-full" onClick={() => onDelete(todo.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
            
            {todo.description && (
              <p className="text-xs text-slate-400 mb-2 line-clamp-2">
                {todo.description}
              </p>
            )}
            
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <Badge variant="outline" className={`${isOverdue ? 'badge-rose' : 'badge-violet'} flex items-center gap-1 text-[10px] px-1.5 py-0.5`}>
                {isOverdue ? <AlertCircle className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                {formatDate(todo.due_date)}
              </Badge>
              
              <Badge variant="outline" className={`${pConfig.class} text-[10px] px-1.5 py-0.5`}>
                {pConfig.label}
              </Badge>
              
              <Badge variant="outline" className="badge-indigo flex items-center gap-1 text-[10px] px-1.5 py-0.5">
                {todo.source === 'manual' ? <Edit2 className="w-2.5 h-2.5" /> : <Bot className="w-2.5 h-2.5" />}
                {todo.source.toUpperCase()}
              </Badge>
              
              {todo.source_course && (
                <Badge variant="outline" className="badge-cyan flex items-center gap-1 text-[10px] px-1.5 py-0.5">
                  <BookOpen className="w-2.5 h-2.5" />
                  {todo.source_course}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
