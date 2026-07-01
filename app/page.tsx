"use client";

import { useEffect, useState, useRef } from "react";
import { STATUSES, WORK_TYPES, WORK_TYPE_COLORS } from "@/lib/constants";

interface WeekSummary {
  weekStart: string;
  weekEnd: string;
  totalMinutes: number;
  byWorkType: { workType: string; minutes: number }[];
  byUser: { name: string; minutes: number }[];
  ideas: { scheduled: number; done: number; new: number };
  tasks: { scheduled: number; done: number };
}

function fmtMin(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}p`;
  if (m === 0) return `${h}g`;
  return `${h}g ${m}p`;
}

function WeekSummaryWidget() {
  const [summary, setSummary] = useState<WeekSummary | null>(null);

  useEffect(() => {
    fetch("/api/summary/week").then(r => r.json()).then(setSummary);
  }, []);

  const now = new Date();
  const mon = new Date(now);
  mon.setDate(now.getDate() - now.getDay() + 1);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  const weekLabel = `${mon.getDate()}/${mon.getMonth() + 1} — ${sun.getDate()}/${sun.getMonth() + 1}`;

  const totalItems = (summary?.ideas.scheduled ?? 0) + (summary?.tasks.scheduled ?? 0);
  const doneItems = (summary?.ideas.done ?? 0) + (summary?.tasks.done ?? 0);
  const pct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">📋 Tổng kết tuần này</p>
          <p className="text-xs text-gray-400 mt-0.5">{weekLabel}</p>
        </div>
        {summary && totalItems > 0 && (
          <div className="text-right">
            <p className="text-xl font-semibold text-gray-800">{pct}%</p>
            <p className="text-xs text-gray-400">hoàn thành</p>
          </div>
        )}
      </div>

      {!summary ? (
        <p className="text-xs text-gray-400 text-center py-2">Đang tải...</p>
      ) : (
        <div className="space-y-4">
          {/* Progress bar */}
          {totalItems > 0 && (
            <div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-2 bg-green-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-1">{doneItems}/{totalItems} công việc xong</p>
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-lg font-semibold text-gray-800">{fmtMin(summary.totalMinutes)}</p>
              <p className="text-xs text-gray-400 mt-0.5">Giờ làm</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 text-center">
              <p className="text-lg font-semibold text-amber-700">{summary.ideas.new}</p>
              <p className="text-xs text-amber-500 mt-0.5">Idea mới</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-lg font-semibold text-green-700">{doneItems}</p>
              <p className="text-xs text-green-500 mt-0.5">Xong</p>
            </div>
          </div>

          {/* Giờ theo loại công việc */}
          {summary.byWorkType.length > 0 && (
            <div className="space-y-2">
              {summary.byWorkType.map(w => {
                const label = WORK_TYPES.find(wt => wt.value === w.workType)?.label || w.workType;
                const color = WORK_TYPE_COLORS[w.workType];
                const pctW = summary.totalMinutes > 0 ? (w.minutes / summary.totalMinutes) * 100 : 0;
                return (
                  <div key={w.workType}>
                    <div className="flex justify-between text-xs mb-1">
                      <div className="flex items-center gap-1.5">
                        {color && <span className={`w-2 h-2 rounded-full ${color.dot}`} />}
                        <span className="text-gray-600">{label}</span>
                      </div>
                      <span className="font-medium text-gray-700">{fmtMin(w.minutes)}</span>
                    </div>
                    <div className="h-1 bg-gray-100 rounded-full">
                      <div className={`h-1 rounded-full ${color?.bar || "bg-gray-400"}`} style={{ width: `${pctW}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Theo thành viên */}
          {summary.byUser.length > 1 && (
            <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-100">
              {summary.byUser.map(u => (
                <div key={u.name} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-[10px] font-semibold">
                    {u.name.split(" ").pop()?.[0]}
                  </div>
                  <span>{u.name.split(" ").pop()}: {fmtMin(u.minutes)}</span>
                </div>
              ))}
            </div>
          )}

          {totalItems === 0 && summary.totalMinutes === 0 && (
            <p className="text-xs text-gray-400 text-center py-1">Tuần này chưa có hoạt động nào.</p>
          )}
        </div>
      )}
    </div>
  );
}

interface DashboardData {
  totalCustomers: number;
  totalRevenue: number;
  newThisMonth: number;
  closedCount: number;
  byStatus: Record<string, number>;
  revenueByProduct: { product: string; amount: number }[];
  revenueByMonth: { month: string; amount: number }[];
}

function fmt(n: number) {
  return new Intl.NumberFormat("vi-VN").format(Math.round(n));
}

interface Idea {
  id: string;
  title: string;
  workType: string | null;
  product: string | null;
}

