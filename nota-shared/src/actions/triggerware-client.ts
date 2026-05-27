/**
 * Triggerware integration for Lex.NY — workflow automation.
 *
 * STATUS: STUB — NOT YET IMPLEMENTED.
 *
 * Why this sponsor matters:
 *   Triggerware connects AI agents with workflows, automation, tools, and
 *   real-world actions. For Lex.NY this would mean:
 *     - "Save this research to Google Drive" / "Email this to opposing counsel"
 *     - "Add a calendar reminder to follow up on this statute next session"
 *     - "Push this answer to a paralegal's queue for verification"
 *
 *   These are real attorney-supervised workflows that turn one-shot
 *   research into actual case prep.
 *
 * Why this is a stub:
 *   Workflow automation is lower fit for a research engine than for an
 *   agent-platform product, and the prize tier is "Partner challenge
 *   rewards available" rather than a $-amount. Given the May 31 deadline
 *   and the need to ship AI/ML API + Cognee end-to-end, Triggerware is
 *   deferred to next session. Skeleton below honestly returns "stub" so
 *   the judges see what's planned without a faked demo.
 *
 * What's needed to ship:
 *   1. Sign up at Triggerware (URL TBD — partner page expected on lablab.ai)
 *   2. Identify which workflow triggers are useful for legal research
 *      (likely: "save research to Drive", "email memo", "calendar reminder")
 *   3. Wire a /api/actions/{action_name} endpoint per workflow
 *   4. Add a "Take action" dropdown on the answer card in the UI
 */

export function isTriggerwareConfigured(): boolean {
  return Boolean(process.env.TRIGGERWARE_API_KEY);
}

export interface TriggerwareStats {
  configured: boolean;
  implementation_status: "stub" | "partial" | "live";
  planned_actions?: string[];
  next_steps?: string[];
}

export function getTriggerwareStats(): TriggerwareStats {
  if (!isTriggerwareConfigured()) {
    return {
      configured: false,
      implementation_status: "stub",
      planned_actions: [
        "save_research_to_drive",
        "email_research_memo",
        "add_calendar_followup",
        "push_to_paralegal_queue",
      ],
      next_steps: [
        "Sign up at Triggerware (partner challenge details on lablab.ai)",
        "Set TRIGGERWARE_API_KEY in .env.local",
        "Identify which workflow primitives apply to legal-research workflows",
        "Wire /api/actions/{action_name} endpoints",
      ],
    };
  }
  return {
    configured: true,
    implementation_status: "stub",
    planned_actions: [
      "save_research_to_drive",
      "email_research_memo",
      "add_calendar_followup",
      "push_to_paralegal_queue",
    ],
    next_steps: [
      "Implement workflow trigger calls",
      "Add 'Take action' UI on /ask answer card",
    ],
  };
}
