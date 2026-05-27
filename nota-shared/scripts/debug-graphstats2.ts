import { getGraphStats, closeDriver } from "../dist/graph/neo4j-client.js";

async function main() {
  const stats = await getGraphStats();
  console.log(JSON.stringify(stats, null, 2));
  await closeDriver();
}
main().catch(e => { console.error(e); process.exit(1); });
