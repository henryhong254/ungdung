import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const profile = await prisma.customerProfile.upsert({
    where: { customerId_productType: { customerId: id, productType: body.productType } },
    update: { data: JSON.stringify(body.data) },
    create: {
      customerId: id,
      productType: body.productType,
      data: JSON.stringify(body.data),
    },
  });
  return NextResponse.json(profile);
}
