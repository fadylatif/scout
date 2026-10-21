import { useState, useEffect, useCallback } from 'react';
import {
  CheckSquare,
  Plus,
  Clock,
  AlertTriangle,
  ChevronDown,
  Trash2,
  MessageCircle,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { tasksApi } from '../../api/tasks';
import type { Task, TaskPriority, TaskStatus } from '../../types/modules';

// ─── Constants ───────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; icon: React.ReactNode }> = {
  URGENT: { label: 'عاجلة جداً', color: 'text-red-400 bg-red-400/10 border-red-400/30', icon: <AlertTriangle className="w-3 h-3" /> },
  HIGH:   { label: 'عالية',      color: 'text-orange-400 bg-orange-400/10 border-orange-400/30', icon: <ChevronDown className="w-3 h-3 rotate-180" /> },
  MEDIUM: { label: 'متوسطة',    color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30', icon: <ChevronDown className="w-3 h-3" /> },
  LOW:    { label: 'منخفضة',    color: 'text-green-400 bg-green-400/10 border-green-400/30', icon: <ChevronDown className="w-3 h-3" /> },
};

const STATUS_CONFIG: Record<TaskStatus, { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'gold' | 'info' }> = {
  TODO:        { label: 'قيد الانتظار', variant: 'default' },
  IN_PROGRESS: { label: 'جارٍ التنفيذ', variant: 'info' },
  REVIEW:      { label: 'في المراجعة',  variant: 'warning' },
  DONE:        { label: 'مكتمل',        variant: 'success' },
  CANCELLED:   { label: 'ملغى',         variant: 'error' },
};

const STATUS_COLUMNS: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];

function formatDeadline(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.ceil(diff / 86400000);
  if (days < 0) return { text: `متأخر ${Math.abs(days)} يوم`, danger: true };
  if (days === 0) return { text: 'اليوم', danger: true };
  if (days === 1) return { text: 'غداً', danger: false };
  return { text: `${days} أيام`, danger: false };
}

// ─── Task Card ───────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: Task;
  onClick: () => void;
  onStatusChange: (id: string, status: TaskStatus) => void;
}

