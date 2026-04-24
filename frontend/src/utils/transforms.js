/**
 * Format a duration stored as whole minutes into "1h 15min" / "45min" / "2h".
 * Returns null when there's nothing to show.
 */
export function formatMinutes(mins) {
  if (mins == null || mins === "") return null;
  const n = Number(mins);
  if (!Number.isFinite(n) || n <= 0) return null;
  const h = Math.floor(n / 60);
  const m = Math.round(n % 60);
  if (h && m) return `${h}h ${m}min`;
  if (h) return `${h}h`;
  return `${m}min`;
}

/** Sum minutes_spent across an updates list and format it. Null if the total is zero/empty. */
export function totalUpdatesDuration(updates) {
  if (!updates?.length) return null;
  const total = updates.reduce((sum, u) => sum + (Number(u.minutes_spent) || 0), 0);
  return formatMinutes(total);
}

/**
 * Transforms the local React form state (from workflow-intake.jsx)
 * into the shape expected by POST /api/v1/briefs/
 */
export function formToProjectPayload(formData, loggedByName = "", name = "") {
  const { audit, intake, build, delta, reasoning, outcome, projectUpdates } = formData;

  return {
    name,
    logged_by_name: loggedByName,

    // Layer 1 – Audit
    audit: {
      has_existing: audit.hasExisting === "Yes, they have something"
        ? true
        : audit.hasExisting === "No — starting from scratch"
        ? false
        : null,
      overall_assessment: audit.overallAssessment,
      tried_to_fix: audit.triedToFix === "Yes"
        ? true
        : audit.triedToFix === "No"
        ? false
        : null,
      previous_fixes: audit.previousFixes,
      pattern_summary: audit.patternSummary,
      builds: (audit.builds || []).map((b, i) => ({
        tool: b.tool,
        structure: b.structure,
        failure_reasons: b.failureReasons,
        what_breaks: b.whatBreaks,
        workarounds_they_use: b.workaroundsTheyUse,
        how_long_broken: b.howLongBroken,
        who_reported: b.whoReported,
        integrations_in_place: b.integrationsInPlace,
        impact_on_team: b.impactOnTeam,
        urgency: b.urgency?.toLowerCase() || "medium",
        order: i,
      })),
    },

    // Layer 2 – Intake
    intake: {
      raw_prompt: intake.rawPrompt,
      industries: intake.industries,
      team_size: intake.teamSize,
      workflow_type: intake.workflowType,
      process_frameworks: intake.processFrameworks,
      tools: intake.tools,
      pain_points: intake.painPoints,
      prior_attempts: intake.priorAttempts,
    },

    // Layer 3 – Build
    build: {
      build_notes: build.buildNotes,
      spaces: (build.spaces || []).filter(s => s.trim()).join(", "),
      workflows: (build.workflows || []).map(wf => ({
        name: wf.name,
        notes: wf.notes,
        status: wf.status || "Mapping",
        replaces: wf.replaces || "",
        learnings: wf.learnings || { rating: "", whatWorked: "", whatToAvoid: "" },
        pipeline: (wf.pipeline || []).filter(p => p.trim()),
        lists: (wf.lists || []).map(l => ({
          name: l.name,
          space: l.space || "",
          statuses: l.statuses,
          custom_fields: l.customFields,
          automations: (l.automations || []).map(a => ({
            platform: a.platform || "clickup",
            automation_mode: a.automation_mode || "pipeline",
            third_party_platform: a.third_party_platform || "",
            pipeline_phase: a.pipelinePhase || "",
            triggers: (a.triggers || []).map(t => ({ type: t.type, detail: t.detail })),
            actions: (a.actions || []).map(ac => ({ type: ac.type, detail: ac.detail })),
            instructions: a.instructions,
            map_description: a.map_description || "",
            use_agent: !!(a.instructions && a.instructions.trim().length > 0),
          })),
        })),
      })),
    },

    // Layer 4 – Delta
    delta: {
      user_intent: delta.userIntent,
      success_criteria: delta.successCriteria,
      actual_build: delta.actualBuild,
      diverged: delta.diverged === "Yes"
        ? true
        : delta.diverged === "No"
        ? false
        : null,
      divergence_reason: delta.divergenceReason,
      compromises: delta.compromises,
      scope_creep: (delta.scopeCreep || []).map(s => ({
        area: s.area || "",
        reason: s.reason || "",
        impact: s.impact || "",
        communicated: s.communicated === "Yes" ? true : s.communicated === "No" ? false : s.communicated === "Partially" ? "partially" : null,
      })),
      roadblocks: (delta.roadblocks || []).map((r, i) => ({
        type: r.type
          ? r.type.toLowerCase().replace(/ /g, "_")
          : "",
        severity: r.severity?.toLowerCase() || "",
        tools_affected: r.tools,
        description: r.description,
        workaround_found: r.workaroundFound === "Yes"
          ? true
          : r.workaroundFound === "No"
          ? false
          : null,
        workaround_description: r.workaround,
        time_cost_hours: r.timeCost ? parseFloat(r.timeCost) : null,
        future_warning: r.futureWarning,
        flag_for_future: true,
        order: i,
      })),
    },

    // Layer 5 – Reasoning
    reasoning: {
      why_structure: reasoning.whyStructure,
      alternatives: reasoning.alternatives,
      why_rejected: reasoning.whyRejected,
      assumptions: reasoning.assumptions,
      when_opposite: reasoning.whenOpposite,
      lessons: reasoning.lessons,
      complexity: reasoning.complexity,
    },

    // Project updates
    project_updates: (projectUpdates || []).map((u, i) => {
      const h = u.hours === "" || u.hours == null ? 0 : parseInt(u.hours, 10) || 0;
      const m = u.minutes === "" || u.minutes == null ? 0 : parseInt(u.minutes, 10) || 0;
      const total = h * 60 + m;
      return {
        content: u.content || "",
        attachments: (u.attachments || []).map(a => ({ name: a.name || "", url: a.url || "" })),
        created_at: u.createdAt,
        minutes_spent: total > 0 ? total : null,
        order: i,
      };
    }),

    // Layer 6 – Outcome
    outcome: {
      built: outcome.built?.toLowerCase() || "",
      block_reason: outcome.blockReason,
      changes: outcome.changes,
      what_worked: outcome.whatWorked,
      what_failed: outcome.whatFailed,
      satisfaction: outcome.satisfaction,
      recommend: outcome.recommend?.toLowerCase() || "",
      revisit_when: outcome.revisitWhen,
    },
  };
}

