"use client";

import { useState, useEffect } from "react";
import { WORK_TYPES } from "@/lib/constants";
import { api } from "@/lib/api";
import { formatTimeInput } from "@/lib/utils";

export interface EditableItem {
  id: string;
  title: string;
  description: string | null;
  workType: string | null;
  done: boolean;
  assignedTo: { id: string; name: string } | null;
  estimatedStart?: string | null;
  estimatedEnd?: string | null;
  doneNote?: string | null;
  mood?: string | null;
  _type: "idea" | "task";
}

interface TimerState {
  isRunning: boolean;
  elapsed: number;
  label?: string | null;
}

interface TodoItem {
  id: string;
  title: string;
  done: boolean;
  order: number;
}

interface ItemEditModalProps {
  item: EditableItem;
  users: { id: string; name: string }[];
  isExpert: boolean;
  timer: TimerState;
  onClose: () => void;
  onSave: (data: { title: string; description: string | null; workType: string | null; assignedToId: string | null; estimatedStart?: string | null; estimatedEnd?: string | null }) => Promise<void>;
  onSaveCheckout: (data: { doneNote: string | null; mood: string | null }) => Promise<void>;
  onDelete: () => Promise<void>;
  onToggleDone: () => void;
  onStartTimer: (workType: string, ideaId?: string, title?: string, taskId?: string) => void;
  onStopTimer: () => void;
}

