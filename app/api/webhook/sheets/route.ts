import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Google Apps Script gọi endpoint này khi có row mới trong Sheet
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-webhook-secret");
  if (secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { row, product, productType } = body as {
    row: Record<string, string>;
    product: string;
    productType: string;
  };

  const phone = (row["SĐT"] || row["sdt"] || row["phone"] || "").trim();
  const name = (row["Họ và tên"] || row["Tên"] || row["name"] || "").trim();

  if (!phone || !name) {
    return NextResponse.json({ error: "Missing phone or name" }, { status: 400 });
  }

  let customer = await prisma.customer.findUnique({ where: { phone } });

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        name,
        phone,
        email: row["Email"] || null,
        occupation: row["Nghề nghiệp"] || null,
        source: row["Nguồn"] || row["Biết đến qua"] || null,
        initialProblem: row["Vấn đề"] || row["Lý do đăng ký"] || null,
        segment: "moi",
        status: "moi-dang-ky",
      },
    });
  }

  const amount = parseFloat(row["Số tiền"] || row["amount"] || "0") || 0;
  if (amount > 0) {
    await prisma.purchase.create({
      data: { customerId: customer.id, product, productType, amount },
    });
  }

  return NextResponse.json({ ok: true, customerId: customer.id });
}
