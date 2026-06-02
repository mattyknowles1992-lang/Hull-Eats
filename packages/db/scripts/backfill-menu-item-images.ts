import { decodeHubMenuCategoryDescription } from "@hull-eats/types";
import { prisma } from "@hull-eats/db";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { loadRootEnv } from "./env.js";
import { matchMenuItemImage } from "./menu-item-image-matcher.js";

const args = new Set(process.argv.slice(2));
const replaceAll = args.has("--replace-all");
const dryRun = args.has("--dry-run");
const exportCsv = args.has("--export-csv");

async function main(): Promise<void> {
  loadRootEnv();

  const rows = await prisma.menuItem.findMany({
    where: {
      isActive: true,
      ...(replaceAll ? {} : { OR: [{ imageUrl: null }, { imageUrl: "" }] }),
    },
    select: {
      id: true,
      name: true,
      imageUrl: true,
      category: {
        select: {
          name: true,
          description: true,
          store: { select: { slug: true } },
        },
      },
    },
    orderBy: [{ category: { store: { slug: "asc" } } }, { name: "asc" }],
  });

  if (rows.length === 0) {
    console.log(replaceAll ? "No active menu items found." : "No active menu items are missing image_url.");
    return;
  }

  const csvLines = ["store_slug,item_name,category_name,preset_key,rule_id,image_url"];
  let updated = 0;
  let unchanged = 0;

  for (const row of rows) {
    const { presetKey } = decodeHubMenuCategoryDescription(row.category.description);
    const { ruleId, url } = matchMenuItemImage(row.name, row.category.name, presetKey);

    if (ruleId === "internal_skip") {
      continue;
    }

    csvLines.push(
      [
        row.category.store.slug,
        JSON.stringify(row.name),
        JSON.stringify(row.category.name),
        presetKey ?? "",
        ruleId,
        url,
      ].join(","),
    );

    if (row.imageUrl === url) {
      unchanged += 1;
      continue;
    }

    if (!dryRun) {
      await prisma.menuItem.update({
        where: { id: row.id },
        data: { imageUrl: url },
      });
    }

    updated += 1;
    console.log(`${row.category.store.slug}: ${row.name} [${ruleId}]`);
  }

  if (exportCsv) {
    const outPath = resolve(process.cwd(), "menu-item-image-backfill.csv");
    writeFileSync(outPath, `${csvLines.join("\n")}\n`, "utf8");
    console.log(`\nWrote ${csvLines.length - 1} rows to ${outPath}`);
  }

  const mode = dryRun ? " (dry run)" : "";
  console.log(
    `\nDone${mode}. ${updated} item(s) ${dryRun ? "would be" : ""} updated, ${unchanged} already matched, ${rows.length} scanned.`,
  );
  if (!replaceAll) {
    console.log("Tip: use --replace-all to fix previously assigned wrong images.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
