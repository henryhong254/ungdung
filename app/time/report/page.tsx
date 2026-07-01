"use client";

import { useEffect, useState, useCallback } from "react";
import { WORK_TYPES } from "@/lib/constants";

interface Stats {
  totalMinutes: number;
  totalEntries: number;
  byProduct: { product: string; minutes: number }[];
  byWorkType: { workType: string; minutes: number }[];
  byUser: { name: string; minutes: number }[];
  byDay: { day: string; minutes: number }[];
}

function fmtH(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}p`;
  if (m === 0) return `${h}g`;
  return `${h}g ${m}p`;
}

function workTypeLabel(v: string) {
  return WORK_TYPES.find((w) => w.value === v)?.label || v;
}

export default function TimeReportPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [range, setRange] = useState("30");

  const load = useCallback(() => {
    const from = new Date(Date.now() - Number(range) * 86400000).toISOString();
    fetch(`/api/time/stats?from=${from}`).then((r) => r.json()).then(setStats);
  }, [range]);

  useEffect(() => { load(); }, [load]);

  if (!stats) return <div className="text-sm text-gray-400 pt-8 text-center">Đang tải...</div>;

  const maxProduct = Math.max(...stats.byProduct.map((p) => p.minutes), 1);
  const maxDay = Math.max(...stats.byDay.map((d) => d.minutes), 1);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Báo cáo giờ làm việc</h1>
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          value={range} onChange={(e) => setRange(e.target.value)}
        >
          <option value="7">7 ngày qua</option>
          <option value="30">30 ngày qua</option>
          <option value="90">3 tháng qua</option>
        </select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Tổng giờ", value: fmtH(stats.totalMinutes) },
          { label: "Số session", value: stats.totalEntries },
          { label: "TB/session", value: stats.totalEntries ? fmtH(Math.round(stats.totalMinutes / stats.totalEntries)) : "—" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className="text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Theo sản phẩm */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-medium mb-4">Giờ theo sản phẩm</h2>
          <div className="space-y-3">
            {stats.byProduct.length === 0 && <p className="text-xs text-gray-400">Chưa có dữ liệu</p>}
            {stats.byProduct.map((p) => (
              <div key={p.product}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600 truncate max-w-[65%]">{p.product}</span>
                  <span className="font-medium">{fmtH(p.minutes)}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full">
                  <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${(p.minutes / maxProduct) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Theo loại công việc */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-medium mb-4">Giờ theo loại công việc</h2>
          <div className="space-y-2">
            {stats.byWorkType.length === 0 && <p className="text-xs text-gray-400">Chưa có dữ liệu</p>}
            {stats.byWorkType.map((w) => (
              <div key={w.workType} className="flex items-center justify-between text-sm">
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{workTypeLabel(w.workType)}</span>
                <span className="font-medium text-sm">{fmtH(w.minutes)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Theo người */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-medium mb-4">Giờ theo thành viên</h2>
        <div className="space-y-3">
          {stats.byUser.length === 0 && <p className="text-xs text-gray-400">Chưa có dữ liệu</p>}
          {stats.byUser.map((u) => (
            <div key={u.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-semibold">
                  {u.name.split(" ").slice(-1)[0][0]}
                </div>
                <span className="text-sm">{u.name}</span>
              </div>
              <span className="font-medium text-sm">{fmtH(u.minutes)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Theo ngày */}
      {stats.byDay.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-medium mb-4">Hoạt động theo ngày</h2>
          <div className="flex items-end gap-1.5 h-28">
            {stats.byDay.slice(-14).map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-blue-400 rounded-t"
                  style={{ height: `${(d.minutes / maxDay) * 80}px`, minHeight: 2 }}
                  title={`${d.day}: ${fmtH(d.minutes)}`}
                />
                <span className="text-xs text-gray-400 rotate-0" style={{ fontSize: 10 }}>
                  {new Date(d.day).getDate()}/{new Date(d.day).getMonth() + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
