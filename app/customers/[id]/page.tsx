"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { STATUSES, SEGMENTS, SOURCES, PRODUCTS, PRODUCT_TYPES, COACHING_FIELDS, B2B_FIELDS } from "@/lib/constants";

interface Purchase { id: string; product: string; productType: string; amount: number; purchasedAt: string; }
interface Profile { id: string; productType: string; data: string; createdAt: string; }
interface Note { id: string; content: string; noteDate: string; }
interface Customer {
  id: string; name: string; phone: string; email: string | null;
  occupation: string | null; source: string | null; initialProblem: string | null;
  segment: string | null; status: string; createdAt: string;
  purchases: Purchase[]; profiles: Profile[]; notes: Note[];
}

function fmt(n: number) { return new Intl.NumberFormat("vi-VN").format(Math.round(n)); }
function statusLabel(v: string) { return STATUSES.find((s) => s.value === v)?.label || v; }
function statusColor(v: string) { return STATUSES.find((s) => s.value === v)?.color || "bg-gray-100 text-gray-600"; }
function segmentLabel(v: string | null) { return SEGMENTS.find((s) => s.value === v)?.label || v || ""; }
function segmentColor(v: string | null) { return SEGMENTS.find((s) => s.value === v)?.color || "bg-gray-100 text-gray-600"; }
function sourceLabel(v: string | null) { return SOURCES.find((s) => s.value === v)?.label || v || ""; }
function productTypeLabel(v: string) { return PRODUCT_TYPES.find((p) => p.value === v)?.label || v; }

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Customer>>({});

  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const [purchaseForm, setPurchaseForm] = useState({ product: "", productType: "", amount: "", purchasedAt: "" });
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);

  const [profileForms, setProfileForms] = useState<Record<string, Record<string, string>>>({});
  const [savingProfile, setSavingProfile] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`/api/customers/${id}`).then((r) => r.json()).then((c: Customer) => {
      setCustomer(c);
      setEditForm(c);
      const pf: Record<string, Record<string, string>> = {};
      for (const p of c.profiles) {
        try { pf[p.productType] = JSON.parse(p.data); } catch { pf[p.productType] = {}; }
      }
      setProfileForms(pf);
    });
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function saveEdit() {
    await fetch(`/api/customers/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editForm) });
    setEditing(false);
    load();
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!noteText.trim()) return;
    setSavingNote(true);
    await fetch(`/api/customers/${id}/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: noteText }) });
    setNoteText("");
    setSavingNote(false);
    load();
  }

  async function deleteNote(noteId: string) {
    await fetch(`/api/customers/${id}/notes?noteId=${noteId}`, { method: "DELETE" });
    load();
  }

  async function addPurchase(e: React.FormEvent) {
    e.preventDefault();
    const selected = PRODUCTS.find((p) => p.value === purchaseForm.product);
    await fetch(`/api/customers/${id}/purchases`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...purchaseForm, productType: selected?.type || purchaseForm.productType }),
    });
    setPurchaseForm({ product: "", productType: "", amount: "", purchasedAt: "" });
    setShowPurchaseForm(false);
    load();
  }

  async function deletePurchase(purchaseId: string) {
    await fetch(`/api/customers/${id}/purchases?purchaseId=${purchaseId}`, { method: "DELETE" });
    load();
  }

  async function saveProfile(productType: string) {
    setSavingProfile(productType);
    await fetch(`/api/customers/${id}/profiles`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productType, data: profileForms[productType] || {} }),
    });
    setSavingProfile(null);
    load();
  }

  async function deleteCustomer() {
    if (!confirm("Xóa khách hàng này?")) return;
    await fetch(`/api/customers/${id}`, { method: "DELETE" });
    router.push("/customers");
  }

  if (!customer) return <div className="text-sm text-gray-400 pt-8 text-center">Đang tải...</div>;

  const totalSpent = customer.purchases.reduce((s, p) => s + p.amount, 0);
  const hasCoaching = customer.purchases.some((p) => p.productType === "coaching");
  const hasB2B = customer.purchases.some((p) => p.productType === "b2b");

  const initials = customer.name.split(" ").slice(-2).map((w) => w[0]).join("").toUpperCase();

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <button onClick={() => router.push("/customers")} className="hover:text-gray-600">← Danh sách</button>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
              {initials}
            </div>
            <div>
              {editing ? (
                <input className="font-semibold text-lg border-b border-gray-300 focus:outline-none focus:border-blue-500" value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              ) : (
                <h1 className="font-semibold text-lg">{customer.name}</h1>
              )}
              <p className="text-sm text-gray-500">{customer.phone} {customer.email && `· ${customer.email}`}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-xs ${segmentColor(customer.segment)}`}>{segmentLabel(customer.segment)}</span>
            <span className={`px-2 py-0.5 rounded text-xs ${statusColor(customer.status)}`}>{statusLabel(customer.status)}</span>
            {editing ? (
              <button onClick={saveEdit} className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg">Lưu</button>
            ) : (
              <button onClick={() => setEditing(true)} className="px-3 py-1 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Sửa</button>
            )}
            <button onClick={deleteCustomer} className="px-3 py-1 text-xs border border-red-200 text-red-500 rounded-lg hover:bg-red-50">Xóa</button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { label: "Tổng chi tiêu", value: fmt(totalSpent) + "đ" },
            { label: "Số giao dịch", value: customer.purchases.length + " đơn" },
            { label: "Khách từ", value: sourceLabel(customer.source) },
          ].map((s) => (
            <div key={s.label} className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-0.5">{s.label}</p>
              <p className="font-medium text-sm">{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Thông tin chung */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <span className="text-sm font-medium">Thông tin chung</span>
        </div>
        <div className="p-5 grid grid-cols-2 gap-4 text-sm">
          {editing ? (
            <>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Nghề nghiệp</label>
                <input className="w-full border rounded-lg px-3 py-1.5 text-sm" value={editForm.occupation || ""} onChange={(e) => setEditForm({ ...editForm, occupation: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Trạng thái</label>
                <select className="w-full border rounded-lg px-3 py-1.5 text-sm" value={editForm.status || ""} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                  {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Phân khúc</label>
                <select className="w-full border rounded-lg px-3 py-1.5 text-sm" value={editForm.segment || ""} onChange={(e) => setEditForm({ ...editForm, segment: e.target.value })}>
                  <option value="">--</option>
                  {SEGMENTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Nguồn</label>
                <select className="w-full border rounded-lg px-3 py-1.5 text-sm" value={editForm.source || ""} onChange={(e) => setEditForm({ ...editForm, source: e.target.value })}>
                  <option value="">--</option>
                  {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500 block mb-1">Vấn đề ban đầu</label>
                <textarea rows={2} className="w-full border rounded-lg px-3 py-1.5 text-sm resize-none" value={editForm.initialProblem || ""} onChange={(e) => setEditForm({ ...editForm, initialProblem: e.target.value })} />
              </div>
            </>
          ) : (
            <>
              <div><p className="text-xs text-gray-400 mb-0.5">Nghề nghiệp</p><p>{customer.occupation || "—"}</p></div>
              <div><p className="text-xs text-gray-400 mb-0.5">Nguồn</p><p>{sourceLabel(customer.source) || "—"}</p></div>
              <div className="col-span-2"><p className="text-xs text-gray-400 mb-0.5">Vấn đề ban đầu</p><p>{customer.initialProblem || "—"}</p></div>
            </>
          )}
        </div>
      </div>

      {/* Lịch sử mua hàng */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <span className="text-sm font-medium">Lịch sử mua hàng</span>
          <button onClick={() => setShowPurchaseForm(!showPurchaseForm)} className="text-xs text-blue-600 hover:underline">+ Thêm</button>
        </div>
        {showPurchaseForm && (
          <form onSubmit={addPurchase} className="p-4 border-b border-gray-100 bg-blue-50 grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Sản phẩm</label>
              <select required className="w-full border rounded-lg px-3 py-1.5 text-sm" value={purchaseForm.product} onChange={(e) => setPurchaseForm({ ...purchaseForm, product: e.target.value })}>
                <option value="">-- Chọn --</option>
                {PRODUCTS.map((p) => <option key={p.value} value={p.value}>{p.value}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Số tiền (đ)</label>
              <input required type="number" className="w-full border rounded-lg px-3 py-1.5 text-sm" value={purchaseForm.amount} onChange={(e) => setPurchaseForm({ ...purchaseForm, amount: e.target.value })} placeholder="0" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Ngày mua</label>
              <input type="date" className="w-full border rounded-lg px-3 py-1.5 text-sm" value={purchaseForm.purchasedAt} onChange={(e) => setPurchaseForm({ ...purchaseForm, purchasedAt: e.target.value })} />
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg">Lưu</button>
              <button type="button" onClick={() => setShowPurchaseForm(false)} className="px-4 py-1.5 border border-gray-200 text-sm rounded-lg hover:bg-gray-50">Hủy</button>
            </div>
          </form>
        )}
        <div className="divide-y divide-gray-50">
          {customer.purchases.length === 0 && <p className="text-sm text-gray-400 p-5">Chưa có giao dịch</p>}
          {customer.purchases.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{productTypeLabel(p.productType)}</span>
                <span className="text-sm">{p.product}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-medium">{fmt(p.amount)}đ</p>
                  <p className="text-xs text-gray-400">{new Date(p.purchasedAt).toLocaleDateString("vi-VN")}</p>
                </div>
                <button onClick={() => deletePurchase(p.id)} className="text-gray-300 hover:text-red-400 text-xs">✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Coaching profile */}
      {hasCoaching && (
        <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-amber-100 bg-amber-50 flex items-center gap-2">
            <span className="text-sm font-medium text-amber-800">Coaching profile</span>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4">
            {COACHING_FIELDS.map((f) => (
              <div key={f.key} className={f.key === "mainProblem" ? "col-span-2" : ""}>
                <label className="text-xs text-gray-500 block mb-1">{f.label}</label>
                {f.key === "mainProblem" ? (
                  <textarea rows={2} className="w-full border rounded-lg px-3 py-1.5 text-sm resize-none" value={profileForms["coaching"]?.[f.key] || ""} onChange={(e) => setProfileForms({ ...profileForms, coaching: { ...profileForms["coaching"], [f.key]: e.target.value } })} />
                ) : (
                  <input className="w-full border rounded-lg px-3 py-1.5 text-sm" value={profileForms["coaching"]?.[f.key] || ""} onChange={(e) => setProfileForms({ ...profileForms, coaching: { ...profileForms["coaching"], [f.key]: e.target.value } })} />
                )}
              </div>
            ))}
            <div className="col-span-2">
              <button onClick={() => saveProfile("coaching")} disabled={savingProfile === "coaching"} className="px-4 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 disabled:opacity-50">
                {savingProfile === "coaching" ? "Đang lưu..." : "Lưu profile"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* B2B profile */}
      {hasB2B && (
        <div className="bg-white rounded-xl border border-violet-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-violet-100 bg-violet-50 flex items-center gap-2">
            <span className="text-sm font-medium text-violet-800">Doanh nghiệp profile</span>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4">
            {B2B_FIELDS.map((f) => (
              <div key={f.key} className={f.key === "trainingNeed" ? "col-span-2" : ""}>
                <label className="text-xs text-gray-500 block mb-1">{f.label}</label>
                {f.key === "trainingNeed" ? (
                  <textarea rows={2} className="w-full border rounded-lg px-3 py-1.5 text-sm resize-none" value={profileForms["b2b"]?.[f.key] || ""} onChange={(e) => setProfileForms({ ...profileForms, b2b: { ...profileForms["b2b"], [f.key]: e.target.value } })} />
                ) : (
                  <input className="w-full border rounded-lg px-3 py-1.5 text-sm" value={profileForms["b2b"]?.[f.key] || ""} onChange={(e) => setProfileForms({ ...profileForms, b2b: { ...profileForms["b2b"], [f.key]: e.target.value } })} />
                )}
              </div>
            ))}
            <div className="col-span-2">
              <button onClick={() => saveProfile("b2b")} disabled={savingProfile === "b2b"} className="px-4 py-1.5 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 disabled:opacity-50">
                {savingProfile === "b2b" ? "Đang lưu..." : "Lưu profile"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ghi chú */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <span className="text-sm font-medium">Ghi chú</span>
        </div>
        <div className="p-5 space-y-4">
          <form onSubmit={addNote} className="flex gap-2">
            <textarea
              rows={2}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Thêm ghi chú từ buổi gặp..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
            />
            <button type="submit" disabled={savingNote} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg self-end hover:bg-blue-700 disabled:opacity-50">
              Lưu
            </button>
          </form>
          <div className="space-y-3">
            {customer.notes.map((n) => (
              <div key={n.id} className="flex gap-3 group">
                <p className="text-xs text-gray-400 whitespace-nowrap pt-0.5 w-20 shrink-0">{new Date(n.noteDate).toLocaleDateString("vi-VN")}</p>
                <p className="text-sm text-gray-700 flex-1">{n.content}</p>
                <button onClick={() => deleteNote(n.id)} className="text-gray-200 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 shrink-0">✕</button>
              </div>
            ))}
            {customer.notes.length === 0 && <p className="text-sm text-gray-400">Chưa có ghi chú</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
