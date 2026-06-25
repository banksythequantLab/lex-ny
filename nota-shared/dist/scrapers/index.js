/**
 * Lex.NY scrapers - public API.
 *
 * Three sources, each with a different cost/reliability profile:
 *
 *   1. CourtListener (free, primary case law)
 *   2. NY Senate OpenLeg (free, primary statutes)
 *   3. Justia + AmLegal via Bright Data (paid BD credits, fills gaps)
 */
export { CourtListenerClient, } from "./courtlistener.js";
export { NySenateClient, } from "./ny-senate.js";
export { NycAmLegalScraper, JustiaNyScraper, liveSerpLegalSearch, parseJustiaListing, parseJustiaCase, } from "./justia-amlegal.js";
//# sourceMappingURL=index.js.map