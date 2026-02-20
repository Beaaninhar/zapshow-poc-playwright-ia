import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Limpar testes e relatórios anteriores
  console.log('🗑️  Clearing previous tests and reports...');
  await prisma.testRun.deleteMany({});
  await prisma.test.deleteMany({});
  await prisma.runReport.deleteMany({});
  console.log('✅ Tests and reports cleared');

  // Criar usuário MASTER padrão
  const masterUser = await prisma.user.upsert({
    where: { email: 'admin@zapshow.com' },
    update: {},
    create: {
      name: 'Master Admin',
      email: 'admin@zapshow.com',
      password: 'admin123', // IMPORTANTE: Em produção, usar hash de senha!
      role: 'MASTER',
    },
  });

  console.log('✅ Master user created:', masterUser.email);

  // Criar usuário comum de exemplo
  const regularUser = await prisma.user.upsert({
    where: { email: 'user@zapshow.com' },
    update: {},
    create: {
      name: 'Regular User',
      email: 'user@zapshow.com',
      password: 'user123', // IMPORTANTE: Em produção, usar hash de senha!
      role: 'USER',
    },
  });

  console.log('✅ Regular user created:', regularUser.email);

  // Criar evento de exemplo se ainda nao existir
  const existingEvent = await prisma.event.findFirst({
    where: {
      title: 'Show de Exemplo',
      date: '2026-03-15',
      createdByUserId: masterUser.id,
    },
  });

  if (!existingEvent) {
    const event = await prisma.event.create({
      data: {
        title: 'Show de Exemplo',
        description: 'Evento de demonstração do sistema',
        date: '2026-03-15',
        price: 150.0,
        createdByUserId: masterUser.id,
        createdByName: masterUser.name,
      },
    });

    console.log('✅ Sample event created:', event.title);
  }

  console.log('🎉 Seed completed successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error during seed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
