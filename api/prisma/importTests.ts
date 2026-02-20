import { PrismaClient } from "@prisma/client";
import { readSpecsFromTestsDir } from "../src/runner/specReader";

const prisma = new PrismaClient();

async function main() {
  const specs = await readSpecsFromTestsDir();
  if (!specs.length) {
    console.log("No specs found in /tests.");
    return;
  }

  for (const spec of specs) {
    const definition = {
      name: spec.name?.trim() || spec.id,
      steps: spec.steps,
    };

    await prisma.testVersion.upsert({
      where: { testId_version: { testId: spec.id, version: 1 } },
      update: {
        definition: JSON.stringify(definition),
      },
      create: {
        testId: spec.id,
        version: 1,
        definition: JSON.stringify(definition),
      },
    });
  }

  console.log(`Imported ${specs.length} test(s) from /tests.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Failed to import tests:", error);
    await prisma.$disconnect();
    process.exit(1);
  });