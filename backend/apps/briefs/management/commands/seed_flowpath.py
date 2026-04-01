"""
management command: seed_flowpath

Creates realistic seed case files for development and demo purposes.
Covers 6 different industries and workflow types so the AI recommendation
engine has meaningful data to retrieve from on first boot.

Usage:
    python manage.py seed_flowpath
    python manage.py seed_flowpath --clear   # wipe existing data first
"""
import random
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.briefs.models import (
    CaseFile, AuditLayer, CurrentBuild, IntakeLayer,
    BuildLayer, DeltaLayer, Roadblock, ReasoningLayer, OutcomeLayer,
)

User = get_user_model()

SEED_DATA = [
    {
        "meta": {
            "workflow_type": "Client Project Management",
            "industries": ["Marketing Agency"],
            "tools": ["Slack", "HubSpot", "Google Drive", "Loom"],
            "satisfaction_score": 5,
            "roadblock_count": 1,
            "built_outcome": "yes",
        },
        "intake": {
            "raw_prompt": "We're a 9-person creative agency managing 15 active clients. We use Slack and HubSpot but nothing syncs. Project managers manually update a Google Sheet every Monday. We miss deadlines because nobody knows the real status of deliverables.",
            "industries": ["Marketing Agency"],
            "team_size": "9",
            "workflow_type": "Client Project Management",
            "process_frameworks": ["Kanban", "Client Onboarding"],
            "tools": ["Slack", "HubSpot", "Google Drive", "Loom"],
            "pain_points": ["Visibility", "Deadline Tracking", "Client Transparency", "Handoffs"],
            "prior_attempts": "Tried Trello but team stopped using it after 2 weeks. Too manual.",
        },
        "audit": {
            "has_existing": True,
            "overall_assessment": "Team has a chaotic mix of Slack threads, Google Sheets, and email chains. No single source of truth. The Sheet is always 3 days stale.",
            "tried_to_fix": True,
            "previous_fixes": "Tried Trello for 6 weeks. Abandoned because there was no automation and updating felt like extra work on top of existing work.",
            "pattern_summary": "Classic agency anti-pattern: tool sprawl without clear ownership. Each person manages their own version of the truth.",
            "builds": [
                {
                    "tool": "Spreadsheets / Excel",
                    "structure": "One sheet per month, rows per client, columns per deliverable",
                    "failure_reasons": ["Nobody using it consistently", "No reporting / can't see progress", "Manual steps still required"],
                    "what_breaks": "Sheet is never up to date. Takes 2 hours every Monday to reconcile. Misses ad-hoc changes made in Slack.",
                    "workarounds_they_use": "Slack DMs to ask about status. End-of-day verbal check-ins. Screen-sharing Loom updates to clients.",
                    "how_long_broken": "1+ year",
                    "who_reported": "Manager / Director",
                    "integrations_in_place": ["Slack"],
                    "impact_on_team": "Project manager spending 6h/week on status reconciliation. Two client escalations last quarter due to missed deliverable deadlines.",
                    "urgency": "critical",
                }
            ],
        },
        "build": {
            "spaces": "Client Work, Internal Ops",
            "lists": "Active Clients, Proposals, Completed, Internal Tasks",
            "statuses": "Briefed → In Production → Internal Review → Client Review → Approved → Live",
            "custom_fields": "Client Name — Text — identifies which client\nDeadline — Date — hard deadline for delivery\nAssigned PM — Person — single owner per project\nClient Priority — Dropdown (P1/P2/P3) — urgency tier\nBillable Hours — Number — actual vs estimate tracking",
            "automations": "When status → Client Review: notify client contact via email\nWhen Deadline < 3 days and status ≠ Approved: Slack alert to PM\nWhen status → Live: move to Completed list and log to HubSpot",
            "integrations": ["Slack", "HubSpot", "Google Drive"],
            "build_notes": "Keep statuses under 7 — agencies abandon workflows with too many gates. The Client Review stage is the critical handoff; automate the notification so PMs don't forget.",
        },
        "delta": {
            "user_intent": "Full bidirectional sync with HubSpot so deal stage and project status stay aligned automatically.",
            "success_criteria": "PM opens ClickUp on Monday morning and knows the exact status of every client deliverable without asking anyone.",
            "actual_build": "One-way sync from HubSpot deal stage to ClickUp task creation. Status updates in ClickUp trigger Slack notifications to client channel but do not write back to HubSpot.",
            "diverged": True,
            "divergence_reason": "HubSpot → ClickUp bidirectional sync requires custom middleware. Native Zapier integration does not support two-way field mapping for custom properties.",
            "compromises": "Manual HubSpot update required when project reaches Live status. Added a ClickUp automation to post a reminder checklist item for this.",
            "roadblocks": [
                {
                    "type": "integration_limitation",
                    "severity": "high",
                    "tools_affected": ["HubSpot", "ClickUp", "Zapier"],
                    "description": "Zapier HubSpot integration cannot write custom deal properties back from ClickUp status changes. Field mapping only works inbound.",
                    "workaround_found": True,
                    "workaround_description": "Built a lightweight Django webhook receiver that listens to ClickUp status webhooks and updates HubSpot via direct API call using the HubSpot v3 CRM API.",
                    "time_cost_hours": 6.0,
                    "future_warning": "HubSpot ↔ ClickUp bidirectional sync always requires custom middleware. Budget 4-8h engineering time. Do not promise full sync via Zapier alone.",
                    "flag_for_future": True,
                }
            ],
        },
        "reasoning": {
            "why_structure": "Separated Client Work from Internal Ops to prevent internal tasks bleeding into client views. Single Space per team (not per client) because at 15 clients, Space proliferation causes navigation overload. One List per client stage instead.",
            "alternatives": "One Space per client (rejected). Board view per deliverable type (rejected).",
            "why_rejected": "Per-client Spaces sound organised but create 15 separate navigation items. Team stops checking Spaces they don't own. List-level separation keeps everything in one view.",
            "assumptions": "Team runs weekly syncs. Client relationships are managed by named PMs, not a shared pool. Clients prefer email over ClickUp guest access.",
            "when_opposite": "If client count exceeds 30, switch to Space-per-client with a master dashboard view. If clients need live project access, add guest accounts and change status visibility settings.",
            "lessons": "Always keep the status count under 7 for agencies. The simpler the status flow, the higher the adoption. Clients do not need to see internal statuses.",
            "complexity": 3,
        },
        "outcome": {
            "built": "yes",
            "block_reason": "",
            "changes": "Added a Billable Hours field not in original brief. Removed the Proposals list because they manage proposals in HubSpot.",
            "what_worked": "Status automation to Slack was instant win. Team loved not having to manually ping clients. Monday morning dashboard replaced the Google Sheet.",
            "what_failed": "Bidirectional HubSpot sync took longer than expected — 2 weeks extra. Custom webhook solution works but needs monitoring.",
            "satisfaction": 5,
            "recommend": "yes",
            "revisit_when": "When ClickUp releases native HubSpot bidirectional integration or when team exceeds 25 clients.",
        },
    },
    {
        "meta": {
            "workflow_type": "Sprint Planning",
            "industries": ["SaaS / Software Product"],
            "tools": ["GitHub", "Slack", "Linear", "Figma"],
            "satisfaction_score": 4,
            "roadblock_count": 2,
            "built_outcome": "yes",
        },
        "intake": {
            "raw_prompt": "12-person SaaS engineering team. Currently use Linear for sprint tracking but leadership wants everything in ClickUp since the rest of company is there. Engineers hate context switching. Need sprint boards, backlog grooming, and PR linkage.",
            "industries": ["SaaS / Software Product"],
            "team_size": "12",
            "workflow_type": "Sprint Planning",
            "process_frameworks": ["Agile / Scrum", "Kanban"],
            "tools": ["GitHub", "Slack", "Linear", "Figma"],
            "pain_points": ["Visibility", "Cross-team Alignment", "Handoffs"],
            "prior_attempts": "Linear for 18 months. Engineers love it but leadership can't see cross-functional status.",
        },
        "audit": {
            "has_existing": True,
            "overall_assessment": "Linear is working well for engineers but creates a silo. Leadership has no visibility without switching tools. The real problem is reporting, not workflow.",
            "tried_to_fix": False,
            "previous_fixes": "",
            "pattern_summary": "Tool migration driven by leadership convenience, not engineering pain. Risk of degrading a functioning workflow to solve a reporting problem.",
            "builds": [
                {
                    "tool": "Jira",
                    "structure": "Standard Scrum board with epics, stories, sub-tasks",
                    "failure_reasons": ["Too complex for the team", "Nobody using it consistently"],
                    "what_breaks": "Engineers found Jira overhead too high. Migrated to Linear 18 months ago.",
                    "workarounds_they_use": "Slack status updates. Weekly Loom recordings for leadership.",
                    "how_long_broken": "Since day one",
                    "who_reported": "Team Lead",
                    "integrations_in_place": ["Slack", "GitHub"],
                    "impact_on_team": "Low — Linear works. Issue is leadership visibility only.",
                    "urgency": "medium",
                }
            ],
        },
        "build": {
            "spaces": "Engineering",
            "lists": "Current Sprint, Backlog, In Review, Released",
            "statuses": "Backlog → Sprint Ready → In Progress → PR Open → In Review → Done",
            "custom_fields": "Story Points — Number — effort estimation\nSprint — Dropdown — which sprint this belongs to\nComponent — Dropdown (Frontend/Backend/Infra/Design) — team ownership\nPR Link — URL — links to GitHub pull request\nEpic — Relationship — parent epic grouping",
            "automations": "When GitHub PR merged → set status to In Review\nWhen status → Done and all sub-tasks done → notify team in Slack #shipped\nWhen Sprint starts → move Sprint Ready tasks to In Progress automatically\nWhen story points unestimated and sprint < 3 days → Slack reminder to assignee",
            "integrations": ["GitHub", "Slack", "Figma"],
            "build_notes": "Use ClickUp Sprints feature (not a List called 'sprint'). Enables proper velocity tracking. GitHub integration requires org-level OAuth — needs admin approval. Set up Figma embed for design tickets.",
        },
        "delta": {
            "user_intent": "Automatic PR → task status sync so engineers never have to update ClickUp manually.",
            "success_criteria": "Engineer opens a PR on GitHub and ClickUp task moves to In Review without any manual action.",
            "actual_build": "GitHub PR creation triggers a Slack notification and updates a custom PR Link field. Status does not auto-update — still requires manual set.",
            "diverged": True,
            "divergence_reason": "ClickUp GitHub integration triggers on PR events but does not natively update task status based on PR state. Status automation requires the task ID to be in the PR title or branch name.",
            "compromises": "Team agreed to include task ID in branch naming convention (e.g. feature/CU-1234-add-auth). This enables status automation via branch name matching.",
            "roadblocks": [
                {
                    "type": "integration_limitation",
                    "severity": "medium",
                    "tools_affected": ["GitHub", "ClickUp"],
                    "description": "ClickUp GitHub integration status automation only works when task ID is embedded in the branch name or PR title. Does not work via commit messages alone.",
                    "workaround_found": True,
                    "workaround_description": "Enforce branch naming convention: feature/CU-{taskid}-description. Document in team CONTRIBUTING.md. Add GitHub branch protection rule hint.",
                    "time_cost_hours": 1.5,
                    "future_warning": "ClickUp GitHub auto-status requires task ID in branch name. Enforce via team convention or pre-commit hook. Warn client upfront — engineers sometimes resist naming conventions.",
                    "flag_for_future": True,
                },
                {
                    "type": "user_behavior_gap",
                    "severity": "low",
                    "tools_affected": ["ClickUp"],
                    "description": "Story point field left empty by engineers who distrust estimates. Velocity tracking meaningless with ~40% unestimated tickets.",
                    "workaround_found": True,
                    "workaround_description": "Added automation: if ticket moves to In Progress and story points = 0, assign 1 point and Slack-notify assignee. Creates a forcing function without blocking workflow.",
                    "time_cost_hours": 0.5,
                    "future_warning": "Story point adoption requires culture buy-in, not just tooling. Frame as team health metric, not performance tracking.",
                    "flag_for_future": True,
                },
            ],
        },
        "reasoning": {
            "why_structure": "Single Engineering Space keeps all engineering work in one place. Sprints as ClickUp native feature rather than lists gives proper velocity charts. Lists represent workflow stages, not sprint numbers.",
            "alternatives": "One Space per squad (rejected). Separate Space for Design (rejected — creates handoff friction).",
            "why_rejected": "Per-squad Spaces fragment velocity reporting. Design work living in Engineering space allows Figma embeds and seamless design → dev handoffs via sub-tasks.",
            "assumptions": "Team runs 2-week sprints. Engineers will adopt branch naming convention if it's documented clearly. Leadership needs weekly velocity report, not real-time access.",
            "when_opposite": "Teams with 3+ squads working on separate codebases need Space-per-squad. Teams that do not use GitHub should skip the PR integration entirely.",
            "lessons": "Engineers only adopt tools that reduce friction, not add it. Every manual step you add costs you 20% adoption. Make the path of least resistance the correct behaviour.",
            "complexity": 3,
        },
        "outcome": {
            "built": "yes",
            "block_reason": "",
            "changes": "Added Component dropdown not in brief. Removed In Review list — merged into status flow instead.",
            "what_worked": "Sprint planning board loved by team. GitHub branch naming convention adopted within 2 weeks. Leadership gets weekly auto-generated sprint report.",
            "what_failed": "Story point estimation still inconsistent. Velocity chart takes 3 sprints to become meaningful — team expected instant results.",
            "satisfaction": 4,
            "recommend": "yes",
            "revisit_when": "When ClickUp improves native GitHub integration to support PR-based status without branch name dependency.",
        },
    },
    {
        "meta": {
            "workflow_type": "Client Onboarding",
            "industries": ["Management Consulting"],
            "tools": ["Slack", "Zoom", "DocuSign", "Google Drive", "Stripe"],
            "satisfaction_score": 5,
            "roadblock_count": 0,
            "built_outcome": "yes",
        },
        "intake": {
            "raw_prompt": "Boutique consulting firm, 6 consultants. Every new client engagement starts with a 3-week onboarding process: contract signing, discovery call, kickoff, access provisioning. Currently tracked in email and a shared Notes doc. Things fall through the cracks.",
            "industries": ["Management Consulting"],
            "team_size": "6",
            "workflow_type": "Client Onboarding",
            "process_frameworks": ["SOPs", "RACI Matrix"],
            "tools": ["Slack", "Zoom", "DocuSign", "Google Drive", "Stripe"],
            "pain_points": ["Accountability", "Process Consistency", "Handoffs", "Approval Bottlenecks"],
            "prior_attempts": "Shared Google Doc checklist. Never fully completed. Different consultants skip different steps.",
        },
        "audit": {
            "has_existing": False,
            "overall_assessment": "No real system. Email + Notes = invisible workflow.",
            "tried_to_fix": False,
            "previous_fixes": "",
            "pattern_summary": "Greenfield — perfect opportunity to build the right thing from scratch.",
            "builds": [],
        },
        "build": {
            "spaces": "Client Operations",
            "lists": "Onboarding Pipeline, Active Clients, Archived",
            "statuses": "New Lead → Contract Sent → Contract Signed → Discovery Scheduled → Discovery Complete → Kickoff Scheduled → Kickoff Done → Access Provisioned → Active",
            "custom_fields": "Contract Value — Currency — engagement value\nLead Consultant — Person — primary point of contact\nSigned Date — Date — when DocuSign completed\nKickoff Date — Date — confirmed kickoff meeting\nAccess Checklist — Checkbox — tracks provisioning steps\nIndustry — Dropdown — client's industry vertical",
            "automations": "When status → Contract Sent: create sub-task checklist 'Follow up if no signature in 3 days'\nWhen status → Contract Signed: notify Lead Consultant in Slack and create Discovery sub-tasks\nWhen status → Discovery Complete: auto-assign Kickoff Scheduling sub-task to Lead Consultant\nWhen status → Active: move to Active Clients list and create 30-day check-in reminder",
            "integrations": ["Slack", "DocuSign", "Google Drive"],
            "build_notes": "The status flow IS the SOP. Every status change triggers the next action automatically. Consultants should never have to remember what comes next — ClickUp tells them.",
        },
        "delta": {
            "user_intent": "Full DocuSign integration so contract signing automatically advances the status.",
            "success_criteria": "When client signs the contract in DocuSign, ClickUp status moves to Contract Signed and lead consultant gets a Slack notification without anyone checking manually.",
            "actual_build": "DocuSign → Zapier → ClickUp webhook updates status field when envelope is completed. Works via DocuSign envelope status events.",
            "diverged": False,
            "divergence_reason": "",
            "compromises": "",
            "roadblocks": [],
        },
        "reasoning": {
            "why_structure": "Single Space for Client Operations keeps all client touchpoints in one place. Status flow encodes the entire SOP — no separate documentation needed. Each status change is an action trigger.",
            "alternatives": "One task per onboarding step (rejected). Separate Space per client (rejected).",
            "why_rejected": "Step-per-task creates too many tasks and no single view of overall client status. Per-client Spaces at low client volume (6-20) is manageable but adds nav friction.",
            "assumptions": "Onboarding is consistent across clients. Lead Consultant model (single owner per engagement) is maintained. DocuSign is used for all contracts.",
            "when_opposite": "If onboarding varies significantly by client type, split into multiple workflow templates. If team grows beyond 15 consultants with sub-teams, add Space-per-practice-area.",
            "lessons": "For process-heavy workflows, the status flow IS the documentation. Build statuses to match real-world stages, not aspirational ones. Every status should have a clear 'definition of done'.",
            "complexity": 2,
        },
        "outcome": {
            "built": "yes",
            "block_reason": "",
            "changes": "Added Contract Value field not in original brief. Added Industry dropdown for reporting.",
            "what_worked": "Status automation to Slack was immediately adopted. Onboarding time reduced by 2 days on average. Zero dropped onboarding steps in first 3 months.",
            "what_failed": "Nothing significant. Stripe integration wasn't built — team decided to keep billing separate.",
            "satisfaction": 5,
            "recommend": "yes",
            "revisit_when": "When volume exceeds 30 concurrent onboardings — will need sub-team assignment logic.",
        },
    },
    {
        "meta": {
            "workflow_type": "Employee Onboarding",
            "industries": ["HR Consulting"],
            "tools": ["Slack", "Zoom", "Google Drive", "Notion"],
            "satisfaction_score": 4,
            "roadblock_count": 1,
            "built_outcome": "partially",
        },
        "intake": {
            "raw_prompt": "We're an HR consulting firm of 20 people. We bring on 3-4 new hires per quarter. Our onboarding is inconsistent — depends on who's managing it. We want a standardised 90-day plan tracked in ClickUp.",
            "industries": ["HR Consulting"],
            "team_size": "20",
            "workflow_type": "Employee Onboarding",
            "process_frameworks": ["SOPs", "OKR Check-ins", "Performance Review Cycle"],
            "tools": ["Slack", "Zoom", "Google Drive", "Notion"],
            "pain_points": ["Process Consistency", "Accountability", "Visibility"],
            "prior_attempts": "Notion doc that nobody updates past week 2.",
        },
        "audit": {
            "has_existing": True,
            "overall_assessment": "Notion doc exists but is aspirational documentation, not a live workflow. Nobody is accountable for updating it.",
            "tried_to_fix": False,
            "previous_fixes": "",
            "pattern_summary": "Documentation-as-process anti-pattern. A doc doesn't assign tasks or send reminders. The system needs to do the work.",
            "builds": [
                {
                    "tool": "Notion",
                    "structure": "Page per new hire with checklist of onboarding tasks",
                    "failure_reasons": ["Nobody using it consistently", "No ownership assigned", "Manual steps still required"],
                    "what_breaks": "HR manager fills out week 1 then forgets. New hire has no visibility. Managers don't know what's been completed.",
                    "workarounds_they_use": "Verbal check-ins. Ad-hoc Slack DMs from new hire asking what's next.",
                    "how_long_broken": "Since day one",
                    "who_reported": "Manager / Director",
                    "integrations_in_place": ["Slack"],
                    "impact_on_team": "Inconsistent onboarding experience. One new hire left at 90 days citing unclear expectations.",
                    "urgency": "high",
                }
            ],
        },
        "build": {
            "spaces": "People & HR",
            "lists": "Onboarding (Active), Onboarding (Completed)",
            "statuses": "Pre-Start → Week 1 → Week 2-4 → Month 2 → Month 3 → Completed",
            "custom_fields": "Start Date — Date — first day\nDepartment — Dropdown — team assignment\nOnboarding Manager — Person — responsible for this hire\nBuddy — Person — peer support contact\n30-Day Check-in Done — Checkbox\n60-Day Check-in Done — Checkbox\n90-Day Check-in Done — Checkbox",
            "automations": "When task created with template: auto-assign sub-tasks to Onboarding Manager and Buddy\nWhen Start Date = today: Slack message to #general welcoming new hire\nWhen status → Month 2: create 30-day check-in sub-task assigned to Onboarding Manager\nWhen status → Month 3: create 60-day check-in and create 90-day performance review reminder\nWhen 90-Day Check-in Done checked: set status to Completed and archive",
            "integrations": ["Slack", "Google Drive"],
            "build_notes": "Use ClickUp task templates for each hire — creates a consistent task tree on first use. The template should cover Day 1 checklist, Week 1 meetings, and access provisioning. Link Google Drive onboarding folder as attachment.",
        },
        "delta": {
            "user_intent": "Automated 90-day milestone reminders so managers can't forget check-ins.",
            "success_criteria": "Manager receives Slack reminder 3 days before each check-in milestone. New hire knows exactly what to expect each week.",
            "actual_build": "Status-based automation triggers check-in task creation at correct intervals. Slack reminders fire via ClickUp automation. New hire gets visibility via ClickUp guest access.",
            "diverged": True,
            "divergence_reason": "Guest access for new hires during onboarding requires ClickUp Business plan. Client was on Unlimited plan.",
            "compromises": "New hire visibility via shared Google Drive document instead of ClickUp guest view. Onboarding Manager sends weekly summary email manually.",
            "roadblocks": [
                {
                    "type": "cost_ceiling",
                    "severity": "medium",
                    "tools_affected": ["ClickUp"],
                    "description": "ClickUp guest access for external users (including new hires during onboarding) requires Business plan. Client on Unlimited plan could not give new hires direct ClickUp access.",
                    "workaround_found": True,
                    "workaround_description": "Used Google Drive shared folder with a structured onboarding guide as the new hire-facing view. ClickUp used internally by HR team only.",
                    "time_cost_hours": 0.0,
                    "future_warning": "If client wants new hires to see their own onboarding tasks in ClickUp, they must upgrade to Business plan. Confirm plan tier before promising guest access features.",
                    "flag_for_future": True,
                }
            ],
        },
        "reasoning": {
            "why_structure": "Single People & HR Space keeps sensitive HR data separate from project work. Two lists (Active vs Completed) instead of archiving to avoid losing onboarding history for future reference.",
            "alternatives": "One Space per department for onboarding (rejected). Using a Project per hire (rejected).",
            "why_rejected": "Department-specific onboarding spaces fragment HR visibility. Project-per-hire creates too many top-level items. List-based approach with filtering by department gives both flexibility and consolidated view.",
            "assumptions": "Onboarding is relatively consistent across roles. HR team is the primary operator — new hires are not direct ClickUp users. Managers have capacity to run 90-day check-ins.",
            "when_opposite": "If onboarding varies significantly by role type, create separate task templates per department. If new hire count exceeds 10/quarter, consider a dedicated HRIS integration.",
            "lessons": "Always confirm ClickUp plan tier before designing features that require guest access or advanced automation. Guest access is a common expectation that requires Business plan.",
            "complexity": 2,
        },
        "outcome": {
            "built": "partially",
            "block_reason": "Guest access limitation meant new hire-facing features had to be rebuilt using Google Drive instead of ClickUp.",
            "changes": "Replaced ClickUp guest view with Google Drive onboarding hub. Added manual email step for weekly new hire summary.",
            "what_worked": "Internal HR tracking is now consistent. No missed check-ins in 2 quarters. Template-based task creation saves 45 minutes per new hire.",
            "what_failed": "New hire experience is still somewhat manual due to no ClickUp access. Manager email summaries are inconsistently sent.",
            "satisfaction": 4,
            "recommend": "yes",
            "revisit_when": "When client upgrades to ClickUp Business plan — guest access would complete the new hire experience.",
        },
    },
    {
        "meta": {
            "workflow_type": "Sales Pipeline",
            "industries": ["Fintech Startup"],
            "tools": ["Salesforce", "Slack", "Zoom", "Stripe"],
            "satisfaction_score": 3,
            "roadblock_count": 2,
            "built_outcome": "partially",
        },
        "intake": {
            "raw_prompt": "Series A fintech, 8-person sales team. Salesforce is overkill for us right now but leadership insists we keep it. We want ClickUp for deal tracking at the team level while Salesforce stays as the CRM of record. Don't want to double-enter data.",
            "industries": ["Fintech Startup"],
            "team_size": "8",
            "workflow_type": "Sales Pipeline",
            "process_frameworks": ["Sales Pipeline", "QBR", "NPS Tracking"],
            "tools": ["Salesforce", "Slack", "Zoom", "Stripe"],
            "pain_points": ["Visibility", "Duplicate work across tools", "Reporting", "Handoffs"],
            "prior_attempts": "Pure Salesforce. Too complex for deal-level team collaboration. Nobody adds notes.",
        },
        "audit": {
            "has_existing": True,
            "overall_assessment": "Salesforce technically works but is treated as a CYA system, not a living workflow tool. Actual deal work happens in Slack threads and Zoom notes.",
            "tried_to_fix": True,
            "previous_fixes": "Added Salesforce Chatter (internal social feed). Nobody uses it. Hired a Salesforce admin to simplify the setup — made it slightly better but team still does real work in Slack.",
            "pattern_summary": "Tool forced by leadership without team buy-in. Classic adoption gap. The solution is a lightweight ClickUp layer ON TOP of Salesforce, not a replacement.",
            "builds": [
                {
                    "tool": "Salesforce",
                    "structure": "Standard opportunity pipeline with custom stages matching sales process",
                    "failure_reasons": ["Too complex for the team", "Nobody using it consistently", "Duplicate work across tools"],
                    "what_breaks": "Sales reps do real work in Slack. Salesforce updated after the fact for compliance. Notes and context live in email threads.",
                    "workarounds_they_use": "Slack channel per deal. Zoom recording links shared in Slack. Spreadsheet for weekly pipeline review.",
                    "how_long_broken": "Since day one",
                    "who_reported": "Manager / Director",
                    "integrations_in_place": ["Slack", "Zoom"],
                    "impact_on_team": "Leadership has no real-time pipeline visibility. Forecasting is guesswork. Onboarding new reps takes 6 weeks because process lives in people's heads.",
                    "urgency": "high",
                }
            ],
        },
        "build": {
            "spaces": "Sales",
            "lists": "Active Pipeline, Closed Won, Closed Lost, Nurture",
            "statuses": "Qualified → Discovery → Demo Scheduled → Demo Done → Proposal Sent → Negotiation → Closed Won / Closed Lost",
            "custom_fields": "Deal Value — Currency — ACV\nSalesforce ID — Text — SFDC opportunity ID for cross-reference\nClose Date — Date — expected close\nAccount Executive — Person — deal owner\nCompany Size — Dropdown (SMB/Mid-Market/Enterprise)\nNext Action — Text — what happens next and by when\nLast Activity — Date — last meaningful touchpoint",
            "automations": "When status → Demo Scheduled: create sub-tasks for demo prep, follow-up email draft\nWhen Close Date < 7 days and status not Closed: Slack alert to AE and manager\nWhen status → Closed Won: notify #sales-wins Slack channel and create customer success handoff task\nWhen status → Closed Lost: prompt for loss reason via custom field",
            "integrations": ["Salesforce", "Slack", "Zoom"],
            "build_notes": "Salesforce ID field is critical — creates a manual but auditable cross-reference between ClickUp and SFDC. Sync is one-way (SFDC → ClickUp on deal creation via Zapier). Deal updates in ClickUp do NOT auto-update SFDC — this was a deliberate trade-off to avoid double-entry confusion.",
        },
        "delta": {
            "user_intent": "Zero double entry — create deal in Salesforce once and have it automatically appear and stay in sync in ClickUp.",
            "success_criteria": "Sales rep creates opportunity in Salesforce and within 5 minutes a ClickUp task exists with all deal fields populated. Status changes in ClickUp reflect in SFDC.",
            "actual_build": "One-way sync: Salesforce opportunity created → Zapier → ClickUp task created with deal name, AE, value, and close date. Status sync back to SFDC not implemented.",
            "diverged": True,
            "divergence_reason": "Two-way Salesforce ↔ ClickUp sync created conflicting updates. When a field was changed in either system, the other overwrote it. Decided to make SFDC the system of record and ClickUp the team collaboration layer.",
            "compromises": "Status changes in ClickUp do not write back to Salesforce. AEs must update both systems for official pipeline reporting. Added a daily 2-minute Slack reminder to check SFDC alignment.",
            "roadblocks": [
                {
                    "type": "data_mapping_mismatch",
                    "severity": "high",
                    "tools_affected": ["Salesforce", "ClickUp", "Zapier"],
                    "description": "Salesforce Stage field values do not map 1:1 to ClickUp status options. SFDC uses 'Needs Analysis' where ClickUp uses 'Discovery'. Zapier field mapping requires custom lookup table.",
                    "workaround_found": True,
                    "workaround_description": "Built a Zapier lookup table with 8 SFDC stage → ClickUp status mappings. Maintained in a Google Sheet that Zapier references via lookup step.",
                    "time_cost_hours": 3.0,
                    "future_warning": "Salesforce stage names rarely match ClickUp status names. Always build a field mapping lookup table before attempting sync. Budget 2-3h for this step alone.",
                    "flag_for_future": True,
                },
                {
                    "type": "timing_conflict",
                    "severity": "medium",
                    "tools_affected": ["Salesforce", "ClickUp", "Zapier"],
                    "description": "Two-way sync caused update loops: ClickUp status change triggered Zapier → SFDC update → triggered another Zapier → ClickUp update → infinite loop.",
                    "workaround_found": True,
                    "workaround_description": "Disabled two-way sync entirely. Made SFDC the write-only system of record. ClickUp is read-enhanced by Zapier but never writes back. Prevents loops but requires manual dual-entry for official data.",
                    "time_cost_hours": 4.0,
                    "future_warning": "Two-way CRM ↔ ClickUp sync almost always creates update loops. Establish a clear system of record before building any sync. Do not attempt bidirectional sync via Zapier — use custom webhook middleware with deduplication logic.",
                    "flag_for_future": True,
                },
            ],
        },
        "reasoning": {
            "why_structure": "Sales Space with four lists reflects the full deal lifecycle without clutter. Active Pipeline is the primary working view. Closed Won/Lost lists preserve history for win/loss analysis. Nurture list handles deals that go cold.",
            "alternatives": "Kanban board per AE (rejected). Integration-first approach — replace Salesforce (rejected by leadership).",
            "why_rejected": "Per-AE boards fragment manager visibility. Replacing SFDC was non-starter for compliance and enterprise customer requirements.",
            "assumptions": "SFDC remains system of record for official reporting. Team accepts that ClickUp is for collaboration and SFDC for compliance. AEs will update SFDC daily.",
            "when_opposite": "If team can fully migrate off Salesforce, a pure ClickUp CRM is simpler and eliminates sync complexity. If deal count exceeds 200 active opportunities, add filtering and automation to prevent list overload.",
            "lessons": "Bidirectional CRM sync is almost never worth the complexity. Establish ONE system of record and build around it. ClickUp works best as the team layer on top of, not a replacement for, established CRMs.",
            "complexity": 4,
        },
        "outcome": {
            "built": "partially",
            "block_reason": "Two-way sync abandoned due to update loops. Manual dual-entry remains for SFDC official data.",
            "changes": "Removed bidirectional sync. Added daily Slack reminder for SFDC alignment. Added Next Action field to reduce need for Salesforce note checks.",
            "what_worked": "Sales team collaboration in ClickUp is much better. Deal context visible to whole team. Closed Won notification in Slack improved team morale.",
            "what_failed": "Dual-entry is a real pain point. Two AEs still skip SFDC updates. Two-way sync goal unachieved.",
            "satisfaction": 3,
            "recommend": "maybe",
            "revisit_when": "When custom middleware with deduplication can be built to handle bidirectional sync properly. Estimated 2-3 weeks engineering effort.",
        },
    },
    {
        "meta": {
            "workflow_type": "Content Production",
            "industries": ["DTC E-commerce Brand"],
            "tools": ["Slack", "Figma", "Google Drive", "Zapier", "Airtable"],
            "satisfaction_score": 5,
            "roadblock_count": 0,
            "built_outcome": "yes",
        },
        "intake": {
            "raw_prompt": "DTC brand, 11-person team. We produce 40+ content pieces per month across blog, social, email, and video. Currently tracked in Airtable but our team finds it too database-y. We need a content calendar that shows what's in production, who owns it, and what's coming up.",
            "industries": ["DTC E-commerce Brand"],
            "team_size": "11",
            "workflow_type": "Content Production",
            "process_frameworks": ["SOPs", "Kanban"],
            "tools": ["Slack", "Figma", "Google Drive", "Zapier", "Airtable"],
            "pain_points": ["Visibility", "Deadline Tracking", "Resource Allocation", "Process Consistency"],
            "prior_attempts": "Airtable content calendar. Works technically but team finds it unintuitive. Writers prefer a task view over a grid.",
        },
        "audit": {
            "has_existing": True,
            "overall_assessment": "Airtable is functioning but has a UX mismatch with the team's mental model. Writers think in tasks and deadlines, not database rows.",
            "tried_to_fix": False,
            "previous_fixes": "",
            "pattern_summary": "Tool mismatch, not process failure. The workflow is sound — the interface is wrong for this team.",
            "builds": [
                {
                    "tool": "Airtable",
                    "structure": "Grid view with content type, channel, owner, status, publish date",
                    "failure_reasons": ["Wrong tool for the job", "Too complex for the team"],
                    "what_breaks": "Writers don't relate to grid rows. Content editor uses it but writers bypass it. Status falls out of date because writers work in Google Docs and forget to update Airtable.",
                    "workarounds_they_use": "Slack #content-calendar channel with informal updates. Weekly 30-min sync to manually go through what's in progress.",
                    "how_long_broken": "3-6 months",
                    "who_reported": "Team Lead",
                    "integrations_in_place": ["Google Drive", "Slack"],
                    "impact_on_team": "Content editor spends 4h/week reconciling what's actually in production. Two pieces went live without final review last month.",
                    "urgency": "medium",
                }
            ],
        },
        "build": {
            "spaces": "Marketing",
            "lists": "Content Calendar, Ideas Backlog, Evergreen",
            "statuses": "Idea → Brief Written → In Production → Draft Ready → Editing → Final Review → Scheduled → Published",
            "custom_fields": "Content Type — Dropdown (Blog/Social/Email/Video/Ad) — channel classification\nPublish Date — Date — go-live target\nChannel — Dropdown (Instagram/LinkedIn/Email/Website/YouTube) — distribution channel\nWord Count — Number — for blog and email pieces\nAssigned Writer — Person — primary content creator\nAssigned Editor — Person — reviewing and approving\nBrief Link — URL — link to Google Doc brief\nFigma Board — URL — link to design assets",
            "automations": "When status → Draft Ready: auto-assign to Assigned Editor and notify via Slack\nWhen status → Final Review: notify Content Manager to approve\nWhen Publish Date < 2 days and status ≠ Scheduled: Slack alert to team\nWhen status → Published: post to #content-wins Slack channel with title and link",
            "integrations": ["Slack", "Figma", "Google Drive"],
            "build_notes": "Use Calendar view in ClickUp as the primary content calendar display — editors can see the month at a glance. Board view for writers to manage their in-progress work. Keep the Airtable → ClickUp migration via CSV export/import for historical content.",
        },
        "delta": {
            "user_intent": "Writers update Google Docs and ClickUp syncs automatically so there's no double-entry.",
            "success_criteria": "Writer finishes draft in Google Drive and ClickUp status moves to Draft Ready without any manual action.",
            "actual_build": "Writers update status manually in ClickUp when draft is done. Google Drive link is attached as a field, not synced.",
            "diverged": False,
            "divergence_reason": "",
            "compromises": "",
            "roadblocks": [],
        },
        "reasoning": {
            "why_structure": "Marketing Space with three lists: Calendar (active production), Backlog (ideas and future content), Evergreen (templates and reference). Calendar list + ClickUp Calendar view creates the visual content calendar the team wanted.",
            "alternatives": "One list per content type (rejected). One task per channel (rejected).",
            "why_rejected": "Per-content-type lists fragment the calendar view. Per-channel tasks create too many lists with few items each.",
            "assumptions": "Team uses Google Docs for writing. Final review happens inside ClickUp via comment threads. Figma used for visual content design.",
            "when_opposite": "If content volume exceeds 100 pieces/month, add Content Type as a filter and consider sub-teams with separate list views. Video production teams may need a separate Space due to different workflow stages.",
            "lessons": "ClickUp Calendar view is the secret weapon for content teams. Show it during demo — it converts Airtable users immediately. Writers think in deadlines and tasks, not database rows.",
            "complexity": 2,
        },
        "outcome": {
            "built": "yes",
            "block_reason": "",
            "changes": "Added Figma Board field not in original brief. Added Evergreen list for reusable template pieces.",
            "what_worked": "Calendar view immediately adopted. Writers prefer task-based interface. Content editor reduced reconciliation time from 4h to 45min per week.",
            "what_failed": "Google Drive sync not implemented — writers still manually update status when draft is done. Acceptable trade-off.",
            "satisfaction": 5,
            "recommend": "yes",
            "revisit_when": "When volume exceeds 60 pieces/month — may need content brief automation via AI.",
        },
    },
]