/**
 * Transforms API response back into form state shape for editing.
 */
export function projectToFormState(caseFile) {
  const { audit, intake, build, delta, reasoning, outcome, project_updates } = caseFile;

  return {
    audit: {
      hasExisting: audit?.has_existing === true
        ? "Yes, they have something"
        : audit?.has_existing === false
        ? "No — starting from scratch"
        : null,
      overallAssessment: audit?.overall_assessment || "",
      triedToFix: audit?.tried_to_fix === true
        ? "Yes"
        : audit?.tried_to_fix === false
        ? "No"
        : null,
      previousFixes: audit?.previous_fixes || "",
      patternSummary: audit?.pattern_summary || "",
      builds: (audit?.builds || []).map((b) => ({
        tool: b.tool,
        structure: b.structure,
        failureReasons: b.failure_reasons,
        whatBreaks: b.what_breaks,
        workaroundsTheyUse: b.workarounds_they_use,
        howLongBroken: b.how_long_broken,
        whoReported: b.who_reported,
        integrationsInPlace: b.integrations_in_place,
        impactOnTeam: b.impact_on_team,
        urgency: b.urgency
          ? b.urgency.charAt(0).toUpperCase() + b.urgency.slice(1)
          : "Medium",
      })),
    },
    intake: {
      rawPrompt: intake?.raw_prompt || "",
      industries: intake?.industries || [],
      teamSize: intake?.team_size || "",
      workflowType: intake?.workflow_type || "",
      processFrameworks: intake?.process_frameworks || [],
      tools: intake?.tools || [],
      painPoints: intake?.pain_points || [],
      priorAttempts: intake?.prior_attempts || "",
    },
    build: {
      buildNotes: build?.build_notes || "",
      spaces: (build?.spaces || "").split(",").map(s => s.trim()).filter(Boolean),
      workflows: (build?.workflows || []).map(wf => ({
        name: wf.name || "",
        notes: wf.notes || "",
        status: wf.status || "Mapping",
        replaces: wf.replaces || "",
        learnings: wf.learnings || { rating: "", whatWorked: "", whatToAvoid: "" },
        pipeline: (wf.pipeline || []).map(p => p || ""),
        lists: (wf.lists || []).map(l => ({
          name: l.name || "",
          space: l.space || "",
          statuses: l.statuses || "",
          customFields: l.custom_fields || "",
          automations: (l.automations || []).map(a => ({
            platform: a.platform || "clickup",
            automation_mode: a.automation_mode || "pipeline",
            third_party_platform: a.third_party_platform || "",
            pipelinePhase: a.pipeline_phase || "",
            triggers: (a.triggers || []).map(t => ({ type: t.type || "", detail: t.detail || "" })),
            actions: (a.actions || []).map(ac => ({ type: ac.type || "", detail: ac.detail || "" })),
            instructions: a.instructions || "",
            map_description: a.map_description || "",
            use_agent: a.use_agent ?? !!(a.instructions && a.instructions.trim().length > 0),
          })),
        })),
      })),
    },
    delta: {
      userIntent: delta?.user_intent || "",
      successCriteria: delta?.success_criteria || "",
      actualBuild: delta?.actual_build || "",
      diverged: delta?.diverged === true
        ? "Yes"
        : delta?.diverged === false
        ? "No"
        : null,
      divergenceReason: delta?.divergence_reason || "",
      compromises: delta?.compromises || "",
      scopeCreep: (delta?.scope_creep || []).map(s => ({
        area: s.area || "",
        reason: s.reason || "",
        impact: s.impact || "",
        communicated: s.communicated === true ? "Yes" : s.communicated === false ? "No" : s.communicated === "partially" ? "Partially" : null,
      })),
      roadblocks: (delta?.roadblocks || []).map((r) => ({
        type: r.type
          ? r.type.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
          : "",
        severity: r.severity
          ? r.severity.charAt(0).toUpperCase() + r.severity.slice(1)
          : "",
        tools: r.tools_affected || [],
        description: r.description,
        workaroundFound: r.workaround_found === true
          ? "Yes"
          : r.workaround_found === false
          ? "No"
          : null,
        workaround: r.workaround_description || "",
        timeCost: r.time_cost_hours?.toString() || "",
        futureWarning: r.future_warning || "",
      })),
    },
    reasoning: {
      whyStructure: reasoning?.why_structure || "",
      alternatives: reasoning?.alternatives || "",
      whyRejected: reasoning?.why_rejected || "",
      assumptions: reasoning?.assumptions || "",
      whenOpposite: reasoning?.when_opposite || "",
      lessons: reasoning?.lessons || "",
      complexity: reasoning?.complexity || 3,
    },
    projectUpdates: (project_updates || []).map(u => {
      const mins = u.minutes_spent != null ? Number(u.minutes_spent) : null;
      return {
        id: u.id,
        content: u.content || "",
        attachments: (u.attachments || []).map(a => ({ name: a.name || "", url: a.url || "" })),
        createdAt: u.created_at,
        hours: mins != null && mins > 0 ? Math.floor(mins / 60).toString() : "",
        minutes: mins != null && mins > 0 ? (mins % 60).toString() : "",
      };
    }),
    outcome: {
      built: outcome?.built
        ? outcome.built.charAt(0).toUpperCase() + outcome.built.slice(1)
        : null,
      blockReason: outcome?.block_reason || "",
      changes: outcome?.changes || "",
      whatWorked: outcome?.what_worked || "",
      whatFailed: outcome?.what_failed || "",
      satisfaction: outcome?.satisfaction || 3,
      recommend: outcome?.recommend
        ? outcome.recommend.charAt(0).toUpperCase() + outcome.recommend.slice(1)
        : null,
      revisitWhen: outcome?.revisit_when || "",
    },
  };
}

