import fs from "node:fs";

const path = new URL("../apps/merchant-portal/app/merchant-api.ts", import.meta.url);
let content = fs.readFileSync(path, "utf8");

const replacements: Array<[RegExp, string]> = [
  [
    /const response = await fetch\(`\$\{apiBaseUrl\}(\/v1\/merchant\/hubs\/\$\{hubId\}\/workspace)`, \{\s+method: "PATCH",[\s\S]+?return \(await response\.json\(\)\) as MerchantWorkspace;/,
    `return merchantJson<MerchantWorkspace>(\`/v1/merchant/hubs/\${hubId}/workspace\`, "workspace_save", {
    method: "PATCH",
    token,
    body: JSON.stringify(payload),
  });`,
  ],
];

// Manual replace saveWorkspace fetch part only
content = content.replace(
  `  const response = await fetch(\`\${apiBaseUrl}/v1/merchant/hubs/\${hubId}/workspace\`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      authorization: \`Bearer \${token}\`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readMerchantApiError(response, "workspace_save"));
  }

  return (await response.json()) as MerchantWorkspace;`,
  `  return merchantJson<MerchantWorkspace>(\`/v1/merchant/hubs/\${hubId}/workspace\`, "workspace_save", {
    method: "PATCH",
    token,
    body: JSON.stringify(payload),
  });`,
);

const simple = (
  pathExpr: string,
  context: string,
  type: string,
  init: string,
) => {
  const block = `  const response = await fetch(\`\${apiBaseUrl}${pathExpr}\`, ${init});

  if (!response.ok) {
    throw new Error(await readMerchantApiError(response, "${context}"));
  }

  return (await response.json()) as ${type};`;
  const replacement = `  return merchantJson<${type}>(\`${pathExpr.replace(/\$\{([^}]+)\}/g, "${$1}")}\`, "${context}", ${init.replace(/^\{\s*/, "{ ").replace(/\s*\}$/, " }")});`.replace(
    "`${hubId}`",
    "`${hubId}`",
  );
  return { block, replacement };
};

// Brute-force replace known blocks
const blocks: Array<[string, string]> = [
  [
    `  const response = await fetch(\`\${apiBaseUrl}/v1/merchant/hubs/\${hubId}/password\`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: \`Bearer \${token}\`,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await readMerchantApiError(response, "password_change"));
  }

  return (await response.json()) as { changed: boolean; user: HubUser };`,
    `  return merchantJson<{ changed: boolean; user: HubUser }>(\`/v1/merchant/hubs/\${hubId}/password\`, "password_change", {
    method: "POST",
    token,
    body: JSON.stringify(input),
  });`,
  ],
];

for (const [from, to] of blocks) {
  content = content.replace(from, to);
}

fs.writeFileSync(path, content);
console.log("remaining readMerchantApiError:", (content.match(/readMerchantApiError/g) ?? []).length);
