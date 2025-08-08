import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const username = 'admin';
  const password = 'admin';

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  await prisma.user.upsert({
    where: { username },
    update: {},
    create: {
      username,
      passwordHash,
      isActive: true,
    },
  });

  const count = await prisma.notifySetting.count();
  if (count === 0) {
    await prisma.notifySetting.create({
      data: {
        enabled: false,
        channel: 'telegram',
        threshold15: true,
        threshold30: true,
        threshold90: true,
        threshold180: true,
      },
    });
  }

  console.log('Seeded: default admin/admin and notify setting.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
