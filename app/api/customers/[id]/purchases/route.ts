import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const purchase = await prisma.purchase.create({
    data: {
      customerId: id,
      product: body.product,
      productType: body.productType,
      amount: Number(body.amount),
      purchasedAt: body.purchasedAt ? new Date(body.purchasedAt) : new Date(),
    },
  });
  return NextResponse.json(purchase, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { searchParams } = new URL(req.url);
  const purchaseId = searchParams.get("purchaseId");
  if (!purchaseId) return NextResponse.json({ error: "purchaseId required" }, { status: 400 });
  await prisma.purchase.delete({ where: { id: purchaseId } });
  return NextResponse.json({ ok: true });
}
