"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { STATUSES, SEGMENTS, SOURCES } from "@/lib/constants";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  occupation: string | null;
  source: string | null;
  status: string;
  segment: string | null;
  totalSpent: number;
  purchaseCount: number;
  createdAt: string;
}

function fmt(n: number) {
  return new Intl.NumberFormat("vi-VN").format(Math.round(n));
}

function statusBadge(val: string) {
  return STATUSES.find((s) => s.value === val)?.color || "bg-gray-100 text-gray-600";
}
function statusLabel(val: string) {
  return STATUSES.find((s) => s.value === val)?.label || val;
}
function segmentLabel(val: string | null) {
  return SEGMENTS.find((s) => s.value === val)?.label || val || "";
}
function segmentColor(val: string | null) {
  return SEGMENTS.find((s) => s.value === val)?.color || "bg-gray-100 text-gray-600";
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [segment, setSegment] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", occupation: "", source: "", initialProblem: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (segment) params.set("segment", segment);
    fetch(`/api/customers?${params}`).then((r) => r.json()).then(setCustomers);
  }, [search, status, segment]);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    setShowForm(false);
    setForm({ name: "", phone: "", email: "", occupation: "", source: "", initialProblem: "" });
    load();
  }

  async function handleExport() {
    const res = await fetch("/api/customers/export");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `khach-hang-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Khách hàng</h1>
        <div className="flex gap-2">
          <button onClick={handleExport} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            Export CSV
          </button>
          <button onClick={() => setShowForm(true)} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            + Thêm khách
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <input
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Tìm theo tên, SĐT, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Tất cả trạng thái</option>
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
          value={segment}
          onChange={(e) => setSegment(e.target.value)}
        >
          <option value="">Tất cả phân khúc</option>
          {SEGMENTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Khách hàng</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">SĐT</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Phân khúc</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Trạng thái</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Giao dịch</th>
              <th className="text-right px-4 py-3 text-xs text-gray-500 font-medium">Tổng chi tiêu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {customers.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400 text-sm">Chưa có khách hàng</td></tr>
            )}
            {customers.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/customers/${c.id}`} className="font-medium hover:text-blue-600">{c.name}</Link>
                  {c.email && <p className="text-xs text-gray-400">{c.email}</p>}
                </td>
                <td className="px-4 py-3 text-gray-600">{c.phone}</td>
                <td className="px-4 py-3">
                  {c.segment && (
                    <span className={`px-2 py-0.5 rounded text-xs ${segmentColor(c.segment)}`}>
                      {segmentLabel(c.segment)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${statusBadge(c.status)}`}>
                    {statusLabel(c.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600">{c.purchaseCount} đơn</td>
                <td className="px-4 py-3 text-right font-medium">{fmt(c.totalSpent)}đ</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-semibold mb-4">Thêm khách hàng</h2>
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Tên *</label>
                  <input required className="w-full border rounded-lg px-3 py-2 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">SĐT *</label>
                  <input required className="w-full border rounded-lg px-3 py-2 text-sm" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Email</label>
                <input type="email" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Nghề nghiệp</label>
                <input className="w-full border rounded-lg px-3 py-2 text-sm" value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Biết đến qua</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                  <option value="">--</option>
                  {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Vấn đề ban đầu</label>
                <textarea rows={2} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" value={form.initialProblem} onChange={(e) => setForm({ ...form, initialProblem: e.target.value })} />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm hover:bg-gray-50">Hủy</button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm hover:bg-blue-700 disabled:opacity-50">
                  {saving ? "Đang lưu..." : "Lưu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
