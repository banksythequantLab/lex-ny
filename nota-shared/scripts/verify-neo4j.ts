import { getDriver, closeDriver } from "../dist/graph/neo4j-client.js";

async function main() {
  const driver = getDriver();
  if (!driver) {
    console.error("Driver not configured");
    process.exit(1);
  }
  const session = driver.session();
  try {
    const r1 = await session.run("MATCH (s:Statute) RETURN count(s) AS c");
    console.log("Statute nodes:", r1.records[0].get("c").toNumber());
    const r2 = await session.run("MATCH (l:Law) RETURN count(l) AS c");
    console.log("Law nodes:", r2.records[0].get("c").toNumber());
    const r3 = await session.run("MATCH ()-[r:UNDER]->() RETURN count(r) AS c");
    console.log("UNDER edges:", r3.records[0].get("c").toNumber());
    const r4 = await session.run("MATCH ()-[r]->() RETURN type(r) AS t, count(r) AS c");
    console.log("All relationships:");
    for (const rec of r4.records) {
      console.log(`  ${rec.get("t")}: ${rec.get("c").toNumber()}`);
    }
    // Sample a few statutes
    const r5 = await session.run(
      "MATCH (s:Statute)-[:UNDER]->(l:Law) RETURN s.citation_key AS cite, l.law_name AS law LIMIT 5"
    );
    console.log("\nSample (Statute)-[:UNDER]->(Law) paths:");
    for (const rec of r5.records) {
      console.log(`  ${rec.get("cite")}  ->  ${rec.get("law")}`);
    }
  } finally {
    await session.close();
    await closeDriver();
  }
}
main().catch(e => { console.error(e); process.exit(1); });
