import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const customers = await prisma.customer.findMany({
    include: { purchases: true, profiles: true, notes: { orderBy: { noteDate: "desc" } } },
    orderBy: { createdAt: "desc" },
  });

  const rows = [
    ["ID", "Tên", "SĐT", "Email", "Nghề nghiệp", "Nguồn", "Vấn đề ban đầu", "Phân khúc", "Trạng thái", "Tổng chi tiêu", "Số giao dịch", "Sản phẩm đã mua", "Ngày tạo"],
    ...customers.map((c) => [
      c.id,
      c.name,
      c.phone,
      c.email || "",
      c.occupation || "",
      c.source || "",
      c.initialProblem || "",
      c.segment || "",
      c.status,
      c.purchases.reduce((s, p) => s + p.amount, 0),
      c.purchases.length,
      c.purchases.map((p) => p.product).join(" | "),
      new Date(c.createdAt).toLocaleDateString("vi-VN"),
    ]),
  ];

  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const bom = "﻿";

  return new NextResponse(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="khach-hang-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
