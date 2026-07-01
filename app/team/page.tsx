"use client";

import { useEffect, useState, useCallback } from "react";
import { ROLES } from "@/lib/constants";
import { api } from "@/lib/api";

interface User { id: string; name: string; email: string; role: string; active: boolean; }

export default function TeamPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "assistant" });
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ name: "", role: "", password: "" });
  const [editShowPw, setEditShowPw] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const load = useCallback(async () => {
    const r = await api("/api/users");
    if (r.ok) {
      const data = await r.json();
      if (Array.isArray(data)) setUsers(data);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const res = await api("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFormError(data.error || `Lỗi ${res.status}, vui lòng thử lại`);
        setSaving(false);
        return;
      }
    } catch {
      setFormError("Không kết nối được server");
      setSaving(false);
      return;
    }
    setSaving(false);
    setShowForm(false);
    setShowPw(false);
    setForm({ name: "", email: "", password: "", role: "assistant" });
    await load();
  }

  function openEdit(u: User) {
    setEditingUser(u);
    setEditForm({ name: u.name, role: u.role, password: "" });
    setEditError("");
    setEditShowPw(false);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setEditSaving(true);
    setEditError("");
    try {
      const body: Record<string, string> = { name: editForm.name, role: editForm.role };
      if (editForm.password) body.password = editForm.password;
      const res = await api(`/api/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setEditError(data.error || `Lỗi ${res.status}`);
        setEditSaving(false);
        return;
      }
    } catch {
      setEditError("Không kết nối được server");
      setEditSaving(false);
      return;
    }
    setEditSaving(false);
    setEditingUser(null);
    await load();
  }

  async function toggleActive(u: User) {
    await api(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !u.active }),
    });
    load();
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Quản lý team</h1>
        <button onClick={() => { setShowForm(true); setFormError(""); setShowPw(false); }} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          + Thêm thành viên
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Tên</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Email</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Role</th>
              <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Trạng thái</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-sm">Chưa có thành viên</td></tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-semibold">
                      {u.name.split(" ").slice(-1)[0][0]}
                    </div>
                    <span className="font-medium">{u.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${u.role === "expert" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"}`}>
                    {ROLES.find((r) => r.value === u.role)?.label || u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${u.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                    {u.active ? "Hoạt động" : "Vô hiệu"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                  <button onClick={() => openEdit(u)} className="text-xs text-blue-500 hover:text-blue-700 border border-blue-200 px-2 py-1 rounded">
                    Sửa
                  </button>
                  <button onClick={() => toggleActive(u)} className="text-xs text-gray-400 hover:text-gray-700 border border-gray-200 px-2 py-1 rounded">
                    {u.active ? "Vô hiệu hoá" : "Kích hoạt"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal thêm thành viên */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-semibold mb-4">Thêm thành viên</h2>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Tên *</label>
                <input required className="w-full border rounded-lg px-3 py-2 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Email *</label>
                <input required type="email" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Mật khẩu *</label>
                <div className="relative">
                  <input required type={showPw ? "text" : "password"} className="w-full border rounded-lg px-3 py-2 pr-14 text-sm" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                  <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowPw((v) => !v); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-600 hover:text-blue-800 px-2 py-1 cursor-pointer select-none">
                    {showPw ? "Ẩn" : "Hiện"}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Role</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              {formError && <p className="text-xs text-red-500">{formError}</p>}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm hover:bg-gray-50">Hủy</button>
                <button type="submit" disabled={saving} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm hover:bg-blue-700 disabled:opacity-50">
                  {saving ? "Đang lưu..." : "Tạo tài khoản"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal sửa thành viên */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setEditingUser(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-semibold mb-4">Sửa thành viên</h2>
            <form onSubmit={handleEdit} className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Tên *</label>
                <input required className="w-full border rounded-lg px-3 py-2 text-sm" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Email</label>
                <input disabled className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400" value={editingUser.email} />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Role</label>
                <select className="w-full border rounded-lg px-3 py-2 text-sm" value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                  {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Mật khẩu mới (để trống nếu không đổi)</label>
                <div className="relative">
                  <input type={editShowPw ? "text" : "password"} className="w-full border rounded-lg px-3 py-2 pr-14 text-sm" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} />
                  <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditShowPw((v) => !v); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-600 hover:text-blue-800 px-2 py-1 cursor-pointer select-none">
                    {editShowPw ? "Ẩn" : "Hiện"}
                  </button>
                </div>
              </div>
              {editError && <p className="text-xs text-red-500">{editError}</p>}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setEditingUser(null)} className="flex-1 border border-gray-200 rounded-lg py-2 text-sm hover:bg-gray-50">Hủy</button>
                <button type="submit" disabled={editSaving} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm hover:bg-blue-700 disabled:opacity-50">
                  {editSaving ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
