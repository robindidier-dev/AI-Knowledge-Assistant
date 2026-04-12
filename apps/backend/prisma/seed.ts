import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? '',
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'test@lumina.dev' },
    update: {},
    create: {
      email: 'test@lumina.dev',
      password: 'hashed_later',
    },
  });

  console.log('Seeded user:', user);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
