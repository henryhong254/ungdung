"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { WORK_TYPES, WORK_TYPE_COLORS, ALL_PRODUCTS } from "@/lib/constants";
import { useSession } from "next-auth/react";
import { api } from "@/lib/api";
import ItemEditModal from "@/app/components/ItemEditModal";

interface User { id: string; name: string; }

interface Idea {
  id: string; title: string; description: string | null;
  product: string | null; workType: string | null;
  scheduledFor: string | null; done: boolean;
  assignedTo: User | null; order: number;
}

interface Task {
  id: string; title: string; description: string | null;
  workType: string | null; scheduledFor: string | null;
  done: boolean; assignedTo: User | null; order: number;
}

function getWeekDays(offset = 0) {
  const now = new Date();
  const mon = new Date(now);
  mon.setDate(now.getDate() - now.getDay() + 1 + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon); d.setDate(mon.getDate() + i); return d;
  });
}
function isoDate(d: Date) { return d.toISOString().slice(0, 10); }
function dayLabel(d: Date) {
  return d.toLocaleDateString("vi-VN", { weekday: "short", day: "numeric", month: "numeric" });
}
function isToday(d: Date) { return isoDate(d) === isoDate(new Date()); }
const wt = (key: string | null) => key ? WORK_TYPE_COLORS[key] : null;

// ---- Droppable IDs ----
// "backlog"         → ideas panel (unscheduled ideas)
// "day-YYYY-MM-DD"  → day column (scheduled ideas)
// "tasks-YYYY-MM-DD"→ day column tasks section

