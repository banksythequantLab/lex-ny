import { redirect } from "next/navigation";

/**
 * /corpus has been merged into /stats. Keep the route as a permanent redirect
 * so any existing links or bookmarks still resolve to the combined page.
 */
export default function CorpusRedirect() {
  redirect("/stats");
}