function fmtTimer(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function ItemEditModal({
  item, users, isExpert, timer,
  onClose, onSave, onSaveCheckout, onDelete, onToggleDone, onStartTimer, onStopTimer,
}: ItemEditModalProps) {
  const [form, setForm] = useState({
    title: item.title,
    description: item.description || "",
    workType: item.workType || "",
    assignedToId: item.assignedTo?.id || "",
    estimatedStart: item.estimatedStart || "",
    estimatedEnd: item.estimatedEnd || "",
  });
  const [saving, setSaving] = useState(false);

  // Ghi chú lúc dừng giờ + check-out cảm xúc: luôn hiện, có thể sửa trực tiếp bất cứ lúc nào
  const [editingCheckout, setEditingCheckout] = useState(false);
  const [checkoutDraft, setCheckoutDraft] = useState({ note: item.doneNote || "", mood: item.mood || "" });
  const [savingCheckout, setSavingCheckout] = useState(false);

  async function saveCheckout() {
    setSavingCheckout(true);
    await onSaveCheckout({ doneNote: checkoutDraft.note || null, mood: checkoutDraft.mood || null });
    setSavingCheckout(false);
    setEditingCheckout(false);
  }

  // Todo list (chỉ cho task)
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [addingTodo, setAddingTodo] = useState(false);

  useEffect(() => {
    const endpoint = item._type === "task" ? `/api/tasks/${item.id}/todos` : `/api/ideas/${item.id}/todos`;
    api(endpoint).then(r => r.ok ? r.json() : []).then(d => setTodos(d || []));
  }, [item.id, item._type]);

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    await onSave({
      title: form.title,
      description: form.description || null,
      workType: form.workType || null,
      assignedToId: form.assignedToId || null,
      estimatedStart: form.estimatedStart || null,
      estimatedEnd: form.estimatedEnd || null,
    });
    setSaving(false);
  }

  async function addTodo() {
    if (!newTodo.trim()) return;
    setAddingTodo(true);
    const endpoint = item._type === "task" ? `/api/tasks/${item.id}/todos` : `/api/ideas/${item.id}/todos`;
    const res = await api(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTodo.trim() }),
    });
    if (res.ok) {
      const todo = await res.json();
      setTodos(prev => [...prev, todo]);
      setNewTodo("");
    }
    setAddingTodo(false);
  }

  async function toggleTodo(todo: TodoItem) {
    const base = item._type === "task" ? `/api/tasks/${item.id}/todos` : `/api/ideas/${item.id}/todos`;
    const res = await api(`${base}/${todo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !todo.done }),
    });
    if (res.ok) setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, done: !t.done } : t));
  }

  async function deleteTodo(todoId: string) {
    const base = item._type === "task" ? `/api/tasks/${item.id}/todos` : `/api/ideas/${item.id}/todos`;
    await api(`${base}/${todoId}`, { method: "DELETE" });
    setTodos(prev => prev.filter(t => t.id !== todoId));
  }

  const doneCount = todos.filter(t => t.done).length;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white w-full md:max-w-md rounded-t-2xl md:rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="md:hidden w-10 h-1 bg-gray-200 rounded-full mx-auto" />

        <div className="flex items-start justify-between gap-2">
          <h2 className="font-semibold text-gray-800">
            {item._type === "idea" ? "💡 Chỉnh sửa idea" : "✅ Chỉnh sửa task"}
          </h2>
          {isExpert && (
            <button
              onClick={onDelete}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg text-sm font-medium shrink-0"
            >
              🗑 Xóa
            </button>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Tiêu đề *</label>
            <input
              autoFocus
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Mô tả</label>
            <textarea
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-blue-400"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Loại công việc</label>
            <select
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 bg-white"
              value={form.workType}
              onChange={e => setForm({ ...form, workType: e.target.value })}
            >
              <option value="">-- Chưa chọn --</option>
              {WORK_TYPES.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
            </select>
          </div>
          {users.length > 0 && (
            <div>
              <label className="text-xs text-gray-500 block mb-1">Giao cho</label>
              <select
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 bg-white"
                value={form.assignedToId}
                onChange={e => setForm({ ...form, assignedToId: e.target.value })}
              >
                <option value="">-- Chưa giao --</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Thời gian dự kiến</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                inputMode="numeric"
                placeholder="08:00"
                maxLength={5}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
                value={form.estimatedStart}
                onChange={e => setForm({ ...form, estimatedStart: formatTimeInput(e.target.value) })}
              />
              <span className="text-gray-400 text-sm shrink-0">→</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="09:30"
                maxLength={5}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
                value={form.estimatedEnd}
                onChange={e => setForm({ ...form, estimatedEnd: formatTimeInput(e.target.value) })}
              />
            </div>
          </div>
          <div className="pt-1">
            <button
              type="button"
              onClick={onToggleDone}
              className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border transition-colors ${item.done ? "border-green-300 bg-green-50 text-green-700" : "border-gray-200 hover:bg-gray-50 text-gray-600"}`}
            >
              <span className={`w-4 h-4 rounded border flex items-center justify-center text-xs ${item.done ? "bg-green-500 border-green-500 text-white" : "border-gray-300"}`}>
                {item.done && "✓"}
              </span>
              {item.done ? "Đã xong" : "Đánh dấu xong"}
            </button>
          </div>
        </div>

        {/* Todo List */}
        {(
          <div className="border-t border-gray-100 pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-600">
                ☑ To Do List
                {todos.length > 0 && (
                  <span className="ml-2 text-gray-400 font-normal">{doneCount}/{todos.length} xong</span>
                )}
              </p>
            </div>

            {/* Progress bar */}
            {todos.length > 0 && (
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-green-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${(doneCount / todos.length) * 100}%` }}
                />
              </div>
            )}

            {/* Danh sách todo */}
            <div className="space-y-1">
              {todos.map(todo => (
                <div key={todo.id} className="flex items-center gap-2 group">
                  <button
                    onClick={() => toggleTodo(todo)}
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${todo.done ? "bg-green-500 border-green-500" : "border-gray-300 hover:border-green-400"}`}
                  >
                    {todo.done && <span className="text-white text-[10px] font-bold">✓</span>}
                  </button>
                  <span className={`flex-1 text-sm ${todo.done ? "line-through text-gray-400" : "text-gray-700"}`}>
                    {todo.title}
                  </span>
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 text-xs w-5 h-5 flex items-center justify-center transition-opacity"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Thêm todo mới */}
            <div className="flex gap-2 pt-1">
              <input
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                placeholder="Thêm việc nhỏ..."
                value={newTodo}
                onChange={e => setNewTodo(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addTodo(); }}
              />
              <button
                onClick={addTodo}
                disabled={addingTodo || !newTodo.trim()}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-medium disabled:opacity-40 transition-colors"
              >
                + Thêm
              </button>
            </div>
          </div>
        )}

        {/* Ghi chú lúc dừng giờ + check-out cảm xúc: luôn hiện, điền trực tiếp hoặc qua popup dừng bấm giờ */}
        <div className="border-t border-gray-100 pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-600">📝 Ghi chú & cảm xúc</p>
            {!editingCheckout && (
              <button
                type="button"
                onClick={() => { setCheckoutDraft({ note: item.doneNote || "", mood: item.mood || "" }); setEditingCheckout(true); }}
                className="text-xs text-blue-500 hover:underline shrink-0"
              >
                ✎ Sửa
              </button>
            )}
          </div>

          {editingCheckout ? (
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Ghi chú bạn đã làm gì</label>
                <textarea
                  rows={2}
                  autoFocus
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-blue-400"
                  value={checkoutDraft.note}
                  onChange={e => setCheckoutDraft({ ...checkoutDraft, note: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Check-out cảm xúc của bạn sau khi xong task là?</label>
                <textarea
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-blue-400"
                  value={checkoutDraft.mood}
                  onChange={e => setCheckoutDraft({ ...checkoutDraft, mood: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCheckout(false)}
                  className="flex-1 border border-gray-200 rounded-xl py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={saveCheckout}
                  disabled={savingCheckout}
                  className="flex-1 bg-blue-600 text-white rounded-xl py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingCheckout ? "Đang lưu..." : "Lưu"}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Ghi chú bạn đã làm gì</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.doneNote || <span className="text-gray-300">Chưa có ghi chú</span>}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Cảm xúc sau khi làm</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.mood || <span className="text-gray-300">Chưa có</span>}</p>
              </div>
            </div>
          )}
        </div>

        {/* Timer */}
        {!item.done && (
          <div className="border-t border-gray-100 pt-3">
            {timer.isRunning ? (
              <div className="rounded-xl px-3 py-2.5 bg-blue-50 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
                    <div>
                      <p className="text-xs text-blue-600 font-semibold">{fmtTimer(timer.elapsed)}</p>
                      {timer.label && <p className="text-xs text-blue-500 truncate">Đang bấm: "{timer.label}"</p>}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { onStopTimer(); onClose(); }}
                    className="text-xs text-red-400 hover:text-red-600 font-medium shrink-0 ml-2"
                  >
                    ■ Dừng
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const wType = form.workType || item.workType || WORK_TYPES[0].value;
                  const ideaId = item._type === "idea" ? item.id : undefined;
                  const taskId = item._type === "task" ? item.id : undefined;
                  onClose();
                  onStartTimer(wType, ideaId, item.title, taskId);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-blue-200 text-blue-600 hover:bg-blue-50 text-sm font-medium transition-colors"
              >
                ▶ Bắt đầu bấm giờ
              </button>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-200 rounded-xl py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.title.trim()}
            className="flex-1 bg-blue-600 text-white rounded-xl py-3 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
  );
}