function IdeaWidget() {
  const [title, setTitle] = useState("");
  const [workType, setWorkType] = useState("");
  const [saving, setSaving] = useState(false);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  async function loadIdeas() {
    const res = await fetch("/api/ideas?unscheduled=true");
    const data = await res.json();
    setIdeas(data || []);
  }

  useEffect(() => { loadIdeas(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    await fetch("/api/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), workType: workType || null }),
    });
    setTitle("");
    setWorkType("");
    setSaving(false);
    await loadIdeas();
    inputRef.current?.focus();
  }

  async function deleteIdea(id: string) {
    await fetch(`/api/ideas/${id}`, { method: "DELETE" });
    setIdeas(prev => prev.filter(i => i.id !== id));
  }

  return (
    <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
      {/* Capture form */}
      <div className="p-4 md:p-5 border-b border-amber-100">
        <p className="text-xs font-semibold text-amber-700 mb-3 tracking-wide uppercase">💡 Ghi ý tưởng nhanh</p>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Gõ ý tưởng, bấm Enter để lưu..."
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 placeholder:text-gray-300"
            />
            <button
              type="submit"
              disabled={!title.trim() || saving}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white text-sm rounded-xl font-medium transition-colors shrink-0"
            >
              {saving ? "..." : "+ Lưu"}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {WORK_TYPES.map(w => {
              const c = WORK_TYPE_COLORS[w.value];
              const active = workType === w.value;
              return (
                <button
                  key={w.value}
                  type="button"
                  onClick={() => setWorkType(active ? "" : w.value)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-all ${
                    active ? `${c.bg} ${c.text} border-current` : "bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                  {w.label}
                </button>
              );
            })}
          </div>
        </form>
      </div>

      {/* Idea list */}
      <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
        {ideas.length === 0 && (
          <p className="text-xs text-gray-400 px-5 py-4 text-center">Chưa có idea nào. Ghi ngay bên trên!</p>
        )}
        {ideas.map(idea => {
          const c = idea.workType ? WORK_TYPE_COLORS[idea.workType] : null;
          const wtLabel = idea.workType ? WORK_TYPES.find(w => w.value === idea.workType)?.label : null;
          return (
            <div key={idea.id} className="group flex items-center gap-3 px-5 py-3 hover:bg-amber-50/50 transition-colors">
              {c ? (
                <span className={`w-2 h-2 rounded-full shrink-0 ${c.dot}`} />
              ) : (
                <span className="w-2 h-2 rounded-full shrink-0 bg-gray-200" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 truncate">{idea.title}</p>
                {wtLabel && <p className="text-xs text-gray-400">{wtLabel}</p>}
              </div>
              <button
                onClick={() => deleteIdea(idea.id)}
                className="text-gray-200 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 shrink-0 transition-opacity"
              >✕</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/dashboard").then((r) => r.json()).then(setData);
  }, []);

  if (!data) return (
    <div className="max-w-4xl mx-auto space-y-6">
      <IdeaWidget />
      <div className="text-sm text-gray-400 pt-4 text-center">Đang tải...</div>
    </div>
  );

  const maxRevMonth = Math.max(...data.revenueByMonth.map((m) => m.amount), 1);
  const maxRevProduct = Math.max(...data.revenueByProduct.map((p) => p.amount), 1);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <IdeaWidget />
        <WeekSummaryWidget />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Tổng khách hàng", value: data.totalCustomers },
          { label: "Khách mới tháng này", value: data.newThisMonth },
          { label: "Đã chốt", value: data.closedCount },
          { label: "Tổng doanh thu", value: fmt(data.totalRevenue) + "đ" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className="text-xl md:text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-medium mb-4">Trạng thái khách hàng</h2>
          <div className="space-y-2">
            {STATUSES.map((s) => (
              <div key={s.value} className="flex items-center justify-between text-sm">
                <span className={`px-2 py-0.5 rounded text-xs ${s.color}`}>{s.label}</span>
                <span className="font-medium">{data.byStatus[s.value] || 0}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-medium mb-4">Doanh thu theo sản phẩm</h2>
          <div className="space-y-3">
            {data.revenueByProduct.length === 0 && <p className="text-xs text-gray-400">Chưa có dữ liệu</p>}
            {data.revenueByProduct.map((p) => (
              <div key={p.product}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600 truncate max-w-[60%]">{p.product}</span>
                  <span className="font-medium">{fmt(p.amount)}đ</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full">
                  <div
                    className="h-1.5 bg-blue-500 rounded-full"
                    style={{ width: `${(p.amount / maxRevProduct) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-medium mb-4">Doanh thu theo tháng</h2>
        {data.revenueByMonth.length === 0 ? (
          <p className="text-xs text-gray-400">Chưa có dữ liệu</p>
        ) : (
          <div className="flex items-end gap-2 h-36">
            {data.revenueByMonth.map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-gray-400">{fmt(m.amount / 1000000)}tr</span>
                <div
                  className="w-full bg-blue-500 rounded-t"
                  style={{ height: `${(m.amount / maxRevMonth) * 100}px`, minHeight: 2 }}
                />
                <span className="text-xs text-gray-400">{m.month.slice(5)}/{m.month.slice(2, 4)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
