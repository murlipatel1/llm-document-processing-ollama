import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo-tenant" },
    update: {},
    create: { name: "Demo Tenant", slug: "demo-tenant" }
  });

  const password = await bcrypt.hash("Admin@12345", 10);

  await prisma.user.upsert({
    where: { email: "admin@demo.local" },
    update: {},
    create: {
      email: "admin@demo.local",
      password,
      role: "ADMIN",
      tenantId: tenant.id
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
