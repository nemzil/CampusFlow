path = r'src\app\teacher\assignments\page.js'
p5 = r"""
      {/* ── Manual Modal ── */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-[#0a0b14]/95 border border-white/10 rounded-xl overflow-hidden shadow-2xl">
            <div className={`h-1 ${activeTab === 'ASSIGNMENT' ? 'bg-violet-600' : 'bg-indigo-600'}`} />
            <div className="p-5 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <PenLine className="w-4 h-4 text-violet-400" />
                    <h3 className="font-heading font-bold text-base">{editingAssignment ? 'Edit' : 'Create'} {activeTab === 'ASSIGNMENT' ? 'Assignment' : 'Quiz'}</h3>
                  </div>
                  <p className="text-[10px] text-slate-500">Fill in the details manually</p>
                </div>
                <button onClick={() => setShowManualModal(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <form onSubmit={handleManualSubmit} className="space-y-3.5 text-xs">
                {!editingAssignment && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Number (Max Marks)</label>
                    <select value={manualForm.number} onChange={e => setManualForm({ ...manualForm, number: parseInt(e.target.value) })}
                      className="w-full h-9 rounded-lg bg-black/40 border border-white/10 px-3 text-xs text-white">
                      <option value={1}>1 — 3 marks</option>
                      <option value={2}>2 — 3 marks</option>
                      <option value={3}>3 — 4 marks</option>
                    </select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Title</label>
                  <Input required value={manualForm.title} onChange={e => setManualForm({ ...manualForm, title: e.target.value })}
                    placeholder="e.g. Variables and Data Types" className="h-9 bg-black/40 border-white/10 text-white" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Questions / Instructions</label>
                  <textarea required value={manualForm.description} onChange={e => setManualForm({ ...manualForm, description: e.target.value })}
                    placeholder="Q1. Write a program that...&#10;Q2. Explain the concept of..."
                    className="w-full h-28 rounded-lg bg-black/40 border border-white/10 p-3 text-xs text-white resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Deadline</label>
                    <input type="datetime-local" required value={manualForm.deadline} onChange={e => setManualForm({ ...manualForm, deadline: e.target.value })}
                      className="w-full h-9 rounded-lg bg-black/40 border border-white/10 px-3 text-xs text-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Status</label>
                    <select value={manualForm.status} onChange={e => setManualForm({ ...manualForm, status: e.target.value })}
                      className="w-full h-9 rounded-lg bg-black/40 border border-white/10 px-3 text-xs text-white">
                      <option value="DRAFT">DRAFT</option>
                      <option value="PUBLISHED">PUBLISHED</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2.5 pt-1">
                  <Button type="button" variant="ghost" onClick={() => setShowManualModal(false)} className="h-8 text-xs border border-white/5">Cancel</Button>
                  <Button type="submit" disabled={submitting} className={`h-8 text-xs text-white font-semibold ${activeTab === 'ASSIGNMENT' ? 'bg-violet-600 hover:bg-violet-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}>
                    {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (editingAssignment ? 'Save Changes' : 'Create')}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
"""
with open(path, 'a', encoding='utf-8') as f:
    f.write(p5)
print('p5 ok')
