"use client";

import { useState } from "react";
import { PRODUCTS, PRODUCT_TYPES } from "@/lib/constants";

const APPS_SCRIPT = `// Dán code này vào Google Apps Script của Sheet
// Extensions → Apps Script → paste → Save → Run

function onFormSubmit(e) {
  var sheet = e.source.getActiveSheet();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row = {};
  headers.forEach(function(h, i) {
    row[h] = e.values[i] || "";
  });

  var payload = {
    row: row,
    product: "TÊN_SẢN_PHẨM",       // thay bằng tên sản phẩm
    productType: "workshop"            // workshop | coaching | b2b | course
  };

  var options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    headers: { "x-webhook-secret": "SECRET_CỦA_BẠN" }
  };

  UrlFetchApp.fetch("https://your-domain.com/api/webhook/sheets", options);
}`;

export default function ImportPage() {
  const [csvText, setCsvText] = useState("");
  const [product, setProduct] = useState("");
  const [productType, setProductType] = useState("workshop");
  const [result, setResult] = useState<{ created: number; updated: number; errors: string[] } | null>(null);
  const [loading, setLoading] = useState(false);

  function parseCsv(text: string): Record<string, string>[] {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    return lines.slice(1).map((line) => {
      const vals = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = vals[i] || ""; });
      return row;
    });
  }

  async function handleImport() {
    setLoading(true);
    const rows = parseCsv(csvText);
    if (!rows.length) { alert("Không đọc được dữ liệu. Kiểm tra lại định dạng CSV."); setLoading(false); return; }
    const res = await fetch("/api/customers/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows, product, productType }),
    });
    const data = await res.json();
    setResult(data);
    setCsvText("");
    setLoading(false);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold">Import từ Google Sheet</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-medium">Import thủ công (CSV)</h2>
        <p className="text-xs text-gray-500">
          Vào Google Sheet → File → Download → CSV → copy toàn bộ nội dung → paste vào ô bên dưới.<br />
          Cột bắt buộc: <code className="bg-gray-100 px-1 rounded">Họ và tên</code> và <code className="bg-gray-100 px-1 rounded">SĐT</code>
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Sản phẩm (nếu có giao dịch)</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={product} onChange={(e) => {
              const p = PRODUCTS.find((x) => x.value === e.target.value);
              setProduct(e.target.value);
              if (p) setProductType(p.type);
            }}>
              <option value="">-- Không gắn giao dịch --</option>
              {PRODUCTS.map((p) => <option key={p.value} value={p.value}>{p.value}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Loại sản phẩm</label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={productType} onChange={(e) => setProductType(e.target.value)}>
              {PRODUCT_TYPES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-500 block mb-1">Nội dung CSV</label>
          <textarea
            rows={8}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={"Họ và tên,SĐT,Email,Nghề nghiệp,Lý do đăng ký\nNguyễn Văn A,0901234567,a@gmail.com,Kinh doanh,Muốn học marketing"}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
          />
        </div>

        <button
          onClick={handleImport}
          disabled={loading || !csvText.trim()}
          className="w-full py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Đang import..." : "Import"}
        </button>

        {result && (
          <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm">
            <p className="font-medium text-green-700">Xong!</p>
            <p className="text-green-600">Tạo mới: {result.created} · Đã tồn tại: {result.updated}</p>
            {result.errors.length > 0 && (
              <div className="mt-2">
                <p className="text-red-600 text-xs">Lỗi:</p>
                {result.errors.map((e, i) => <p key={i} className="text-red-500 text-xs">{e}</p>)}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <h2 className="text-sm font-medium">Tự động qua Google Apps Script</h2>
        <p className="text-xs text-gray-500">
          Cách này tự động đẩy data vào CRM mỗi khi có khách đăng ký form mới. Setup 1 lần, chạy mãi.
        </p>
        <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto whitespace-pre-wrap">{APPS_SCRIPT}</pre>
        <p className="text-xs text-gray-400">
          Thêm <code className="bg-gray-100 px-1 rounded">WEBHOOK_SECRET=xxx</code> vào file <code className="bg-gray-100 px-1 rounded">.env</code> của ứng dụng.
        </p>
      </div>
    </div>
  );
}
