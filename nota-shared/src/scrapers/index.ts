/**
 * Lex.NY scrapers - public API.
 *
 * Three sources, each with a different cost/reliability profile:
 *
 *   1. CourtListener (free, primary case law)
 *   2. NY Senate OpenLeg (free, primary statutes)
 *   3. Justia + AmLegal via Bright Data (paid BD credits, fills gaps)
 */

export {
  CourtListenerClient,
  type CLOpinion,
  type CLCluster,
  type CLDocket,
  type CLPerson,
} from "./courtlistener.js";

export {
  NySenateClient,
  type OpenLegLawInfo,
  type OpenLegLawDoc,
  type OpenLegLawTree,
} from "./ny-senate.js";

export {
  NycAmLegalScraper,
  JustiaNyScraper,
  liveSerpLegalSearch,
  parseJustiaListing,
  parseJustiaCase,
  type AmLegalNode,
  type JustiaCase,
  type JustiaCaseListing,
  type JustiaCourt,
  type LiveLegalSource,
} from "./justia-amlegal.js";
