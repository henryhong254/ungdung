// Script: gán task/idea không có assignedToId về người tạo (createdById)
// Chạy: npx ts-node scripts/fix-unassigned.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Fix ideas: nếu assignedToId null → dùng createdById
  const ideas = await prisma.idea.findMany({ where: { assignedToId: null } });
  for (const idea of ideas) {
    await prisma.idea.update({
      where: { id: idea.id },
      data: { assignedToId: idea.createdById },
    });
  }
  console.log(`Fixed ${ideas.length} ideas`);

  // Fix tasks: nếu assignedToId null → không có createdById, bỏ qua
  const tasks = await prisma.task.findMany({ where: { assignedToId: null } });
  console.log(`Found ${tasks.length} tasks with no assignee (left as-is)`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