// ── Automation type inference helpers ────────────────────────────────────────

// Mirror the constants from ProjectForm so inference can exact-match against them
const _TRIGGER_LIST = [
  "Task Created","Task Status Changed","Task Completed","Task Moved","Task Assigned","Task Unassigned",
  "Task Due Date Arrives","Task Start Date Arrives","Task Due Date Changed","Task Priority Changed",
  "Custom Field Changed","Custom Field Is","Comment Posted","Attachment Added","Tag Added","Tag Removed",
  "Task Type Is","Checklist Item Completed","Time Estimate Changed","Dependency Resolved",
  "Form Submitted","Recurring Task Due",
];
const _ACTION_LIST = [
  "Change Status","Assign To","Unassign From","Set Priority","Set Due Date","Set Start Date",
  "Move to List","Add to List","Create List","Copy Task","Create Subtask","Create Task",
  "Post Comment","Send Email","Add Tag","Remove Tag","Set Custom Field",
  "Start Time Tracking","Stop Time Tracking","Change Task Type",
  "Apply Template","Archive Task","Send Webhook",
];

/**
 * Split text on "AND" only when the following word looks like a new
 * action/trigger verb — prevents splitting "notify assignee and manager"
 * into two broken entries.
 */
function _splitOnAnd(text, kind) {
  const actionVerb = /^(assign|unassign|change|set|move|add|remove|create|copy|post|send|start|stop|apply|archive|update|notify|alert|mark|tag|generate|attach|transfer|convert|close|open|delete|duplicate|schedule|log|clear|email)\b/i;
  const triggerVerb = /^(task|status|custom|comment|attachment|tag|checklist|time|dependency|form|recurring|when|if|on|new)\b/i;
  const pattern = kind === "action" ? actionVerb : triggerVerb;

  const parts = text.split(/\s+and\s+/i);
  if (parts.length <= 1) return parts;
  const result = [parts[0]];
  for (let i = 1; i < parts.length; i++) {
    if (pattern.test(parts[i].trim())) {
      result.push(parts[i].trim());
    } else {
      result[result.length - 1] += " and " + parts[i];
    }
  }
  return result.filter(Boolean);
}

