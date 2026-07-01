import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const rows: Record<string, string>[] = body.rows;
  const productTag: string = body.product || "";
  const productType: string = body.productType || "workshop";

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const phone = (row["SĐT"] || row["sdt"] || row["phone"] || "").trim();
    const name = (row["Họ và tên"] || row["Tên"] || row["name"] || "").trim();
    if (!phone || !name) continue;

    try {
      const existing = await prisma.customer.findUnique({ where: { phone } });
      if (existing) {
        updated++;
      } else {
        await prisma.customer.create({
          data: {
            name,
            phone,
            email: row["Email"] || row["email"] || null,
            occupation: row["Nghề nghiệp"] || null,
            source: row["Nguồn"] || null,
            initialProblem: row["Vấn đề"] || row["Lý do đăng ký"] || null,
            segment: "moi",
            status: "moi-dang-ky",
          },
        });
        created++;
      }

      if (productTag) {
        const customer = await prisma.customer.findUnique({ where: { phone } });
        if (customer) {
          const amount = parseFloat(row["Số tiền"] || row["amount"] || "0") || 0;
          if (amount > 0) {
            await prisma.purchase.create({
              data: {
                customerId: customer.id,
                product: productTag,
                productType,
                amount,
              },
            });
          }
        }
      }
    } catch (e) {
      errors.push(`${name} (${phone}): ${e}`);
    }
  }

  return NextResponse.json({ created, updated, errors });
}
