import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.TARGET_USER_EMAIL;
  const newPassword = process.env.NEW_USER_PASSWORD;

  if (!email || !newPassword) {
    throw new Error(
      'Set TARGET_USER_EMAIL and NEW_USER_PASSWORD before running this script.',
    );
  }

  if (newPassword.length < 12) {
    throw new Error('NEW_USER_PASSWORD must contain at least 12 characters.');
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  const result = await prisma.user.updateMany({
    where: { email },
    data: { passwordHash },
  });

  if (result.count !== 1) {
    throw new Error(`Expected one matching user, found ${result.count}.`);
  }

  console.log(`Password updated for ${email}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