function inferTriggerType(text) {
  const t = text.trim();
  const tl = t.toLowerCase();

  // 1. Exact match (case-insensitive)
  const exact = _TRIGGER_LIST.find(v => v.toLowerCase() === tl);
  if (exact) return exact;

  // 2. Contains the full type name as a substring
  const partial = _TRIGGER_LIST.find(v => tl.includes(v.toLowerCase()));
  if (partial) return partial;

  // 3. Fuzzy keyword matching — ordered most-specific first
  if (/custom field.*(changed|updated|modified)/i.test(t)) return "Custom Field Changed";
  if (/custom field.*(is|equals|becomes|set to)/i.test(t)) return "Custom Field Is";
  if (/\bchecklist\b/i.test(t)) return "Checklist Item Completed";
  if (/time estimate/i.test(t)) return "Time Estimate Changed";
  if (/\bdependenc/i.test(t)) return "Dependency Resolved";
  if (/\brecurr/i.test(t)) return "Recurring Task Due";
  if (/task type/i.test(t)) return "Task Type Is";
  if (/\battachment|\bfile (upload|attach)/i.test(t)) return "Attachment Added";
  if (/(tag|label).*(added|applied)|(added|applied).*(tag|label)/i.test(t)) return "Tag Added";
  if (/(tag|label).*(removed|deleted)|(removed|deleted).*(tag|label)/i.test(t)) return "Tag Removed";
  if (/\bcomment(ed|s)?\b/i.test(t)) return "Comment Posted";
  if (/form.*(submit|fill|complet|receiv)|submit.*form|\bform (is )?receiv/i.test(t)) return "Form Submitted";
  if (/\bsubmit(ted|s)?\b/i.test(t)) return "Form Submitted";
  if (/due date.*(arrives?|reached|hit|pass|trigger|today|overdue|past)|overdue|past due/i.test(t)) return "Task Due Date Arrives";
  if (/start date.*(arrives?|reached|hit|today)/i.test(t)) return "Task Start Date Arrives";
  if (/due date.*(changed|updated|modified|set)|change.*due date|update.*due date/i.test(t)) return "Task Due Date Changed";
  if (/priority.*(changed|updated|modified)|change.*priority/i.test(t)) return "Task Priority Changed";
  if (/\bunassign/i.test(t)) return "Task Unassigned";
  if (/\bassign(ed)?\b/i.test(t)) return "Task Assigned";
  if (/(task|item).*(moved?|transferred|relocated)|moved?.*to.*list/i.test(t)) return "Task Moved";
  if (/(task|item|ticket).*(created|added|new)|new.*(task|item|ticket)|created?\b/i.test(t) && !/custom field/i.test(t)) return "Task Created";
  if (/mark(ed)? (as )?(done|complete|finished)|completed?\b|finished?\b|\bdone\b|closed\b/i.test(t)) return "Task Completed";
  if (/status.*(changed|updated|moved|set|is|to|becomes)|change.*status|move.*status|set.*status/i.test(t)) return "Task Status Changed";
  if (/\bstatus\b/i.test(t)) return "Task Status Changed";
  if (/\bnew\b|\bcreated?\b/i.test(t)) return "Task Created";
  return "";
}