function TaskCard({ task, onClick, onStatusChange }: TaskCardProps) {
  const pconf = PRIORITY_CONFIG[task.priority];
  const deadline = formatDeadline(task.deadline);

  return (
    <div
      onClick={onClick}
      className="bg-surface border border-border rounded-xl p-3 cursor-pointer hover:border-gold-400/30 hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-semibold text-text-primary leading-snug group-hover:text-gold-400 transition-colors">
          {task.title}
        </p>
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md border shrink-0 ${pconf.color}`}>
          {pconf.icon}
          {pconf.label}
        </span>
      </div>
      {task.description && (
        <p className="text-xs text-text-muted line-clamp-2 mb-2">{task.description}</p>
      )}
      <div className="flex items-center justify-between mt-2 flex-wrap gap-1.5">
        <select
          value={task.status}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onStatusChange(task.id, e.target.value as TaskStatus)}
          className="text-[10px] bg-surface-3 border border-border rounded-lg px-1.5 py-1 text-text-secondary focus:outline-none"
        >
          {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
            <option key={val} value={val}>{cfg.label}</option>
          ))}
        </select>
        {deadline && (
          <span className={`flex items-center gap-1 text-[10px] font-semibold ${deadline.danger ? 'text-red-400' : 'text-text-muted'}`}>
            <Clock className="w-3 h-3" />
            {deadline.text}
          </span>
        )}
        {(task.comments?.length ?? 0) > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-text-muted">
            <MessageCircle className="w-3 h-3" />
            {task.comments!.length}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Create Modal ─────────────────────────────────────────────────────────────

interface CreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

function CreateTaskModal({ open, onClose, onCreated }: CreateModalProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', priority: 'MEDIUM' as TaskPriority, deadline: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) return;
    setLoading(true);
    try {
      await tasksApi.create({
        title: form.title,
        description: form.description,
        priority: form.priority,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : undefined,
      });
      onCreated();
      onClose();
      setForm({ title: '', description: '', priority: 'MEDIUM', deadline: '' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="مهمة جديدة">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="عنوان المهمة"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          required
          placeholder="مثال: مراجعة سجلات الحضور"
        />
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1.5">الوصف</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
            className="w-full bg-surface-3 border border-border rounded-xl px-3 py-2 text-sm text-text-primary resize-none focus:outline-none focus:border-gold-400"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">الأولوية</label>
            <select
              value={form.priority}
              onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))}
              className="w-full bg-surface-3 border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold-400"
            >
              {Object.entries(PRIORITY_CONFIG).map(([val, cfg]) => (
                <option key={val} value={val}>{cfg.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">الموعد النهائي</label>
            <input
              type="datetime-local"
              value={form.deadline}
              onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
              className="w-full bg-surface-3 border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold-400"
            />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} className="flex-1">إلغاء</Button>
          <Button type="submit" variant="primary" loading={loading} className="flex-1">
            <Plus className="w-4 h-4" />
            إنشاء المهمة
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<string>('ALL');
  const [newComment, setNewComment] = useState('');
  const [commenting, setCommenting] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await tasksApi.list();
      setTasks(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleStatusChange = async (id: string, newStatus: TaskStatus) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: newStatus } : t));
    await tasksApi.update(id, { status: newStatus });
  };

  const handleAddComment = async () => {
    if (!selectedTask || !newComment.trim()) return;
    setCommenting(true);
    try {
      const res = await tasksApi.addComment(selectedTask.id, newComment);
      setSelectedTask((prev) =>
        prev ? { ...prev, comments: [...(prev.comments ?? []), res.data] } : prev
      );
      setNewComment('');
    } finally {
      setCommenting(false);
    }
  };

  const filtered = filter === 'ALL' ? tasks : tasks.filter((t) => t.priority === filter);

  const getTasksByStatus = (status: TaskStatus) =>
    filtered.filter((t) => t.status === status);

  const statCounts = {
    total: tasks.length,
    done: tasks.filter((t) => t.status === 'DONE').length,
    urgent: tasks.filter((t) => t.priority === 'URGENT' && t.status !== 'DONE').length,
    overdue: tasks.filter((t) => t.deadline && new Date(t.deadline) < new Date() && t.status !== 'DONE').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-text-primary flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-gold-400" />
            لوحة المهام
          </h1>
          <p className="text-text-muted text-sm mt-1">إدارة المهام والمتابعة اليومية</p>
        </div>
        <Button variant="primary" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" />
          مهمة جديدة
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'إجمالي المهام', value: statCounts.total, color: 'text-text-primary' },
          { label: 'مكتمل', value: statCounts.done, color: 'text-green-400' },
          { label: 'عاجلة', value: statCounts.urgent, color: 'text-red-400' },
          { label: 'متأخرة', value: statCounts.overdue, color: 'text-orange-400' },
        ].map((s) => (
          <Card key={s.label} className="!p-0">
            <CardContent>
              <p className="text-text-muted text-xs mt-3 mb-1">{s.label}</p>
              <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Priority filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-text-muted" />
        {['ALL', ...Object.keys(PRIORITY_CONFIG)].map((p) => (
          <button
            key={p}
            onClick={() => setFilter(p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              filter === p
                ? 'bg-gold-400/15 text-gold-400 border-gold-400/30'
                : 'bg-surface text-text-muted border-border hover:bg-surface-3'
            }`}
          >
            {p === 'ALL' ? 'الكل' : PRIORITY_CONFIG[p as TaskPriority].label}
          </button>
        ))}
      </div>

      {/* Kanban board */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {STATUS_COLUMNS.map((status) => {
            const col = STATUS_CONFIG[status];
            const colTasks = getTasksByStatus(status);
            return (
              <div key={status} className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant={col.variant}>{col.label}</Badge>
                  <span className="text-xs text-text-muted bg-surface-3 px-1.5 py-0.5 rounded-full font-bold">
                    {colTasks.length}
                  </span>
                </div>
                <div className="space-y-2 min-h-[120px]">
                  {colTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onClick={() => setSelectedTask(task)}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                  {colTasks.length === 0 && (
                    <div className="h-20 border-2 border-dashed border-border rounded-xl flex items-center justify-center text-xs text-text-muted">
                      لا مهام
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task detail modal */}
      {selectedTask && (
        <Modal open={!!selectedTask} onClose={() => setSelectedTask(null)} title={selectedTask.title} size="lg">
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={STATUS_CONFIG[selectedTask.status].variant}>
                {STATUS_CONFIG[selectedTask.status].label}
              </Badge>
              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg border ${PRIORITY_CONFIG[selectedTask.priority].color}`}>
                {PRIORITY_CONFIG[selectedTask.priority].label}
              </span>
              {selectedTask.deadline && (
                <span className="flex items-center gap-1 text-xs text-text-muted">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(selectedTask.deadline).toLocaleDateString('ar-EG')}
                </span>
              )}
            </div>

            {selectedTask.description && (
              <p className="text-sm text-text-secondary">{selectedTask.description}</p>
            )}

            {/* Comments */}
            <div>
              <p className="text-xs font-bold text-text-muted mb-2">
                التعليقات ({selectedTask.comments?.length ?? 0})
              </p>
              {(selectedTask.comments ?? []).length > 0 && (
                <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                  {selectedTask.comments!.map((c) => (
                    <div key={c.id} className="bg-surface-3 rounded-xl p-2.5">
                      <p className="text-xs font-semibold text-text-primary">{c.user_name ?? 'قائد'}</p>
                      <p className="text-sm text-text-secondary mt-0.5">{c.text}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                  placeholder="أضف تعليقاً..."
                  className="flex-1 bg-surface-3 border border-border rounded-xl px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-gold-400"
                />
                <Button variant="primary" size="sm" onClick={handleAddComment} loading={commenting}>
                  <MessageCircle className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Status change */}
            <div className="flex gap-2 flex-wrap pt-2 border-t border-border">
              {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                <button
                  key={val}
                  onClick={async () => {
                    await handleStatusChange(selectedTask.id, val as TaskStatus);
                    setSelectedTask((prev) => prev ? { ...prev, status: val as TaskStatus } : prev);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    selectedTask.status === val
                      ? 'bg-gold-400/15 text-gold-400 border-gold-400/30'
                      : 'bg-surface-3 text-text-muted border-border hover:bg-surface'
                  }`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}

      <CreateTaskModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={fetchTasks}
      />
    </div>
  );
}
