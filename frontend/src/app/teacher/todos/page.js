'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { getTodos, createTodo, updateTodo, deleteTodo, getTodoStats } from '@/lib/api';
import TodoCard from '@/components/TodoCard';
import TodoForm from '@/components/TodoForm';
import AnimatedTabs from '@/components/ui/animated-tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, ListTodo, CheckCircle2, Clock, AlertTriangle, ArrowUpDown } from 'lucide-react';
import { glassCardVariants, filterPanelVariants, spacingVariants, typographyVariants } from '@/lib/componentVariants';

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
    } else if (!authLoading && user && user.role !== 'TEACHER') {
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
      </div>
    );
  }

  const pendingTodos = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t => t.completed);

  return (
    <div className="p-4 max-w-7xl mx-auto min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={spacingVariants.default.spaceY}
      >
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="badge-violet text-xs">Tasks & Assignments</Badge>
            </div>
            <h1 className={`${typographyVariants.default.pageTitle} font-bold tracking-tight text-white font-heading`}>
              My Workspace
            </h1>
            <p className="text-slate-400 mt-1 text-sm">
              Track your pending assignments, exams, and personal tasks.
            </p>
          </div>
        </div>

        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4" />
            {error}
          </motion.div>
        )}

        {/* Stats Row */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <StatCard label="Total Tasks" value={stats.total} icon={ListTodo} colorClass="text-indigo-400 bg-indigo-500/10 border-indigo-500/20" />
            <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} colorClass="text-emerald-400 bg-emerald-500/10 border-emerald-500/20" />
            <StatCard label="Pending" value={stats.pending} icon={Clock} colorClass="text-amber-400 bg-amber-500/10 border-amber-500/20" />
            <StatCard label="Overdue" value={stats.overdue} icon={AlertTriangle} colorClass="text-rose-400 bg-rose-500/10 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]" />
          </div>
        )}

        {/* Main Content Area */}
        <div className={`flex flex-col lg:flex-row ${spacingVariants.default.sectionGap}`}>
          
          {/* Left Column - Filters Panel */}
          <div className={filterPanelVariants({ size: 'default' })}>
            <Card className={glassCardVariants({ size: 'default' })}>
              <CardContent className="p-3.5 space-y-4">
                <div>
                  <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <ListTodo className="w-3.5 h-3.5 text-violet-400" /> Filter Tasks
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Status</label>
                      <Select
                        value={filters.completed === null ? 'all' : filters.completed.toString()}
                        onValueChange={(val) => setFilters(f => ({ ...f, completed: val === 'all' ? null : val === 'true' }))}
                      >
                        <SelectTrigger className="h-8 text-xs">
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
                      <label className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Priority</label>
                      <Select
                        value={filters.priority || 'all'}
                        onValueChange={(val) => setFilters(f => ({ ...f, priority: val === 'all' ? null : val }))}
                      >
                        <SelectTrigger className="h-8 text-xs">
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
                      <label className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Source</label>
                      <Select
                        value={filters.source || 'all'}
                        onValueChange={(val) => setFilters(f => ({ ...f, source: val === 'all' ? null : val }))}
                      >
                        <SelectTrigger className="h-8 text-xs">
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

                <div className="h-px bg-white/10 w-full" />

                <div>
                  <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" /> Sort Tasks
                  </h3>
                  
                  <div className="space-y-3">
                    <Select
                      value={filters.sort_by}
                      onValueChange={(val) => setFilters(f => ({ ...f, sort_by: val }))}
                    >
                      <SelectTrigger className="h-8 text-xs">
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
                      className="w-full bg-white/5 border-white/10 text-slate-300 hover:text-white hover:bg-white/10 h-8 text-xs"
                      onClick={() => setFilters(f => ({ ...f, sort_order: f.sort_order === 'asc' ? 'desc' : 'asc' }))}
                    >
                      {filters.sort_order === 'asc' ? 'Ascending ↑' : 'Descending ↓'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Tasks List with Animated Tabs */}
          <div className="flex-1 min-w-0">
            {loading && todos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-violet-500" />
                Loading tasks...
              </div>
            ) : todos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center glass-card border-white/5 rounded-2xl">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-slate-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No tasks found</h3>
                <p className="text-slate-400 mb-6">You're all caught up! Enjoy your free time or add a new task.</p>
                <Button onClick={() => { setEditingTodo(null); setIsFormOpen(true); }} className="bg-violet-600 hover:bg-violet-500">
                  Create a Task
                </Button>
              </div>
            ) : (
              <div className="w-full flex flex-col">
                {/* Tabs and New Task Button - Separate Components */}
                <div className="flex items-center gap-3 mb-5">
                  {/* Tabs Component */}
                  <div className="bg-white/5 border border-white/10 p-1 h-11 flex-1 rounded-xl flex items-center gap-1 relative">
                    {/* Animated background indicator */}
                    {['all', 'pending', 'completed'].map((tab, index) => {
                      if (tab === activeTab) {
                        return (
                          <motion.div
                            key="active-tab-bg"
                            layoutId="active-tab-bg"
                            className="absolute inset-y-1 bg-gradient-to-r from-violet-500/15 to-indigo-500/15 border border-violet-500/25 rounded-lg shadow-[0_0_20px_rgba(139,92,246,0.1)]"
                            initial={false}
                            transition={{ 
                              type: "spring", 
                              stiffness: 400, 
                              damping: 35,
                              mass: 0.8
                            }}
                            style={{
                              left: `calc(${index * 33.33}% + 4px)`,
                              width: 'calc(33.33% - 8px)',
                              willChange: 'transform'
                            }}
                          />
                        );
                      }
                      return null;
                    })}
                    
                    {/* Tab Buttons */}
                    <button
                      onClick={() => setActiveTab('all')}
                      className={`flex-1 relative z-10 h-9 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'all' ? 'text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      All Tasks
                    </button>
                    <button
                      onClick={() => setActiveTab('pending')}
                      className={`flex-1 relative z-10 h-9 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'pending' ? 'text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Pending ({pendingTodos.length})
                    </button>
                    <button
                      onClick={() => setActiveTab('completed')}
                      className={`flex-1 relative z-10 h-9 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'completed' ? 'text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Completed ({completedTodos.length})
                    </button>
                  </div>
                  
                  {/* New Task Button - Separate Component */}
                  <Button 
                    onClick={() => { setEditingTodo(null); setIsFormOpen(true); }}
                    className="bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_15px_rgba(124,58,237,0.3)] gap-1.5 h-11 px-4 rounded-xl text-sm shrink-0"
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
      </motion.div>

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

// Subcomponents
function StatCard({ label, value, icon: Icon, colorClass }) {
  return (
    <Card className="glass-card border-white/5 bg-white/5 overflow-hidden group">
      <CardContent className="p-2.5 flex items-center gap-2.5">
        <div className={`p-1.5 rounded-lg border transition-transform group-hover:scale-110 ${colorClass}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
          <p className="text-lg font-bold text-white font-heading">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