function inferActionType(text) {
  const t = text.trim();
  const tl = t.toLowerCase();

  // 1. Exact match (case-insensitive)
  const exact = _ACTION_LIST.find(v => v.toLowerCase() === tl);
  if (exact) return exact;

  // 2. Contains the full type name as a substring
  const partial = _ACTION_LIST.find(v => tl.includes(v.toLowerCase()));
  if (partial) return partial;

  // 3. Fuzzy keyword matching — ordered most-specific first
  if (/stop.*time.?track|time.?track.*stop/i.test(t)) return "Stop Time Tracking";
  if (/start.*time.?track|time.?track.*start/i.test(t)) return "Start Time Tracking";
  if (/change.*task.?type|task.?type.*change/i.test(t)) return "Change Task Type";
  if (/\bwebhook\b/i.test(t)) return "Send Webhook";
  if (/\barchive\b/i.test(t)) return "Archive Task";
  if (/\btemplate\b/i.test(t)) return "Apply Template";
  if (/remove.*tag|tag.*remov|untag/i.test(t)) return "Remove Tag";
  if (/add.*tag|tag.*add|\btag\b/i.test(t)) return "Add Tag";
  if (/remove.*custom|clear.*custom/i.test(t)) return "Set Custom Field";
  if (/custom.?field|set.*field|update.*field/i.test(t)) return "Set Custom Field";
  if (/copy.*task|duplicate.*task/i.test(t)) return "Copy Task";
  if (/sub.?task/i.test(t)) return "Create Subtask";
  if (/create.*list|new.*list/i.test(t)) return "Create List";
  if (/add.*to.*list/i.test(t)) return "Add to List";
  if (/move.*to.*list|move.*list|transfer.*list|send.*to.*list/i.test(t)) return "Move to List";
  if (/move|transfer/i.test(t) && /list/i.test(t)) return "Move to List";
  if (/create.*task|new.*task|add.*task|generate.*task/i.test(t)) return "Create Task";
  if (/set.*start.?date|start.?date.*set|update.*start/i.test(t)) return "Set Start Date";
  if (/set.*due.?date|due.?date.*set|update.*due|change.*due/i.test(t)) return "Set Due Date";
  if (/\bdue.?date\b/i.test(t)) return "Set Due Date";
  if (/send.*email|email.*send|email.*notif|notif.*email|\bemail\b/i.test(t)) return "Send Email";
  if (/post.*comment|add.*comment|leave.*comment|\bcomment\b/i.test(t)) return "Post Comment";
  if (/\bunassign\b/i.test(t)) return "Unassign From";
  if (/\bassign\b/i.test(t)) return "Assign To";
  if (/(change|update|set|switch|move|mark).*(status|to)|(status).*(change|update|set|to)|mark.*as/i.test(t)) return "Change Status";
  if (/(set|change|update).*(priority)|priority.*(set|change|update|to)|\bhigh\b|\blow\b|\burgent\b|\bmedium\b/i.test(t)) return "Set Priority";
  if (/\bnotif(y|ication)\b|\balert\b|\bslack\b|\bmessage\b|\bping\b/i.test(t)) return "Post Comment";
  if (/move|transfer/i.test(t)) return "Move to List";
  return "";
}

