import { getDriver, closeDriver } from "../dist/graph/neo4j-client.js";

async function main() {
  const driver = getDriver();
  if (!driver) { console.error("not configured"); process.exit(1); }
  const s = driver.session();
  try {
    console.log("--- rel count query (NO catch) ---");
    try {
      const r = await s.run("MATCH ()-[r]->() RETURN type(r) AS relationshipType, count(r) AS c");
      console.log("Records returned:", r.records.length);
      for (const rec of r.records) {
        console.log("  ", rec.get("relationshipType"), "->", rec.get("c").toNumber());
      }
    } catch (e) {
      console.error("ERR (this is the hidden error):", e);
    }

    console.log("\n--- totals query (NO catch) ---");
    try {
      const r = await s.run("MATCH (n) WITH count(n) AS nodes MATCH ()-[r]->() WITH nodes, count(r) AS rels RETURN nodes, rels");
      console.log("Records:", r.records.length);
      if (r.records[0]) {
        console.log("  nodes:", r.records[0].get("nodes").toNumber());
        console.log("  rels:", r.records[0].get("rels").toNumber());
      }
    } catch (e) {
      console.error("ERR:", e);
    }
  } finally {
    await s.close();
    await closeDriver();
  }
}
main().catch(e => { console.error(e); process.exit(1); });
