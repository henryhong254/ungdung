import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const segment = searchParams.get("segment") || "";

  const customers = await prisma.customer.findMany({
    where: {
      AND: [
        search ? {
          OR: [
            { name: { contains: search } },
            { phone: { contains: search } },
            { email: { contains: search } },
          ],
        } : {},
        status ? { status } : {},
        segment ? { segment } : {},
      ],
    },
    include: {
      purchases: true,
      notes: { orderBy: { noteDate: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  const result = customers.map((c) => ({
    ...c,
    totalSpent: c.purchases.reduce((sum, p) => sum + p.amount, 0),
    purchaseCount: c.purchases.length,
    lastNote: c.notes[0] || null,
  }));

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const customer = await prisma.customer.create({
    data: {
      name: body.name,
      phone: body.phone,
      email: body.email || null,
      occupation: body.occupation || null,
      source: body.source || null,
      initialProblem: body.initialProblem || null,
      segment: body.segment || "moi",
      status: body.status || "moi-dang-ky",
    },
  });
  return NextResponse.json(customer, { status: 201 });
}