/**
 * Maps a GeneratedBrief (from AI output) into ProjectForm's initialData shape.
 * Pre-fills Intake, Build, and Reasoning layers from parsed_scenario + recommendation.
 * Audit, Delta, and Outcome are left empty for the user to fill manually.
 */
/**
 * Parse the AI recommendation's automations text into structured suggestion objects.
 * Exported so components can show these as side-panel suggestions rather than
 * pre-filling the form directly.
 */
export function briefToSuggestedAutomations(brief) {
  const raw = brief?.recommendation?.automations || "";
  return raw
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.includes("→") || line.includes("->"))
    .map(line => {
      const [triggerPart, ...actionParts] = line.split(/→|->/).map(s => s.trim());
      const actionText = actionParts.join(" → ").trim();
      const triggerTexts = triggerPart ? _splitOnAnd(triggerPart, "trigger") : [];
      const actionTexts = actionText ? _splitOnAnd(actionText, "action") : [];
      return {
        platform: "clickup",
        third_party_platform: "",
        pipelinePhase: "",
        triggers: triggerTexts.length > 0
          ? triggerTexts.map(text => ({ type: inferTriggerType(text), detail: text }))
          : [{ type: "", detail: "" }],
        actions: actionTexts.length > 0
          ? actionTexts.map(text => ({ type: inferActionType(text), detail: text }))
          : [{ type: "", detail: "" }],
        instructions: line,
        use_agent: false,
      };
    });
}

