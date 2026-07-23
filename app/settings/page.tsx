"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const [telegramChatId, setTelegramChatId] = useState("");
  const [hasPush, setHasPush] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingTelegram, setSavingTelegram] = useState(false);
  const [savingPush, setSavingPush] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api("/api/settings")
      .then(r => r.json())
      .then(data => {
        setTelegramChatId(data.telegramChatId || "");
        setHasPush(data.hasPush || false);
        setLoading(false);
      });
  }, []);

  async function saveTelegram() {
    setSavingTelegram(true);
    setMsg("");
    try {
      await api("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateTelegram", telegramChatId }),
      });
      setMsg("Đã lưu Telegram Chat ID");
    } catch (e) {
      setMsg("Lỗi khi lưu Telegram");
    }
    setSavingTelegram(false);
  }

  // Khởi tạo Web Push (thường dùng hàm urlBase64ToUint8Array để encode VAPID)
  function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  async function subscribeWebPush() {
    if (!("serviceWorker" in navigator)) {
      alert("Trình duyệt không hỗ trợ Service Worker");
      return;
    }
    setSavingPush(true);
    setMsg("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert("Bạn đã từ chối quyền gửi thông báo");
        setSavingPush(false);
        return;
      }
      
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Cần NEXT_PUBLIC_VAPID_PUBLIC_KEY
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
      if (!vapidPublicKey) {
        alert("Chưa cấu hình VAPID Key trên hệ thống");
        setSavingPush(false);
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      await api("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "subscribeWebPush", 
          subscription: subscription,
          userAgent: navigator.userAgent
        }),
      });

      setHasPush(true);
      setMsg("Đăng ký nhận thông báo trình duyệt thành công!");
    } catch (e: any) {
      console.error(e);
      alert("Lỗi: " + e.message);
    }
    setSavingPush(false);
  }

  if (loading) return <div className="p-4">Đang tải...</div>;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      <h1 className="text-xl md:text-2xl font-semibold mb-6">Cài đặt Thông báo</h1>

      {msg && (
        <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm mb-4">
          {msg}
        </div>
      )}

      {/* Telegram */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">✈️</span>
          <div>
            <h2 className="font-medium text-lg">Thông báo qua Telegram</h2>
            <p className="text-sm text-gray-500">Nhận thông báo khi sắp đến giờ làm việc qua ứng dụng Telegram</p>
          </div>
        </div>
        
        <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm">
          <strong>Hướng dẫn:</strong>
          <ul className="list-disc ml-5 mt-1">
            <li>Mở Telegram, tìm bot <b>@userinfobot</b> và bấm Start để lấy Chat ID của bạn.</li>
            <li>Copy dãy số Chat ID đó dán vào ô bên dưới.</li>
            <li>Mở bot của hệ thống (hãy liên hệ admin để lấy link bot) và bấm Start để cho phép bot gửi tin nhắn.</li>
          </ul>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telegram Chat ID</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" 
              value={telegramChatId} 
              onChange={e => setTelegramChatId(e.target.value)} 
              placeholder="Ví dụ: 123456789"
            />
            <button 
              onClick={saveTelegram}
              disabled={savingTelegram}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {savingTelegram ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </div>
      </div>

      {/* Web Push */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🖥️</span>
          <div>
            <h2 className="font-medium text-lg">Thông báo Trình duyệt</h2>
            <p className="text-sm text-gray-500">Hiển thị thông báo (Notification) ở góc màn hình máy tính</p>
          </div>
        </div>

        <div className="bg-yellow-50 text-yellow-800 p-3 rounded-lg text-sm">
          <strong>Lưu ý:</strong>
          <ul className="list-disc ml-5 mt-1">
            <li>Bạn cần bấm "Bật thông báo" và cấp quyền (Allow) khi trình duyệt hỏi.</li>
            <li>Nếu dùng iPhone/iPad, bạn cần chọn "Thêm vào Màn hình chính" (Add to Home Screen) trước rồi mới bật thông báo trong ứng dụng đó được.</li>
          </ul>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Trạng thái thiết bị này:</p>
            {hasPush ? (
              <span className="text-sm text-green-600 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span> Đã đăng ký nhận
              </span>
            ) : (
              <span className="text-sm text-gray-500 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-400"></span> Chưa đăng ký
              </span>
            )}
          </div>
          <button 
            onClick={subscribeWebPush}
            disabled={savingPush}
            className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {savingPush ? "Đang xử lý..." : "Bật thông báo cho máy này"}
          </button>
        </div>
      </div>

    </div>
  );
}
