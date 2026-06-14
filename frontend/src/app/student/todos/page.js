'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { getTodos, createTodo, updateTodo, deleteTodo, getTodoStats } from '@/lib/api';
import TodoCard from '@/components/TodoCard';
import TodoForm from '@/components/TodoForm';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, ListTodo, CheckCircle2, Clock, AlertTriangle, ArrowUpDown } from 'lucide-react';

export default function TodosPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [todos, setTodos] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  
  const [filters, setFilters] = useState({
    completed: null,
    priority: null,
    source: null,
    sort_by: 'due_date',
    sort_order: 'asc'
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (!authLoading && user && user.role !== 'STUDENT') {
      router.push('/login');
    } else if (!authLoading && user) {
      fetchTodos();
      fetchStats();
    }
  }, [user, authLoading, router, filters]);

  const fetchTodos = async () => {
    try {
      setLoading(true);
      const data = await getTodos(filters);
      setTodos(data);
    } catch (err) {
      setError('Failed to load todos');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await getTodoStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const handleToggleComplete = async (todoId, currentStatus) => {
    try {
      await updateTodo(todoId, { completed: !currentStatus });
      fetchTodos();
      fetchStats();
    } catch (err) {
      setError('Failed to update todo status');
    }
  };

  const handleSaveTodo = async (todoData) => {
    try {
      if (editingTodo) {
        await updateTodo(editingTodo.id, todoData);
      } else {
        await createTodo(todoData);
      }
      setIsFormOpen(false);
      setEditingTodo(null);
      fetchTodos();
      fetchStats();
    } catch (err) {
      throw new Error(err.message || 'Failed to save todo');
    }
  };

  const handleEditTodo = (todo) => {
    setEditingTodo(todo);
    setIsFormOpen(true);
  };

  const handleDeleteTodo = async (todoId) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await deleteTodo(todoId);
      fetchTodos();
      fetchStats();
    } catch (err) {
      setError('Failed to delete todo');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 text-sky-500 animate-spin" />
      </div>
    );
  }

  const pendingTodos = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t => t.completed);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 text-slate-800 bg-white min-h-screen font-sans">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <Badge variant="outline" className="bg-sky-50 text-sky-600 border-sky-200 mb-2">
            Workspace
          </Badge>
          <h1 className="text-3xl font-extrabold font-heading text-slate-900 tracking-tight">My Todo Tasks</h1>
          <p className="text-slate-500 mt-1 font-sans">
            Track pending course assignments, study schedules, and exams.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-650 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Tasks" value={stats.total} icon={ListTodo} colorClass="text-sky-600 bg-sky-50 border-sky-100" />
          <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} colorClass="text-sky-750 bg-sky-50 border-sky-100" />
          <StatCard label="Pending" value={stats.pending} icon={Clock} colorClass="text-amber-600 bg-amber-50 border-amber-100" />
          <StatCard label="Overdue" value={stats.overdue} icon={AlertTriangle} colorClass="text-red-650 bg-red-50 border-red-100" />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Filters Panel */}
        <div className="w-full lg:w-64 shrink-0">
          <Card className="border-slate-200 bg-white shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-5 space-y-5">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <ListTodo className="w-4 h-4 text-sky-500" /> Filter Tasks
                </h3>
                
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Status</label>
                    <Select
                      value={filters.completed === null ? 'all' : filters.completed.toString()}
                      onValueChange={(val) => setFilters(f => ({ ...f, completed: val === 'all' ? null : val === 'true' }))}
                    >
                      <SelectTrigger className="h-9 bg-white border-slate-200 text-slate-800">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="false">Pending</SelectItem>
                        <SelectItem value="true">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Priority</label>
                    <Select
                      value={filters.priority || 'all'}
                      onValueChange={(val) => setFilters(f => ({ ...f, priority: val === 'all' ? null : val }))}
                    >
                      <SelectTrigger className="h-9 bg-white border-slate-200 text-slate-800">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Priorities</SelectItem>
                        <SelectItem value="HIGH">High Priority</SelectItem>
                        <SelectItem value="MEDIUM">Medium Priority</SelectItem>
                        <SelectItem value="LOW">Low Priority</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Source</label>
                    <Select
                      value={filters.source || 'all'}
                      onValueChange={(val) => setFilters(f => ({ ...f, source: val === 'all' ? null : val }))}
                    >
                      <SelectTrigger className="h-9 bg-white border-slate-200 text-slate-800">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sources</SelectItem>
                        <SelectItem value="MANUAL">Manual Input</SelectItem>
                        <SelectItem value="ASSIGNMENT">Assignments</SelectItem>
                        <SelectItem value="EXAM">Exams</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="h-px bg-slate-100 w-full" />

              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4 text-sky-500" /> Sort Tasks
                </h3>
                
                <div className="space-y-3">
                  <Select
                    value={filters.sort_by}
                    onValueChange={(val) => setFilters(f => ({ ...f, sort_by: val }))}
                  >
                    <SelectTrigger className="h-9 bg-white border-slate-200 text-slate-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="due_date">Due Date</SelectItem>
                      <SelectItem value="priority">Priority Level</SelectItem>
                      <SelectItem value="created_at">Creation Date</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button 
                    variant="outline" 
                    className="w-full bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 h-9 text-xs font-bold rounded-xl cursor-pointer"
                    onClick={() => setFilters(f => ({ ...f, sort_order: f.sort_order === 'asc' ? 'desc' : 'asc' }))}
                  >
                    {filters.sort_order === 'asc' ? 'Ascending ↑' : 'Descending ↓'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tasks List */}
        <div className="flex-1 min-w-0">
          {loading && todos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-sky-500" />
              Loading tasks...
            </div>
          ) : todos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center border border-slate-200 bg-white shadow-sm rounded-2xl">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2 font-heading">No tasks found</h3>
              <p className="text-slate-500 mb-6 max-w-xs text-xs">You're all caught up! Enjoy your free time or add a new task.</p>
              <Button onClick={() => { setEditingTodo(null); setIsFormOpen(true); }} className="bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl cursor-pointer">
                Create a Task
              </Button>
            </div>
          ) : (
            <div className="w-full flex flex-col space-y-4">
              {/* Tabs and New Task Button */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="bg-slate-100 p-1 flex-1 rounded-xl flex items-center gap-1">
                  {['all', 'pending', 'completed'].map((tab) => {
                    const isActive = activeTab === tab;
                    return (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${
                          isActive 
                            ? 'bg-white text-sky-600 shadow-sm' 
                            : 'text-slate-450 hover:text-slate-700'
                        }`}
                      >
                        {tab === 'all' && 'All Tasks'}
                        {tab === 'pending' && `Pending (${pendingTodos.length})`}
                        {tab === 'completed' && `Completed (${completedTodos.length})`}
                      </button>
                    );
                  })}
                </div>
                
                <Button 
                  onClick={() => { setEditingTodo(null); setIsFormOpen(true); }}
                  className="bg-sky-500 hover:bg-sky-650 text-white gap-2 h-10 px-4 rounded-xl text-xs font-bold shrink-0 cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  New Task
                </Button>
              </div>

              {/* Tab Content */}
              <div className="space-y-3">
                {activeTab === 'all' && (
                  <AnimatePresence mode="popLayout">
                    {todos.map(todo => (
                      <TodoCard key={todo.id} todo={todo} onToggleComplete={handleToggleComplete} onEdit={handleEditTodo} onDelete={handleDeleteTodo} />
                    ))}
                  </AnimatePresence>
                )}
                {activeTab === 'pending' && (
                  <AnimatePresence mode="popLayout">
                    {pendingTodos.map(todo => (
                      <TodoCard key={todo.id} todo={todo} onToggleComplete={handleToggleComplete} onEdit={handleEditTodo} onDelete={handleDeleteTodo} />
                    ))}
                  </AnimatePresence>
                )}
                {activeTab === 'completed' && (
                  <AnimatePresence mode="popLayout">
                    {completedTodos.map(todo => (
                      <TodoCard key={todo.id} todo={todo} onToggleComplete={handleToggleComplete} onEdit={handleEditTodo} onDelete={handleDeleteTodo} />
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <TodoForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTodo(null);
        }}
        onSave={handleSaveTodo}
        initialData={editingTodo}
      />
    </div>
  );
}

function StatCard({ label, value, icon: Icon, colorClass }) {
  return (
    <Card className="border-slate-200 bg-white overflow-hidden shadow-sm">
      <CardContent className="p-3.5 flex items-center gap-3">
        <div className={`p-2.5 rounded-lg border ${colorClass} shrink-0`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
          <p className="text-xl font-extrabold text-slate-800 font-mono font-heading leading-tight mt-0.5">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