export function briefToFormState(brief) {
  const scenario = brief.parsed_scenario || {};
  const rec = brief.recommendation || {};

  // Parse comma/newline-separated space names into workflow objects
  const spaceNames = (rec.spaces || "")
    .split(/,|\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const emptyAutos = [];

  const workflows = spaceNames.map((spaceName, i) => ({
    name: spaceName,
    notes: i === 0 ? rec.lists || "" : "",
    pipeline: [],
    lists: i === 0
      ? [{
          name: "Main",
          space: spaceName,
          statuses: rec.statuses || "",
          customFields: rec.custom_fields || "",
          automations: emptyAutos,
        }]
      : [],
  }));

  if (workflows.length === 0) {
    workflows.push({
      name: "",
      notes: rec.lists || "",
      pipeline: [],
      lists: [{
        name: "Main",
        space: "",
        statuses: rec.statuses || "",
        customFields: rec.custom_fields || "",
        automations: emptyAutos,
      }],
    });
  }

  return {
    audit: {
      hasExisting: null,
      overallAssessment: "",
      triedToFix: null,
      previousFixes: "",
      builds: [],
      patternSummary: "",
    },
    intake: {
      rawPrompt: scenario.raw_prompt || "",
      industries: scenario.industry ? [scenario.industry] : [],
      teamSize: scenario.team_size || "",
      workflowType: scenario.workflow_type || "",
      processFrameworks: scenario.process_frameworks || [],
      tools: scenario.tools || [],
      painPoints: scenario.pain_points || [],
      priorAttempts: "",
    },
    build: {
      buildNotes: rec.build_notes || "",
      workflows,
    },
    delta: {
      userIntent: "",
      successCriteria: "",
      actualBuild: "",
      diverged: null,
      divergenceReason: "",
      compromises: "",
      roadblocks: [],
    },
    reasoning: {
      whyStructure: rec.reasoning || "",
      alternatives: "",
      whyRejected: "",
      assumptions: "",
      whenOpposite: "",
      lessons: "",
      complexity: rec.estimated_complexity || 3,
    },
    outcome: {
      built: null,
      blockReason: "",
      changes: "",
      whatWorked: "",
      whatFailed: "",
      satisfaction: 3,
      recommend: null,
      revisitWhen: "",
    },
  };
}

/**
 * Maps a WorkflowTemplate into ProjectForm's initialData shape.
 * Pre-fills Intake and Build layers from the template.
 * Audit, Delta, Reasoning, and Outcome are left empty for the user to fill.
 */
export function templateToFormState(template) {
  const spaceNames = (template.spaces || "")
    .split(/,|\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const workflows = spaceNames.map((spaceName, i) => ({
    name: spaceName,
    notes: i === 0 ? template.lists || "" : "",
    pipeline: [],
    lists: i === 0
      ? [{
          name: "Main",
          space: spaceName,
          statuses: template.statuses || "",
          customFields: template.custom_fields || "",
          automations: [],
        }]
      : [],
  }));

  if (workflows.length === 0) {
    workflows.push({
      name: "",
      notes: template.lists || "",
      pipeline: [],
      lists: [{
        name: "Main",
        space: "",
        statuses: template.statuses || "",
        customFields: template.custom_fields || "",
        automations: [],
      }],
    });
  }

  return {
    audit: {
      hasExisting: null,
      overallAssessment: "",
      triedToFix: null,
      previousFixes: "",
      builds: [],
      patternSummary: "",
    },
    intake: {
      rawPrompt: "",
      industries: template.industries || [],
      teamSize: "",
      workflowType: template.workflow_type || "",
      processFrameworks: template.process_frameworks || [],
      tools: template.tools || [],
      painPoints: template.pain_points || [],
      priorAttempts: "",
    },
    build: {
      buildNotes: template.build_notes || "",
      workflows,
    },
    delta: {
      userIntent: "",
      successCriteria: "",
      actualBuild: "",
      diverged: null,
      divergenceReason: "",
      compromises: "",
      roadblocks: [],
    },
    reasoning: {
      whyStructure: "",
      alternatives: "",
      whyRejected: "",
      assumptions: "",
      whenOpposite: "",
      lessons: "",
      complexity: template.estimated_complexity || 3,
    },
    outcome: {
      built: null,
      blockReason: "",
      changes: "",
      whatWorked: "",
      whatFailed: "",
      satisfaction: 3,
      recommend: null,
      revisitWhen: "",
    },
  };
}

/**
 * Maps a compiled AI suggestion (from the Agent Compiler) into the build
 * portion of ProjectForm's form state. The AI output already matches the
 * workflow/list/automation structure, so this is mostly a normalization pass
 * that ensures trigger/action types match the form's dropdown values.
 */
export function compiledSuggestionToBuildState(suggestion) {
  return {
    buildNotes: suggestion.build_notes || "",
    workflows: (suggestion.workflows || []).map(wf => ({
      name: wf.name || "",
      notes: wf.notes || "",
      pipeline: wf.pipeline || [],
      status: "Mapping",
      replaces: "",
      learnings: { rating: "", whatWorked: "", whatToAvoid: "" },
      lists: (wf.lists || []).map(l => ({
        name: l.name || "",
        space: l.space || "",
        statuses: l.statuses || "",
        customFields: l.custom_fields || "",
        automations: (l.automations || []).map(a => ({
          platform: a.platform || "clickup",
          automation_mode: a.automation_mode || "pipeline",
          third_party_platform: a.third_party_platform || "",
          pipelinePhase: a.pipeline_phase || "",
          triggers: (a.triggers || []).map(t => ({
            type: inferTriggerType(t.type || t.detail || ""),
            detail: t.detail || "",
          })),
          actions: (a.actions || []).map(ac => ({
            type: inferActionType(ac.type || ac.detail || ""),
            detail: ac.detail || "",
          })),
          instructions: a.instructions || "",
          map_description: a.map_description || "",
          use_agent: !!(a.instructions && a.instructions.trim().length > 0),
        })),
      })),
    })),
  };
}

/**
 * Format a date string for display.
 */
export function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Truncate a string to a given length.
 */
export function truncate(str, n = 80) {
  if (!str) return "—";
  return str.length > n ? str.slice(0, n) + "…" : str;
}

/**
 * Satisfaction score label.
 */
export function satisfactionLabel(score) {
  const map = {
    1: "Needs rework",
    2: "Partially useful",
    3: "Mostly worked",
    4: "Solid outcome",
    5: "Exactly right",
  };
  return map[score] || "—";
}
