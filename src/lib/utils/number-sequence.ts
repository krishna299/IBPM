import prisma from "@/lib/db/prisma";

export async function generateNumber(prefix: string): Promise<string> {
  const sequence = await prisma.numberSequence.upsert({
    where: { prefix },
    update: { lastNum: { increment: 1 } },
    create: { prefix, lastNum: 1, padLength: 4 },
  });

  const year = new Date().getFullYear();
  const num = String(sequence.lastNum).padStart(sequence.padLength, "0");
  return `${prefix}-${year}-${num}`;
}