class Command(BaseCommand):
    help = "Seeds Flowpath with realistic demo case files for development and testing."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Clear all existing case files before seeding.",
        )
        parser.add_argument(
            "--user-email",
            type=str,
            default="admin@flowpath.dev",
            help="Email of the user to attribute seed data to (default: admin@flowpath.dev).",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            count = CaseFile.objects.count()
            CaseFile.objects.all().delete()
            self.stdout.write(self.style.WARNING(f"Cleared {count} existing case files."))

        # Get or create the seed user
        user, created = User.objects.get_or_create(
            email=options["user_email"],
            defaults={
                "first_name": "Flowpath",
                "last_name": "Demo",
                "role": "admin",
                "is_staff": True,
            },
        )
        if created:
            user.set_password("flowpath-demo-2024")
            user.save()
            self.stdout.write(f"Created demo user: {user.email}")

        created_count = 0
        for i, entry in enumerate(SEED_DATA, 1):
            cf = self._create_case_file(entry, user)
            self.stdout.write(
                self.style.SUCCESS(
                    f"  [{i}/{len(SEED_DATA)}] Created: {cf.workflow_type} "
                    f"({cf.industries[0] if cf.industries else 'N/A'}) "
                    f"— satisfaction {cf.satisfaction_score}/5"
                )
            )
            created_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"\n✓ Seeded {created_count} case files. "
                f"Demo user: {user.email} / flowpath-demo-2024"
            )
        )

    def _create_case_file(self, entry: dict, user) -> CaseFile:
        meta = entry["meta"]
        audit_data = entry["audit"]
        intake_data = entry["intake"]
        build_data = entry["build"]
        delta_data = entry["delta"]
        reasoning_data = entry["reasoning"]
        outcome_data = entry["outcome"]

        # Create the top-level CaseFile
        cf = CaseFile.objects.create(
            logged_by=user,
            logged_by_name=user.full_name,
            industries=meta["industries"],
            tools=meta["tools"],
            workflow_type=meta["workflow_type"],
            satisfaction_score=meta["satisfaction_score"],
            roadblock_count=meta["roadblock_count"],
            built_outcome=meta["built_outcome"],
        )

        # Layer 1: Audit
        audit = AuditLayer.objects.create(
            case_file=cf,
            has_existing=audit_data["has_existing"],
            overall_assessment=audit_data["overall_assessment"],
            tried_to_fix=audit_data["tried_to_fix"],
            previous_fixes=audit_data["previous_fixes"],
            pattern_summary=audit_data["pattern_summary"],
        )
        for i, b in enumerate(audit_data.get("builds", [])):
            CurrentBuild.objects.create(audit=audit, order=i, **b)

        # Layer 2: Intake
        IntakeLayer.objects.create(case_file=cf, **intake_data)

        # Layer 3: Build
        BuildLayer.objects.create(case_file=cf, **build_data)

        # Layer 4: Delta + Roadblocks
        delta = DeltaLayer.objects.create(
            case_file=cf,
            user_intent=delta_data["user_intent"],
            success_criteria=delta_data["success_criteria"],
            actual_build=delta_data["actual_build"],
            diverged=delta_data["diverged"],
            divergence_reason=delta_data["divergence_reason"],
            compromises=delta_data["compromises"],
        )
        for i, rb in enumerate(delta_data.get("roadblocks", [])):
            Roadblock.objects.create(delta=delta, order=i, **rb)

        # Layer 5: Reasoning
        ReasoningLayer.objects.create(case_file=cf, **reasoning_data)

        # Layer 6: Outcome
        OutcomeLayer.objects.create(case_file=cf, **outcome_data)

        return cf