export default function PlanPage() {
  const { data: session } = useSession();
  const isExpert = (session?.user as any)?.role === "expert";

  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const weekDays = getWeekDays(weekOffset);

  const currentUserId = (session?.user as any)?.id || "";
  const [search, setSearch] = useState("");
  const [filterWorkType, setFilterWorkType] = useState("");
  // Mặc định lọc theo người đang đăng nhập
  const [filterUserId, setFilterUserId] = useState(currentUserId);
  const [filterDone, setFilterDone] = useState<"all" | "todo" | "done">("all");
  const hasFilter = !!(search || filterWorkType || filterUserId !== currentUserId || filterDone !== "all");

  function matchesFilter(item: { title: string; workType: string | null; done: boolean; assignedTo: User | null }) {
    if (search && !item.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterWorkType && item.workType !== filterWorkType) return false;
    // Assistant: always filter to self; Expert: filter only if a specific user is selected
    const effectiveUserId = isExpert ? filterUserId : currentUserId;
    if (effectiveUserId) {
      // Khi lọc theo người: item không có assignee (cũ/chưa gán) thì vẫn hiện khi đang xem chủ sở hữu
      const assignedId = item.assignedTo?.id ?? null;
      if (assignedId !== effectiveUserId && assignedId !== null) return false;
    }
    if (filterDone === "todo" && item.done) return false;
    if (filterDone === "done" && !item.done) return false;
    return true;
  }

  // Idea form
  const [showIdeaForm, setShowIdeaForm] = useState(false);
  const [ideaForm, setIdeaForm] = useState({ title: "", description: "", product: "", workType: "" });

  // Edit idea/task — shared modal
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [editIdeaForm, setEditIdeaForm] = useState({ title: "", description: "", workType: "", assignedToId: "" });
  const [savingEditIdea, setSavingEditIdea] = useState(false);
  const [editIdeaError, setEditIdeaError] = useState("");
  // unified edit item for shared modal
  type EditItem = (Idea & { _type: "idea" }) | (Task & { _type: "task" });
  const [editItem, setEditItem] = useState<EditItem | null>(null);

  // Task form (from day column)
  const emptyTaskForm = { title: "", description: "", workType: "", assignedToId: currentUserId };
  const [showTaskForm, setShowTaskForm] = useState<string | null>(null); // "YYYY-MM-DD"
  const [taskForm, setTaskForm] = useState(emptyTaskForm);
  const [savingTask, setSavingTask] = useState(false);
  const [taskError, setTaskError] = useState("");

  // Edit task
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTaskForm, setEditTaskForm] = useState({ title: "", description: "", workType: "", assignedToId: "" });
  const [savingEditTask, setSavingEditTask] = useState(false);
  const [editTaskError, setEditTaskError] = useState("");

  const [assignModal, setAssignModal] = useState<{ id: string; type: "idea" | "task"; date: string } | null>(null);

  // ---- Timer ----
  interface TimerEntry { id: string; product: string; workType: string; note: string | null; startedAt: string; ideaId?: string | null; idea?: { id: string; title: string } | null; }
  const [timerRunning, setTimerRunning] = useState<TimerEntry | null>(null);
  const [timerElapsed, setTimerElapsed] = useState(0);
  const [showTimerForm, setShowTimerForm] = useState(false);
  const [timerForm, setTimerForm] = useState({ product: "Chung (không gắn sản phẩm)", workType: "", note: "" });
  const timerInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadTimer = useCallback(() => {
    return api("/api/time")
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((data: TimerEntry[]) => {
        const active = data.find((e: any) => !e.stoppedAt);
        if (active) {
          setTimerRunning(active);
          setTimerElapsed(Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 1000));
        } else {
          setTimerRunning(null);
          setTimerElapsed(0);
        }
      })
      .catch(() => { /* timer load failed silently */ });
  }, []);

  useEffect(() => { loadTimer(); }, [loadTimer]);

  useEffect(() => {
    if (timerRunning) {
      timerInterval.current = setInterval(() => setTimerElapsed(e => e + 1), 1000);
    } else {
      if (timerInterval.current) clearInterval(timerInterval.current);
    }
    return () => { if (timerInterval.current) clearInterval(timerInterval.current); };
  }, [timerRunning]);

  function fmtTimer(s: number) {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  }

  async function startTimer(workType?: string) {
    await api("/api/time", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product: timerForm.product, workType: workType || timerForm.workType || WORK_TYPES[0].value, note: timerForm.note || null }),
    });
    setShowTimerForm(false);
    setTimerElapsed(0);
    loadTimer();
  }

  async function stopTimer() {
    if (!timerRunning) return;
    await api(`/api/time/${timerRunning.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    loadTimer();
  }

  function quickStartTimer(workType: string, ideaId?: string) {
    setTimerForm(f => ({ ...f, workType }));
    startTimerForIdea(workType, ideaId);
  }

  async function startTimerForIdea(workType: string, ideaId?: string, note?: string) {
    // Stop existing timer first
    if (timerRunning) {
      await api(`/api/time/${timerRunning.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    }
    const wt = workType || WORK_TYPES[0].value;
    const res = await api("/api/time", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product: timerForm.product || "Chung (không gắn sản phẩm)",
        workType: wt,
        note: note || timerForm.note || null,
        ideaId: ideaId || null,
      }),
    });
    if (!res.ok) {
      console.error("Timer POST failed:", res.status, res.statusText, await res.text());
      return;
    }
    setTimerElapsed(0);
    await loadTimer();
  }

  const load = useCallback(() => {
    const days = getWeekDays(weekOffset);
    const from = isoDate(days[0]);
    const to = isoDate(days[6]);
    Promise.all([
      api(`/api/ideas?unscheduled=true`).then(r => r.ok ? r.json() : []),
      api(`/api/ideas?from=${from}&to=${to}`).then(r => r.ok ? r.json() : []),
      api(`/api/tasks?from=${from}&to=${to}`).then(r => r.ok ? r.json() : []),
      api("/api/users").then(r => r.ok ? r.json() : []),
    ]).then(([unscheduled, scheduled, t, u]) => {
      setIdeas([...(Array.isArray(unscheduled) ? unscheduled : []), ...(Array.isArray(scheduled) ? scheduled : [])]);
      setTasks(Array.isArray(t) ? t : []);
      setUsers(Array.isArray(u) ? u : []);
    });
  }, [weekOffset]);

  useEffect(() => { load(); }, [load]);

  // Khi session load xong, set filter + task form mặc định theo user hiện tại
  useEffect(() => {
    if (currentUserId) {
      setFilterUserId((id: string) => id === "" ? currentUserId : id);
      setTaskForm(f => f.assignedToId === "" ? { ...f, assignedToId: currentUserId } : f);
    }
  }, [currentUserId]);

  // ---- Ideas ----
  async function addIdea(e: React.FormEvent) {
    e.preventDefault();
    await api("/api/ideas", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...ideaForm, workType: ideaForm.workType || null }),
    });
    setIdeaForm({ title: "", description: "", product: "", workType: "" });
    setShowIdeaForm(false);
    load();
  }

  function openEditIdea(idea: Idea) {
    setEditItem({ ...idea, _type: "idea" });
  }

  async function saveEditIdea(e: React.FormEvent) {
    e.preventDefault();
    if (!editingIdea) return;
    setSavingEditIdea(true); setEditIdeaError("");
    try {
      const res = await api(`/api/ideas/${editingIdea.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editIdeaForm.title,
          description: editIdeaForm.description || null,
          workType: editIdeaForm.workType || null,
          assignedToId: editIdeaForm.assignedToId || null,
        }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); setEditIdeaError(err.error || "Lỗi khi lưu"); return; }
      setEditingIdea(null); load();
    } catch { setEditIdeaError("Không kết nối được server"); }
    finally { setSavingEditIdea(false); }
  }

  async function toggleIdeaDone(idea: Idea) {
    await api(`/api/ideas/${idea.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !idea.done }),
    });
    load();
  }

  async function deleteIdea(id: string) {
    await api(`/api/ideas/${id}`, { method: "DELETE" });
    setEditingIdea(null); load();
  }

  async function scheduleIdea(ideaId: string, date: string | null, assignedToId?: string) {
    await api(`/api/ideas/${ideaId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledFor: date, assignedToId: assignedToId ?? undefined }),
    });
    setAssignModal(null); load();
  }

  // ---- Tasks ----
  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!showTaskForm) return;
    setSavingTask(true); setTaskError("");
    try {
      const res = await api("/api/tasks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...taskForm, scheduledFor: showTaskForm }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); setTaskError(err.error || "Lỗi khi lưu"); return; }
      setTaskForm({ ...emptyTaskForm, assignedToId: currentUserId }); setShowTaskForm(null); load();
    } catch { setTaskError("Không kết nối được server"); }
    finally { setSavingTask(false); }
  }

  function openEditTask(task: Task) {
    setEditItem({ ...task, _type: "task" });
  }

  async function saveEditTask(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTask) return;
    setSavingEditTask(true); setEditTaskError("");
    try {
      const res = await api(`/api/tasks/${editingTask.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTaskForm.title,
          description: editTaskForm.description || null,
          workType: editTaskForm.workType || null,
          assignedToId: editTaskForm.assignedToId || null,
        }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); setEditTaskError(err.error || "Lỗi khi lưu"); return; }
      setEditingTask(null); load();
    } catch { setEditTaskError("Không kết nối được server"); }
    finally { setSavingEditTask(false); }
  }

  async function toggleTaskDone(task: Task) {
    await api(`/api/tasks/${task.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !task.done }),
    });
    load();
  }

  async function deleteTask(id: string) {
    await api(`/api/tasks/${id}`, { method: "DELETE" });
    setEditingTask(null); load();
  }

  async function scheduleTask(taskId: string, date: string, assignedToId?: string) {
    await api(`/api/tasks/${taskId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledFor: date, assignedToId: assignedToId ?? undefined }),
    });
    setAssignModal(null); load();
  }

  // ---- Drag & Drop ----
  async function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    const { draggableId, source, destination } = result;
    const srcId = source.droppableId;
    const destId = destination.droppableId;

    // idea dragged
    if (draggableId.startsWith("idea-")) {
      const ideaId = draggableId.replace("idea-", "");
      if (destId === "backlog" || destId === "backlog-mobile") {
        await scheduleIdea(ideaId, null);
      } else if (destId.startsWith("day-")) {
        const date = destId.replace("day-", "");
        if (users.length > 1) setAssignModal({ id: ideaId, type: "idea", date });
        else await scheduleIdea(ideaId, date, users[0]?.id);
      }
    }

    // task dragged
    if (draggableId.startsWith("task-")) {
      const taskId = draggableId.replace("task-", "");
      const destDate = destId.replace("day-", "");
      const srcDate = srcId.replace("day-", "");

      if (srcDate === destDate) {
        // Reorder trong cùng 1 ngày — cập nhật order cho tất cả task trong ngày đó
        const day = weekDays.find(d => isoDate(d) === destDate);
        if (!day) return;
        const dayTaskList = tasksForDay(day);
        const reordered = [...dayTaskList];
        const fromIdx = reordered.findIndex(t => t.id === taskId);
        // destination.index tính cả ideas, trừ đi số ideas trong ngày
        const ideasCount = ideasForDay(day).length;
        const toIdx = destination.index - ideasCount;
        if (fromIdx === -1 || toIdx < 0) return;
        const [moved] = reordered.splice(fromIdx, 1);
        reordered.splice(toIdx, 0, moved);
        // Optimistic update
        setTasks(prev => {
          const others = prev.filter(t => !reordered.find(r => r.id === t.id));
          return [...others, ...reordered.map((t, i) => ({ ...t, order: i }))];
        });
        // Persist order
        await Promise.all(reordered.map((t, i) =>
          api(`/api/tasks/${t.id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order: i }),
          })
        ));
      } else {
        // Chuyển sang ngày khác
        await scheduleTask(taskId, destDate);
      }
    }
  }

  const unscheduledIdeas = ideas.filter(i => !i.scheduledFor && matchesFilter(i));
  const ideasForDay = (date: Date) =>
    ideas.filter(i => i.scheduledFor && isoDate(new Date(i.scheduledFor)) === isoDate(date) && matchesFilter(i));
  const tasksForDay = (date: Date) =>
    tasks
      .filter(t => t.scheduledFor && isoDate(new Date(t.scheduledFor)) === isoDate(date) && matchesFilter(t))
      .sort((a, b) => a.order - b.order);

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-lg md:text-xl font-semibold">Kế hoạch</h1>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setWeekOffset(w => w - 1)} className="px-2 py-1 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">←</button>
          <button onClick={() => setWeekOffset(0)} className="px-2 md:px-3 py-1 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Tuần này</button>
          <button onClick={() => setWeekOffset(w => w + 1)} className="px-2 py-1 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">→</button>
        </div>
      </div>

      {/* Mini timer bar */}
      <div className="shrink-0">
        {timerRunning ? (
          <div className="flex items-center gap-3 bg-blue-600 text-white rounded-xl px-4 py-2.5">
            <span className="text-xs opacity-80">⏱ Đang chạy</span>
            <span className="font-mono font-semibold text-sm tracking-wider">{fmtTimer(timerElapsed)}</span>
            <span className="text-xs opacity-80 flex-1 truncate">
              {WORK_TYPES.find(w => w.value === timerRunning.workType)?.label}
              {timerRunning.note && ` · ${timerRunning.note}`}
            </span>
            <button onClick={stopTimer} className="shrink-0 bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1 rounded-lg transition-colors">
              ⏹ Dừng
            </button>
          </div>
        ) : (
          <div>
            {!showTimerForm ? (
              <button onClick={() => setShowTimerForm(true)} className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl border transition-colors" style={{ borderColor: "var(--border-dark)", color: "var(--cream-muted)" }}>
                <span>⏱</span> Bắt đầu bấm giờ
              </button>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-3 flex flex-wrap gap-2 items-end">
                <div className="flex-1 min-w-32">
                  <label className="text-xs text-gray-500 block mb-1">Loại công việc</label>
                  <select className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" value={timerForm.workType} onChange={e => setTimerForm(f => ({ ...f, workType: e.target.value }))}>
                    <option value="">-- Chọn --</option>
                    {WORK_TYPES.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                  </select>
                </div>
                <div className="flex-1 min-w-40">
                  <label className="text-xs text-gray-500 block mb-1">Ghi chú (tuỳ chọn)</label>
                  <input className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" placeholder="Đang làm gì..." value={timerForm.note} onChange={e => setTimerForm(f => ({ ...f, note: e.target.value }))} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowTimerForm(false)} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">Hủy</button>
                  <button onClick={() => startTimer()} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">▶ Bắt đầu</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter bar */}
      <div className="plan-filter flex flex-wrap gap-2 shrink-0">
        <div className="relative flex-1 min-w-32">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm kiếm..."
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-300 pr-7"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 text-xs">✕</button>
          )}
        </div>
        <select
          value={filterWorkType}
          onChange={e => setFilterWorkType(e.target.value)}
          className={`border rounded-lg px-2.5 py-1.5 text-sm outline-none ${filterWorkType ? "border-blue-300 bg-blue-50 text-blue-700" : "border-gray-200"}`}
        >
          <option value="">Loại CV</option>
          {WORK_TYPES.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
        </select>
        {isExpert && users.length > 1 && (
          <select
            value={filterUserId}
            onChange={e => setFilterUserId(e.target.value)}
            className={`border rounded-lg px-2.5 py-1.5 text-sm outline-none ${filterUserId !== currentUserId ? "border-blue-300 bg-blue-50 text-blue-700" : "border-gray-200"}`}
          >
            <option value="">Tất cả</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name === users.find(x => x.id === currentUserId)?.name ? `${u.name} (tôi)` : u.name}</option>)}
          </select>
        )}
        <select
          value={filterDone}
          onChange={e => setFilterDone(e.target.value as any)}
          className={`border rounded-lg px-2.5 py-1.5 text-sm outline-none ${filterDone !== "all" ? "border-blue-300 bg-blue-50 text-blue-700" : "border-gray-200"}`}
        >
          <option value="all">Tất cả</option>
          <option value="todo">Chưa xong</option>
          <option value="done">Đã xong</option>
        </select>
        {hasFilter && (
          <button
            onClick={() => { setSearch(""); setFilterWorkType(""); setFilterUserId(currentUserId); setFilterDone("all"); }}
            className="text-xs text-gray-400 hover:text-gray-600 px-2"
          >
            Xóa lọc
          </button>
        )}
      </div>


      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-4 flex-1 min-h-0">

          {/* Desktop only: Ideas panel fixed left */}
          <div className="hidden md:flex flex-col w-64 bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-amber-50 flex items-center justify-between shrink-0">
              <span className="text-sm font-medium text-amber-800">💡 Ideas</span>
              {isExpert && (
                <button onClick={() => setShowIdeaForm(true)} className="text-xs text-amber-600 hover:underline">+ Thêm</button>
              )}
            </div>

            <Droppable droppableId="backlog">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef} {...provided.droppableProps}
                  className={`flex-1 overflow-y-auto p-2 space-y-1.5 ${snapshot.isDraggingOver ? "bg-amber-50/40" : ""}`}
                >
                  {unscheduledIdeas.length === 0 && (
                    <p className="text-xs text-gray-400 p-4 text-center">Chưa có idea.<br />Kéo idea từ lịch về đây hoặc bấm + Thêm.</p>
                  )}
                  {unscheduledIdeas.map((idea, index) => (
                    <Draggable key={idea.id} draggableId={`idea-${idea.id}`} index={index} isDragDisabled={!isExpert}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef} {...(provided.draggableProps as any)} {...provided.dragHandleProps}
                          className={snapshot.isDragging ? "shadow-lg" : ""}
                        >
                          <IdeaCard idea={idea} isExpert={isExpert} onClick={() => openEditIdea(idea)} onToggle={toggleIdeaDone} onStartTimer={quickStartTimer} onStopTimer={stopTimer} timerRunning={timerRunning} timerElapsed={timerElapsed} />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>

          {/* Scrollable board: on mobile includes Ideas as first column */}
          <div className="flex flex-1 gap-2 overflow-x-auto">

            {/* Mobile only: Ideas as first scrollable column */}
            <div className="md:hidden flex-none w-36 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-100 bg-amber-50 flex items-center justify-between shrink-0">
                <span className="text-sm font-medium text-amber-800">💡 Ideas</span>
                {isExpert && (
                  <button onClick={() => setShowIdeaForm(true)} className="text-xs text-amber-600 hover:underline">+ Thêm</button>
                )}
              </div>
              <Droppable droppableId="backlog-mobile">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef} {...provided.droppableProps}
                    className={`flex-1 overflow-y-auto p-2 space-y-1.5 ${snapshot.isDraggingOver ? "bg-amber-50/40" : ""}`}
                  >
                    {unscheduledIdeas.length === 0 && (
                      <p className="text-xs text-gray-400 p-3 text-center">Chưa có idea.</p>
                    )}
                    {unscheduledIdeas.map((idea, index) => (
                      <Draggable key={`m-${idea.id}`} draggableId={`idea-${idea.id}`} index={index} isDragDisabled={!isExpert}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef} {...(provided.draggableProps as any)} {...provided.dragHandleProps}
                            className={snapshot.isDragging ? "shadow-lg" : ""}
                          >
                            <IdeaCard idea={idea} isExpert={isExpert} onClick={() => openEditIdea(idea)} onToggle={toggleIdeaDone} onStartTimer={quickStartTimer} onStopTimer={stopTimer} timerRunning={timerRunning} timerElapsed={timerElapsed} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
            {weekDays.map(day => {
              const dateStr = isoDate(day);
              const dayIdeas = ideasForDay(day);
              const dayTasks = tasksForDay(day);
              return (
                <div key={dateStr} className="flex-1 min-w-[140px] md:min-w-32 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className={`px-3 py-2 border-b border-gray-100 shrink-0 ${isToday(day) ? "bg-blue-600" : "bg-gray-50"}`}>
                    <p className={`text-xs font-medium text-center ${isToday(day) ? "text-white" : "text-gray-600"}`}>{dayLabel(day)}</p>
                  </div>

                  <Droppable droppableId={`day-${dateStr}`}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef} {...provided.droppableProps}
                        className={`flex-1 overflow-y-auto p-2 space-y-1.5 min-h-20 ${snapshot.isDraggingOver ? "bg-amber-50" : ""}`}
                      >
                        {/* Scheduled ideas in this day */}
                        {dayIdeas.map((idea, i) => (
                          <Draggable key={`idea-${idea.id}`} draggableId={`idea-${idea.id}`} index={i} isDragDisabled={!isExpert}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef} {...(provided.draggableProps as any)} {...provided.dragHandleProps}
                                className={snapshot.isDragging ? "shadow-lg" : ""}
                              >
                                <IdeaCard idea={idea} isExpert={isExpert} compact onClick={() => openEditIdea(idea)} onToggle={toggleIdeaDone} onStartTimer={quickStartTimer} onStopTimer={stopTimer} timerRunning={timerRunning} timerElapsed={timerElapsed} />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}

                        {/* Tasks created directly in this day */}
                        {dayTasks.map((task, i) => (
                          <Draggable key={`task-${task.id}`} draggableId={`task-${task.id}`} index={dayIdeas.length + i} isDragDisabled={!isExpert}>
                            {(provided, snapshot) => (
                              <div ref={provided.innerRef} {...(provided.draggableProps as any)} {...provided.dragHandleProps} className={snapshot.isDragging ? "shadow-lg" : ""}>
                                <TaskCard task={task} isExpert={isExpert} onClick={() => openEditTask(task)} onToggle={toggleTaskDone} timerRunning={timerRunning} timerElapsed={timerElapsed} onStartTimer={(title, workType) => startTimerForIdea(workType, undefined, title)} onStopTimer={stopTimer} />
                              </div>
                            )}
                          </Draggable>
                        ))}

                        {isExpert && (
                          <button
                            onClick={() => { setShowTaskForm(dateStr); setTaskForm(emptyTaskForm); }}
                            className="w-full text-xs text-gray-300 hover:text-gray-500 py-1 text-center"
                          >
                            + task
                          </button>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </div>
      </DragDropContext>

      {/* Modal thêm idea */}
      {showIdeaForm && (
        <Modal onClose={() => setShowIdeaForm(false)}>
          <h2 className="font-semibold mb-4">💡 Thêm idea</h2>
          <form onSubmit={addIdea} className="space-y-3">
            <Field label="Tiêu đề *">
              <input required autoFocus className="input" value={ideaForm.title} onChange={e => setIdeaForm({ ...ideaForm, title: e.target.value })} />
            </Field>
            <Field label="Mô tả">
              <textarea rows={2} className="input resize-none" value={ideaForm.description} onChange={e => setIdeaForm({ ...ideaForm, description: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Loại công việc">
                <select className="input" value={ideaForm.workType} onChange={e => setIdeaForm({ ...ideaForm, workType: e.target.value })}>
                  <option value="">-- Chọn --</option>
                  {WORK_TYPES.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                </select>
              </Field>
              <Field label="Gắn sản phẩm">
                <select className="input" value={ideaForm.product} onChange={e => setIdeaForm({ ...ideaForm, product: e.target.value })}>
                  <option value="">-- Không gắn --</option>
                  {ALL_PRODUCTS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
            </div>
            <ModalActions onCancel={() => setShowIdeaForm(false)} submitLabel="Lưu idea" submitClass="bg-amber-500 hover:bg-amber-600" />
          </form>
        </Modal>
      )}

      {/* Modal thêm task từ cột ngày */}
      {showTaskForm && (
        <Modal onClose={() => { setShowTaskForm(null); setTaskError(""); }}>
          <h2 className="font-semibold mb-4">Thêm task — {showTaskForm}</h2>
          <form onSubmit={addTask} className="space-y-3">
            <Field label="Tiêu đề *">
              <input required autoFocus className="input" value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} />
            </Field>
            <Field label="Mô tả">
              <textarea rows={2} className="input resize-none" value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} />
            </Field>
            <Field label="Loại công việc">
              <select className="input" value={taskForm.workType} onChange={e => setTaskForm({ ...taskForm, workType: e.target.value })}>
                <option value="">-- Chưa chọn --</option>
                {WORK_TYPES.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
              </select>
            </Field>
            <Field label="Giao cho">
              <select className="input" value={taskForm.assignedToId} onChange={e => setTaskForm({ ...taskForm, assignedToId: e.target.value })}>
                <option value="">-- Chưa giao --</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </Field>
            {taskError && <p className="text-xs text-red-500">{taskError}</p>}
            <ModalActions onCancel={() => { setShowTaskForm(null); setTaskError(""); }} submitLabel="Lưu task" loading={savingTask} />
          </form>
        </Modal>
      )}

      {/* Shared Item Edit Modal */}
      {editItem && (
        <ItemEditModal
          item={editItem}
          users={users}
          isExpert={isExpert}
          timer={{
            isRunning: !!timerRunning,
            elapsed: timerElapsed,
            label: timerRunning?.note || timerRunning?.idea?.title || null,
          }}
          onClose={() => { setEditItem(null); setEditingIdea(null); setEditingTask(null); }}
          onSave={async (data) => {
            const endpoint = editItem._type === "idea"
              ? `/api/ideas/${editItem.id}`
              : `/api/tasks/${editItem.id}`;
            await api(endpoint, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
            setEditItem(null); setEditingIdea(null); setEditingTask(null);
            load();
          }}
          onDelete={async () => {
            if (editItem._type === "idea") await deleteIdea(editItem.id);
            else await deleteTask(editItem.id);
            setEditItem(null);
          }}
          onToggleDone={() => {
            if (editItem._type === "idea") toggleIdeaDone(editItem as Idea);
            else toggleTaskDone(editItem as Task);
            setEditItem(null); setEditingIdea(null); setEditingTask(null);
          }}
          onStartTimer={(wType, ideaId, title) => {
            setEditItem(null); setEditingIdea(null); setEditingTask(null);
            startTimerForIdea(wType, ideaId, title);
          }}
          onStopTimer={stopTimer}
        />
      )}

      {/* Modal assign */}
      {assignModal && (
        <Modal onClose={() => setAssignModal(null)}>
          <h2 className="font-semibold mb-1">Giao cho ai?</h2>
          <p className="text-sm text-gray-500 mb-4">📅 {assignModal.date}</p>
          <div className="space-y-2">
            {users.map(u => (
              <button key={u.id}
                onClick={() => assignModal.type === "idea"
                  ? scheduleIdea(assignModal.id, assignModal.date, u.id)
                  : scheduleTask(assignModal.id, assignModal.date, u.id)}
                className="w-full flex items-center gap-3 px-4 py-2.5 border border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-300 text-sm"
              >
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-semibold shrink-0">
                  {u.name.split(" ").pop()?.[0]}
                </div>
                {u.name}
              </button>
            ))}
            <button
              onClick={() => assignModal.type === "idea"
                ? scheduleIdea(assignModal.id, assignModal.date)
                : scheduleTask(assignModal.id, assignModal.date)}
              className="w-full text-xs text-gray-400 hover:text-gray-600 py-1"
            >
              Bỏ qua, không giao cụ thể
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---- UI Components ----

function IdeaCard({ idea, isExpert, onClick, onToggle, onStartTimer, onStopTimer, timerRunning, timerElapsed, compact = false }: {
  idea: Idea; isExpert: boolean; compact?: boolean;
  onClick: () => void; onToggle: (i: Idea) => void;
  onStartTimer?: (workType: string, ideaId: string) => void;
  onStopTimer?: () => void;
  timerRunning?: { ideaId?: string | null } | null;
  timerElapsed?: number;
}) {
  const color = wt(idea.workType);
  const isTimingThis = !!timerRunning && timerRunning.ideaId === idea.id;

  function fmtElapsed(s: number) {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (h > 0) return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
    return `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  }

  return (
    <div
      onClick={onClick}
      className={`group relative bg-white border rounded-lg overflow-hidden cursor-pointer hover:shadow-sm transition-all ${idea.done ? "opacity-50" : ""} ${isTimingThis ? "border-blue-400 shadow-blue-100 shadow-md" : "border-gray-100 hover:border-amber-300"}`}
    >
      {color && <div className={`h-1.5 w-full ${color.bar}`} />}
      {isTimingThis && (
        <div className="flex items-center justify-between px-2.5 py-1 bg-blue-50 border-b border-blue-100">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs font-mono font-semibold text-blue-600">{fmtElapsed(timerElapsed ?? 0)}</span>
          </div>
          <button
            onClick={e => { e.stopPropagation(); onStopTimer?.(); }}
            className="text-xs text-blue-400 hover:text-red-500 transition-colors font-medium"
          >■ Dừng</button>
        </div>
      )}
      <div className="px-2.5 py-2 flex items-start gap-1.5">
        <button
          onClick={e => { e.stopPropagation(); onToggle(idea); }}
          className={`mt-0.5 w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center ${idea.done ? "bg-green-500 border-green-500" : "border-gray-300 hover:border-green-400"}`}
        >
          {idea.done && <span className="text-white text-xs leading-none">✓</span>}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-medium leading-tight ${idea.done ? "line-through text-gray-400" : "text-gray-800"}`}>{idea.title}</p>
          {!compact && idea.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{idea.description}</p>}
          {idea.assignedTo && <p className="text-xs text-amber-500 mt-0.5">{idea.assignedTo.name.split(" ").pop()}</p>}
        </div>
        {onStartTimer && !isTimingThis && !idea.done && (
          <button
            onClick={e => { e.stopPropagation(); onStartTimer(idea.workType || WORK_TYPES[0].value, idea.id); }}
            title="Bắt đầu bấm giờ"
            className="opacity-0 group-hover:opacity-100 shrink-0 text-blue-400 hover:text-blue-600 transition-all ml-0.5 text-xs"
          >▶</button>
        )}
      </div>
    </div>
  );
}

function TaskCard({ task, isExpert, onClick, onToggle, timerRunning, timerElapsed, onStartTimer, onStopTimer }: {
  task: Task; isExpert: boolean;
  onClick: () => void; onToggle: (t: Task) => void;
  timerRunning?: { note?: string | null } | null;
  timerElapsed?: number;
  onStartTimer?: (title: string, workType: string) => void;
  onStopTimer?: () => void;
}) {
  const color = wt(task.workType);
  const isTimingThis = !!timerRunning && !!timerRunning.note && timerRunning.note === task.title;

  function fmtElapsed(s: number) {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (h > 0) return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
    return `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
  }

  return (
    <div
      onClick={onClick}
      className={`group relative border rounded-lg overflow-hidden cursor-pointer transition-all ${task.done ? "opacity-50" : ""} ${isTimingThis ? "bg-blue-50 border-blue-300 shadow-blue-100 shadow-md" : "bg-gray-50 border-gray-100 hover:border-blue-200 hover:shadow-sm"}`}
    >
      {color && <div className={`h-1 w-full ${color.bar}`} />}
      {isTimingThis && (
        <div className="flex items-center justify-between px-2.5 py-1 bg-blue-100/60 border-b border-blue-200">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-xs font-mono font-semibold text-blue-600">{fmtElapsed(timerElapsed ?? 0)}</span>
          </div>
          <button
            onClick={e => { e.stopPropagation(); onStopTimer?.(); }}
            className="text-xs text-blue-400 hover:text-red-500 transition-colors font-medium"
          >■ Dừng</button>
        </div>
      )}
      <div className="px-2.5 py-2 flex items-start gap-1.5">
        <button
          onClick={e => { e.stopPropagation(); onToggle(task); }}
          className={`mt-0.5 w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center ${task.done ? "bg-green-500 border-green-500" : "border-gray-300 hover:border-green-400"}`}
        >
          {task.done && <span className="text-white text-xs leading-none">✓</span>}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-xs leading-tight ${task.done ? "line-through text-gray-400" : "text-gray-700"}`}>{task.title}</p>
          {task.assignedTo && <p className="text-xs text-blue-500 mt-0.5">{task.assignedTo.name.split(" ").pop()}</p>}
        </div>
        {onStartTimer && !isTimingThis && !task.done && (
          <button
            onClick={e => { e.stopPropagation(); onStartTimer(task.title, task.workType || WORK_TYPES[0].value); }}
            title="Bắt đầu bấm giờ"
            className="opacity-0 group-hover:opacity-100 shrink-0 text-blue-400 hover:text-blue-600 transition-all ml-0.5 text-xs"
          >▶</button>
        )}
      </div>
    </div>
  );
}

function Modal({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-end md:items-center justify-center z-50" onClick={onClose}>
      <div
        className={`bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full p-5 md:p-6 max-h-[92vh] overflow-y-auto ${wide ? "md:max-w-md" : "md:max-w-sm"}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="md:hidden w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      {children}
    </div>
  );
}

function ModalActions({ onCancel, submitLabel, loading, submitClass }: {
  onCancel: () => void; submitLabel: string; loading?: boolean; submitClass?: string;
}) {
  return (
    <div className="flex gap-2 pt-2">
      <button type="button" onClick={onCancel} className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm hover:bg-gray-50">Hủy</button>
      <button type="submit" disabled={loading} className={`flex-1 text-white rounded-xl py-2.5 text-sm disabled:opacity-50 ${submitClass || "bg-blue-600 hover:bg-blue-700"}`}>
        {loading ? "Đang lưu..." : submitLabel}
      </button>
    </div>
  );
}
