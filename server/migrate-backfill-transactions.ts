import "dotenv/config";
import { db } from "./db.js";
import { clientServices, subPackages, transactions } from "../shared/schema.js";
import { eq, and, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";

async function backfill() {
  console.log("🔍 Finding completed services without income transactions...");

  const allServices = await db.select().from(clientServices);
  const completedServices = allServices.filter(s => s.status === "completed" && s.price && s.currency);

  console.log(`  Total completed services with price: ${completedServices.length}`);

  let created = 0;
  let skipped = 0;

  for (const service of completedServices) {
    // Check if transaction already exists
    const existingTxns = await db.select().from(transactions)
      .where(and(
        eq(transactions.relatedType, "client_service"),
        eq(transactions.relatedId, service.id)
      ));

    if (existingTxns.length > 0) {
      console.log(`  ⏭ Skipping ${service.serviceName} (${service.id}): transaction already exists`);
      skipped++;
      continue;
    }

    // Check billing type
    let billingType = "one_time";
    if (service.subPackageId) {
      const subPkgs = await db.select().from(subPackages).where(eq(subPackages.id, service.subPackageId));
      if (subPkgs.length > 0) {
        billingType = subPkgs[0].billingType || "one_time";
      }
    }

    if (billingType === "monthly") {
      console.log(`  ⏭ Skipping ${service.serviceName} (${service.id}): monthly billing`);
      skipped++;
      continue;
    }

    // Create income transaction
    const completedDate = service.completedAt
      ? new Date(service.completedAt).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    await db.insert(transactions).values({
      id: randomUUID(),
      type: "income",
      category: "services",
      amount: service.price!,
      currency: service.currency!,
      description: `Completed service: ${service.serviceName}`,
      date: completedDate,
      relatedType: "client_service",
      relatedId: service.id,
      clientId: service.clientId,
      serviceId: service.id,
      status: "completed",
    });

    console.log(`  ✅ Created transaction for ${service.serviceName} (${service.id}): ${service.price} ${service.currency} on ${completedDate}`);
    created++;
  }

  console.log(`\n📊 Summary:`);
  console.log(`  Created: ${created}`);
  console.log(`  Skipped (already exists or monthly): ${skipped}`);
  console.log("✅ Backfill complete!");
}

backfill().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
