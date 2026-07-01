"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { WORK_TYPES, WORK_TYPE_COLORS } from "@/lib/constants";
import { api } from "@/lib/api";

interface TimeEntry {
  id: string;
  product: string;
  workType: string;
  note: string | null;
  startedAt: string;
  stoppedAt: string | null;
  durationMin: number | null;
  idea?: { id: string; title: string } | null;
}

interface Idea {
  id: string;
  title: string;
  workType: string | null;
  done: boolean;
  assignedTo: { id: string; name: string } | null;
}

interface Task {
  id: string;
  title: string;
  workType: string | null;
  done: boolean;
  assignedTo: { id: string; name: string } | null;
}

function fmtDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}g ${m}p` : `${m}p`;
}

function fmtTimer(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

const wtLabel = (v: string) => WORK_TYPES.find(w => w.value === v)?.label || v;
const wtColor = (v: string) => WORK_TYPE_COLORS[v];

export default function TodayPage() {
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id || "";

  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [running, setRunning] = useState<TimeEntry | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showStopForm, setShowStopForm] = useState(false);
  const [stopNote, setStopNote] = useState("");
  const [stoppingId, setStoppingId] = useState<string | null>(null);
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editNote, setEditNote] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  const load = useCallback(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    Promise.all([
      api(`/api/ideas?from=${todayStr}&to=${todayStr}`).then(r => r.ok ? r.json() : []),
      api(`/api/tasks?from=${todayStr}&to=${todayStr}`).then(r => r.ok ? r.json() : []),
      api("/api/time").then(r => r.ok ? r.json() : []),
    ]).then(([i, t, e]) => {
      setIdeas(i || []);
      setTasks(t || []);
      const allEntries: TimeEntry[] = e || [];
      setEntries(allEntries);
      const active = allEntries.find((en: any) => !en.stoppedAt);
      if (active) {
        setRunning(active);
        setElapsed(Math.floor((Date.now() - new Date(active.startedAt).getTime()) / 1000));
      } else {
        setRunning(null);
        setElapsed(0);
      }
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  async function startTimer(workType: string, ideaId?: string, title?: string) {
    if (running) {
      // stop current first
      await api(`/api/time/${running.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}),
      });
    }
    await api("/api/time", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product: "Chung (không gắn sản phẩm)",
        workType: workType || WORK_TYPES[0].value,
        ideaId: ideaId || null,
        note: title || null,
      }),
    });
    setElapsed(0);
    load();
  }

  async function confirmStop() {
    if (!stoppingId) return;
    await api(`/api/time/${stoppingId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: stopNote || undefined }),
    });
    setShowStopForm(false);
    setStopNote("");
    setStoppingId(null);
    load();
  }

  function requestStop() {
    if (!running) return;
    setStoppingId(running.id);
    setStopNote(running.note || "");
    setShowStopForm(true);
  }

  async function toggleIdea(idea: Idea) {
    await api(`/api/ideas/${idea.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !idea.done }),
    });
    load();
  }

  async function toggleTask(task: Task) {
    await api(`/api/tasks/${task.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !task.done }),
    });
    load();
  }

  async function deleteEntry(id: string) {
    await api(`/api/time/${id}`, { method: "DELETE" });
    load();
  }

  function openEdit(entry: TimeEntry) {
    const toLocal = (iso: string) => {
      const d = new Date(iso);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      return d.toISOString().slice(0, 16);
    };
    setEditEntry(entry);
    setEditStart(toLocal(entry.startedAt));
    setEditEnd(entry.stoppedAt ? toLocal(entry.stoppedAt) : "");
    setEditNote(entry.note || "");
  }

  async function saveEdit() {
    if (!editEntry) return;
    await api(`/api/time/${editEntry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startedAt: new Date(editStart).toISOString(),
        stoppedAt: editEnd ? new Date(editEnd).toISOString() : undefined,
        note: editNote || undefined,
      }),
    });
    setEditEntry(null);
    load();
  }

  const todayEntries = entries.filter(e => {
    return new Date(e.startedAt).toDateString() === new Date().toDateString();
  });
  const todayMinutes = todayEntries.filter(e => e.durationMin).reduce((s, e) => s + (e.durationMin || 0), 0);
  const allItems = [
    ...ideas.map(i => ({ ...i, _type: "idea" as const })),
    ...tasks.map(t => ({ ...t, _type: "task" as const })),
  ];
  const todoItems = allItems.filter(i => !i.done);
  const doneItems = allItems.filter(i => i.done);

  const dateLabel = new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold" style={{ color: "var(--cream)" }}>Hôm Nay</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--cream-muted)" }}>{dateLabel}</p>
        </div>
        {todayMinutes > 0 && (
          <div className="text-right">
            <p className="text-base font-semibold" style={{ color: "var(--gold)" }}>{fmtDuration(todayMinutes)}</p>
            <p className="text-xs" style={{ color: "var(--cream-muted)" }}>đã làm</p>
          </div>
        )}
      </div>

      {/* Timer đang chạy — sticky trên mobile */}
      {running && !showStopForm && (
        <div className="sticky top-0 z-10 rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
          style={{ background: "rgba(30,60,120,0.85)", border: "1px solid rgba(96,165,250,0.35)", backdropFilter: "blur(8px)" }}>
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0" />
            <p className="text-sm font-medium text-blue-200 truncate">{running.note || wtLabel(running.workType)}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="font-mono font-semibold text-blue-200 text-base">{fmtTimer(elapsed)}</span>
            <button onClick={requestStop} className="px-3 py-1.5 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white text-xs rounded-xl font-medium transition-colors">
              ■ Dừng
            </button>
          </div>
        </div>
      )}

      {/* Stop form — bottom-sheet on mobile */}
      {showStopForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40" onClick={() => setShowStopForm(false)}>
          <div className="bg-white w-full md:max-w-sm rounded-t-2xl md:rounded-2xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="md:hidden w-10 h-1 bg-gray-200 rounded-full mx-auto" />
            <div>
              <p className="font-semibold text-gray-800 mb-0.5">Ghi lại đã làm gì?</p>
              <p className="text-xs text-gray-400">Session vừa rồi</p>
            </div>
            <textarea
              rows={3} autoFocus
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-blue-400"
              placeholder="Đã hoàn thành những gì trong session này..."
              value={stopNote}
              onChange={e => setStopNote(e.target.value)}
            />
            <div className="flex gap-2">
              <button onClick={() => setShowStopForm(false)} className="flex-1 border border-gray-200 rounded-xl py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 active:bg-gray-100">
                Tiếp tục làm
              </button>
              <button onClick={confirmStop} className="flex-1 bg-red-500 text-white rounded-xl py-3 text-sm font-medium hover:bg-red-600 active:bg-red-700">
                Xác nhận dừng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit entry modal */}
      {editEntry && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40" onClick={() => setEditEntry(null)}>
          <div className="bg-white w-full md:max-w-sm rounded-t-2xl md:rounded-2xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="md:hidden w-10 h-1 bg-gray-200 rounded-full mx-auto" />
            <p className="font-semibold text-gray-800">Chỉnh sửa thời gian</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Bắt đầu</label>
                <input type="datetime-local" value={editStart} onChange={e => setEditStart(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Kết thúc</label>
                <input type="datetime-local" value={editEnd} onChange={e => setEditEnd(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Ghi chú</label>
                <input type="text" value={editNote} onChange={e => setEditNote(e.target.value)}
                  placeholder="Đã làm gì..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditEntry(null)} className="flex-1 border border-gray-200 rounded-xl py-3 text-sm font-medium text-gray-600 hover:bg-gray-50">
                Hủy
              </button>
              <button onClick={saveEdit} className="flex-1 bg-blue-600 text-white rounded-xl py-3 text-sm font-medium hover:bg-blue-700">
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* To-do hôm nay */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">📋 Việc hôm nay</p>
          {todoItems.length > 0 && <span className="text-xs text-gray-400">{todoItems.length} còn lại</span>}
        </div>

        {allItems.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-gray-400 mb-2">Chưa có việc nào lên lịch hôm nay</p>
            <a href="/plan" className="text-xs text-amber-500 font-medium">→ Vào Kế hoạch để thêm</a>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {todoItems.map(item => {
              const color = item.workType ? wtColor(item.workType) : null;
              const isRunning = running && running.idea?.id === item.id;
              return (
                <div key={`${item._type}-${item.id}`}
                  className={`flex items-center gap-3 px-4 py-3.5 transition-colors ${isRunning ? "bg-blue-50/60" : ""}`}
                >
                  <button
                    onClick={() => item._type === "idea" ? toggleIdea(item as Idea) : toggleTask(item as Task)}
                    className="w-5 h-5 rounded-md border-2 border-gray-300 active:border-green-400 shrink-0 flex items-center justify-center transition-colors touch-manipulation"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 leading-snug">{item.title}</p>
                    {item.workType && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {color && <span className={`w-1.5 h-1.5 rounded-full ${color.dot}`} />}
                        <p className="text-xs text-gray-400">{wtLabel(item.workType)}</p>
                      </div>
                    )}
                  </div>
                  {isRunning ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-mono font-semibold text-blue-500">{fmtTimer(elapsed)}</span>
                      <button onClick={requestStop} className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 text-red-400 active:bg-red-100 text-xs touch-manipulation">■</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startTimer(
                        item.workType || WORK_TYPES[0].value,
                        item._type === "idea" ? item.id : undefined,
                        item.title
                      )}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 active:bg-blue-100 text-blue-600 text-xs font-semibold shrink-0 touch-manipulation"
                    >▶ Bắt đầu</button>
                  )}
                </div>
              );
            })}

            {doneItems.length > 0 && (
              <>
                <div className="px-4 py-2 bg-gray-50/50">
                  <p className="text-xs text-gray-400">Đã xong ({doneItems.length})</p>
                </div>
                {doneItems.map(item => {
                  const color = item.workType ? wtColor(item.workType) : null;
                  return (
                    <div key={`${item._type}-${item.id}`}
                      className="flex items-center gap-3 px-4 py-3 opacity-45"
                    >
                      <button
                        onClick={() => item._type === "idea" ? toggleIdea(item as Idea) : toggleTask(item as Task)}
                        className="w-5 h-5 rounded-md bg-green-500 border-2 border-green-500 shrink-0 flex items-center justify-center touch-manipulation"
                      >
                        <span className="text-white text-[10px] font-bold">✓</span>
                      </button>
                      {color && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${color.dot}`} />}
                      <p className="text-sm text-gray-500 line-through truncate">{item.title}</p>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>

      {/* Log bấm giờ hôm nay */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">⏱ Log hôm nay</p>
          {todayMinutes > 0 && <span className="text-xs font-medium text-gray-500">{fmtDuration(todayMinutes)}</span>}
        </div>
        <div className="divide-y divide-gray-50">
          {todayEntries.length === 0 && (
            <p className="text-sm text-gray-400 p-5 text-center">Chưa có session nào hôm nay</p>
          )}
          {todayEntries.map(e => {
            const color = wtColor(e.workType);
            return (
              <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                {color && <span className={`w-2 h-2 rounded-full shrink-0 ${color.dot}`} />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate">
                    {e.note || (e.idea?.title) || wtLabel(e.workType)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {fmtTime(e.startedAt)}{e.stoppedAt ? ` → ${fmtTime(e.stoppedAt)}` : ""}
                    {" · "}{wtLabel(e.workType)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  {e.stoppedAt ? (
                    <p className="text-sm font-semibold text-gray-700">{fmtDuration(e.durationMin || 0)}</p>
                  ) : (
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full font-medium">Đang chạy</span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(e)} className="text-gray-300 hover:text-blue-400 active:text-blue-500 text-sm w-6 h-6 flex items-center justify-center touch-manipulation" title="Chỉnh sửa">✎</button>
                  {e.stoppedAt && (
                    <button onClick={() => deleteEntry(e.id)} className="text-gray-300 active:text-red-400 text-sm w-6 h-6 flex items-center justify-center touch-manipulation">✕</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
