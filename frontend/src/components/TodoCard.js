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
    high: { label: 'High Priority', class: 'bg-red-50 text-red-600 border-red-100' },
    medium: { label: 'Medium Priority', class: 'bg-amber-50 text-amber-700 border-amber-100' },
    low: { label: 'Low Priority', class: 'bg-slate-50 text-slate-500 border-slate-250/15' },
  };

  const pConfig = priorityConfig[todo.priority] || { label: 'Priority', class: 'bg-slate-50 text-slate-400 border-slate-100' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      layout
      whileHover={{ y: -1 }}
    >
      <Card className={`relative overflow-hidden bg-white border-slate-200 transition-all duration-200 ${
        todo.completed ? 'opacity-65 grayscale-[0.2]' : isOverdue ? 'border-red-350 shadow-sm' : 'shadow-sm'
      }`}>
        <CardContent className="p-3 flex gap-4 items-center">
          <div className="flex items-center shrink-0">
            <Checkbox 
              checked={todo.completed} 
              onCheckedChange={() => onToggleComplete(todo.id, todo.completed)}
              className="w-4.5 h-4.5 rounded border-slate-300 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500 cursor-pointer"
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3 mb-1">
              <h4 className={`text-sm font-bold font-heading truncate ${todo.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                {todo.title}
              </h4>
              <div className="flex gap-1 shrink-0">
                {!todo.is_auto_generated && (
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg cursor-pointer" onClick={() => onEdit(todo)}>
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer" onClick={() => onDelete(todo.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            
            {todo.description && (
              <p className="text-xs text-slate-550 mb-2.5 line-clamp-1 font-sans">
                {todo.description}
              </p>
            )}
            
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className={`${isOverdue ? 'bg-red-50 text-red-600 border-red-100' : 'bg-sky-50 text-sky-600 border-sky-100'} flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-bold`}>
                {isOverdue ? <AlertCircle className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                {formatDate(todo.due_date)}
              </Badge>
              
              <Badge variant="outline" className={`${pConfig.class} text-[9px] px-1.5 py-0.5 rounded-full font-bold`}>
                {pConfig.label}
              </Badge>
              
              <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                {todo.source === 'manual' ? <Edit2 className="w-2.5 h-2.5 text-slate-400" /> : <Bot className="w-2.5 h-2.5 text-slate-400" />}
                {todo.source.toUpperCase()}
              </Badge>
              
              {todo.source_course && (
                <Badge variant="outline" className="bg-sky-50 text-sky-600 border-sky-100/55 flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
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
