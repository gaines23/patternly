/**
 * Transforms the local React form state (from workflow-intake.jsx)
 * into the shape expected by POST /api/v1/briefs/
 */
export function formStateToCaseFilePayload(formData, loggedByName = "", name = "") {
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
        pipeline: (wf.pipeline || []).filter(p => p.trim()),
        lists: (wf.lists || []).map(l => ({
          name: l.name,
          space: l.space || "",
          statuses: l.statuses,
          custom_fields: l.customFields,
          automations: (l.automations || []).map(a => ({
            platform: a.platform || "clickup",
            third_party_platform: a.third_party_platform || "",
            pipeline_phase: a.pipelinePhase || "",
            triggers: (a.triggers || []).map(t => ({ type: t.type, detail: t.detail })),
            actions: (a.actions || []).map(ac => ({ type: ac.type, detail: ac.detail })),
            instructions: a.instructions,
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
    project_updates: (projectUpdates || []).map((u, i) => ({
      content: u.content || "",
      attachments: (u.attachments || []).map(a => ({ name: a.name || "", url: a.url || "" })),
      created_at: u.createdAt,
      order: i,
    })),

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
export function caseFileToFormState(caseFile) {
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
        pipeline: (wf.pipeline || []).map(p => p || ""),
        lists: (wf.lists || []).map(l => ({
          name: l.name || "",
          space: l.space || "",
          statuses: l.statuses || "",
          customFields: l.custom_fields || "",
          automations: (l.automations || []).map(a => ({
            platform: a.platform || "clickup",
            third_party_platform: a.third_party_platform || "",
            pipelinePhase: a.pipeline_phase || "",
            triggers: (a.triggers || []).map(t => ({ type: t.type || "", detail: t.detail || "" })),
            actions: (a.actions || []).map(ac => ({ type: ac.type || "", detail: ac.detail || "" })),
            instructions: a.instructions || "",
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
    projectUpdates: (project_updates || []).map(u => ({
      id: u.id,
      content: u.content || "",
      attachments: (u.attachments || []).map(a => ({ name: a.name || "", url: a.url || "" })),
      createdAt: u.created_at,
    })),
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
