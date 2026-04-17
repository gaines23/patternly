"""
management command: seed_templates

Populates WorkflowTemplate with pre-built templates covering the most common
workflow types seen in Patternly builds. Run once on first boot or after a
database reset.

Usage:
    python manage.py seed_templates
    python manage.py seed_templates --clear   # remove existing templates first
"""
from django.core.management.base import BaseCommand
from apps.workflows.models import WorkflowTemplate


TEMPLATES = [
    {
        "name": "Agency Client Project Management",
        "description": "Multi-client tracking for agencies managing deliverables, deadlines, and client communication.",
        "workflow_type": "Client Project Management",
        "industries": ["Marketing Agency", "Creative Agency", "Advertising"],
        "pain_points": ["Visibility", "Deadline Tracking", "Client Transparency", "Handoffs"],
        "tools": ["Slack", "HubSpot", "Google Drive", "Loom"],
        "process_frameworks": ["Kanban", "Client Onboarding"],
        "spaces": "Client Work, Internal Ops",
        "lists": "Active Clients, Proposals, Completed, Internal Tasks",
        "statuses": "Briefed → In Production → Internal Review → Client Review → Approved → Live",
        "custom_fields": (
            "Client Name — Text — identifies which client\n"
            "Deadline — Date — hard delivery deadline\n"
            "Assigned PM — Person — single owner per project\n"
            "Client Priority — Dropdown (P1/P2/P3) — urgency tier\n"
            "Billable Hours — Number — actual vs estimate tracking"
        ),
        "automations": (
            "When status → Client Review: notify client contact via email\n"
            "When Deadline < 3 days and status ≠ Approved: Slack alert to PM\n"
            "When status → Live: move to Completed list and log to HubSpot"
        ),
        "integrations": ["Slack", "HubSpot", "Google Drive"],
        "build_notes": (
            "Keep statuses under 7 — agencies abandon workflows with too many gates. "
            "The Client Review stage is the critical handoff; automate the notification "
            "so PMs don't forget."
        ),
        "estimated_complexity": 3,
    },
    {
        "name": "SaaS Engineering Sprint Tracker",
        "description": "Sprint planning and delivery tracking for software teams with GitHub integration.",
        "workflow_type": "Sprint Planning",
        "industries": ["SaaS", "Software", "Technology"],
        "pain_points": ["Visibility", "Accountability", "Handoffs", "Reporting"],
        "tools": ["GitHub", "Slack", "Linear", "Jira"],
        "process_frameworks": ["Agile", "Scrum"],
        "spaces": "Engineering, Product",
        "lists": "Backlog, Sprint Active, In Review, Done",
        "statuses": "Backlog → Ready → In Progress → PR Open → In Review → Merged → Done",
        "custom_fields": (
            "Story Points — Number — effort estimate\n"
            "Sprint — Dropdown — current sprint label\n"
            "GitHub PR — URL — linked pull request\n"
            "Priority — Dropdown (P0/P1/P2/P3) — triage level\n"
            "Type — Dropdown (Feature/Bug/Chore) — work category"
        ),
        "automations": (
            "When GitHub PR merged: set status → Merged\n"
            "When status → In Review: assign reviewer and notify in Slack\n"
            "When Sprint ends: move incomplete tasks to next sprint Backlog\n"
            "When task created with Type=Bug and Priority=P0: alert #incidents channel"
        ),
        "integrations": ["GitHub", "Slack"],
        "build_notes": (
            "Velocity tracking requires consistent story point estimates — run a calibration "
            "session before launch. GitHub automation needs the ClickUp GitHub app, not Zapier. "
            "Keep the Backlog list separate from sprint lists so burn-down charts stay clean."
        ),
        "estimated_complexity": 4,
    },
    {
        "name": "Client Onboarding Pipeline",
        "description": "Standardised onboarding process for professional services firms bringing on new clients.",
        "workflow_type": "Client Onboarding",
        "industries": ["Consulting", "Professional Services", "Legal", "Accounting"],
        "pain_points": ["Standardisation", "Handoffs", "Accountability", "Visibility"],
        "tools": ["Slack", "Google Drive", "DocuSign", "HubSpot"],
        "process_frameworks": ["Client Onboarding", "Kanban"],
        "spaces": "Client Onboarding, Active Clients",
        "lists": "New Enquiries, Onboarding In Progress, Active, Offboarded",
        "statuses": "Lead → Proposal Sent → Contract Signed → Kickoff Scheduled → Discovery → Setup → Live",
        "custom_fields": (
            "Client Name — Text\n"
            "Contract Value — Currency\n"
            "Kickoff Date — Date\n"
            "Account Owner — Person\n"
            "Onboarding Checklist — Checkbox items — tracks completion per stage"
        ),
        "automations": (
            "When status → Contract Signed: create onboarding task checklist from template\n"
            "When status → Kickoff Scheduled: send calendar invite and briefing doc\n"
            "When all checklist items complete: advance status → Live\n"
            "When status → Live: notify account owner and log to HubSpot"
        ),
        "integrations": ["HubSpot", "Google Drive", "Slack"],
        "build_notes": (
            "The checklist template is the heart of this build — invest time making it complete "
            "before launch. Use ClickUp's task template feature to auto-create the checklist on "
            "contract signature. Avoid too many status stages: consultants stop updating when "
            "it feels like admin."
        ),
        "estimated_complexity": 3,
    },
    {
        "name": "Content Production Calendar",
        "description": "End-to-end content pipeline for teams producing regular blog, social, or video content.",
        "workflow_type": "Content Calendar",
        "industries": ["Media", "Marketing Agency", "E-commerce", "SaaS"],
        "pain_points": ["Visibility", "Deadline Tracking", "Handoffs", "Reporting"],
        "tools": ["Slack", "Google Drive", "Notion", "Airtable"],
        "process_frameworks": ["Kanban", "Editorial Calendar"],
        "spaces": "Content, Social, Distribution",
        "lists": "Ideas, In Production, In Review, Scheduled, Published",
        "statuses": "Idea → Brief Written → In Draft → Internal Review → Approved → Scheduled → Published",
        "custom_fields": (
            "Content Type — Dropdown (Blog/Video/Social/Email)\n"
            "Publish Date — Date\n"
            "Channel — Dropdown (Website/LinkedIn/Instagram/Newsletter)\n"
            "Author — Person\n"
            "SEO Keyword — Text\n"
            "Word Count — Number"
        ),
        "automations": (
            "When Publish Date is 3 days away and status ≠ Scheduled: Slack alert to editor\n"
            "When status → Published: log URL in Published list and notify distribution team\n"
            "When task created in Ideas: assign to content lead for brief review"
        ),
        "integrations": ["Slack", "Google Drive"],
        "build_notes": (
            "Use the Calendar view as the primary view — it replaces the spreadsheet. "
            "Keep the Ideas list separate so the pipeline view stays clean. "
            "Teams producing 20+ pieces/month benefit from a dedicated Scheduled list "
            "distinct from In Review."
        ),
        "estimated_complexity": 2,
    },
    {
        "name": "Bug Tracking & QA Pipeline",
        "description": "Issue reporting, triage, and resolution workflow for product and engineering teams.",
        "workflow_type": "Bug Tracking",
        "industries": ["SaaS", "Software", "Technology", "E-commerce"],
        "pain_points": ["Accountability", "Visibility", "Reporting", "Prioritisation"],
        "tools": ["GitHub", "Slack", "Jira", "Sentry"],
        "process_frameworks": ["Agile", "Scrum"],
        "spaces": "Engineering, QA",
        "lists": "Reported, Triaged, In Progress, In QA, Resolved, Won't Fix",
        "statuses": "Reported → Triaged → Assigned → In Progress → In QA → Resolved",
        "custom_fields": (
            "Severity — Dropdown (Critical/High/Medium/Low)\n"
            "Environment — Dropdown (Production/Staging/Dev)\n"
            "Reporter — Person\n"
            "Reproduces — Checkbox\n"
            "GitHub Issue — URL\n"
            "Affected Version — Text"
        ),
        "automations": (
            "When Severity=Critical: notify #incidents in Slack immediately\n"
            "When status → In QA: assign to QA lead and set due date to +2 days\n"
            "When status → Resolved: notify reporter and close linked GitHub issue\n"
            "When task sits in Triaged > 3 days: escalate to engineering lead"
        ),
        "integrations": ["GitHub", "Slack", "Sentry"],
        "build_notes": (
            "Triage is the most skipped step — automate a daily digest of untriaged bugs "
            "to keep the queue moving. Sentry integration creates tasks automatically from "
            "error alerts. Won't Fix list keeps resolved discussions visible without polluting "
            "active views."
        ),
        "estimated_complexity": 3,
    },
    {
        "name": "Sales Pipeline CRM",
        "description": "Deal tracking and sales activity management for small to mid-size sales teams.",
        "workflow_type": "Sales Pipeline",
        "industries": ["SaaS", "Professional Services", "Consulting", "Technology"],
        "pain_points": ["Visibility", "Accountability", "Reporting", "Deadline Tracking"],
        "tools": ["HubSpot", "Slack", "Salesforce", "Gmail"],
        "process_frameworks": ["Sales Funnel", "CRM"],
        "spaces": "Sales, Accounts",
        "lists": "Leads, Qualified, Proposal, Negotiation, Closed Won, Closed Lost",
        "statuses": "New Lead → Contacted → Qualified → Proposal Sent → Negotiating → Closed Won / Closed Lost",
        "custom_fields": (
            "Deal Value — Currency\n"
            "Close Date — Date\n"
            "Account Owner — Person\n"
            "Lead Source — Dropdown (Inbound/Outbound/Referral/Event)\n"
            "Next Action — Text\n"
            "Probability — Number (%)"
        ),
        "automations": (
            "When status → Proposal Sent: set follow-up due date to +3 days\n"
            "When Close Date passes and status ≠ Closed: alert account owner in Slack\n"
            "When status → Closed Won: create onboarding task in Client Onboarding space\n"
            "When status → Closed Lost: prompt for loss reason via comment"
        ),
        "integrations": ["HubSpot", "Slack", "Gmail"],
        "build_notes": (
            "Sync with HubSpot is one-directional by default (HubSpot → ClickUp). "
            "Full bidirectional sync requires middleware (Zapier or Make). "
            "Keep pipeline stages ≤ 7 — more stages means reps stop updating. "
            "The Closed Lost list with loss reasons is critical for coaching."
        ),
        "estimated_complexity": 3,
    },
    {
        "name": "Product Roadmap & Feature Requests",
        "description": "Feature backlog, prioritisation, and roadmap planning for product teams.",
        "workflow_type": "Product Roadmap",
        "industries": ["SaaS", "Software", "Technology"],
        "pain_points": ["Visibility", "Prioritisation", "Reporting", "Stakeholder Communication"],
        "tools": ["Slack", "GitHub", "Notion", "Figma"],
        "process_frameworks": ["Agile", "OKRs", "Product Discovery"],
        "spaces": "Product, Design, Engineering",
        "lists": "Feature Requests, Backlog, Now, Next, Later, Shipped",
        "statuses": "Idea → Under Review → Prioritised → In Design → In Dev → In QA → Shipped",
        "custom_fields": (
            "Quarter — Dropdown (Q1/Q2/Q3/Q4)\n"
            "Effort — Dropdown (S/M/L/XL) — t-shirt sizing\n"
            "Impact — Dropdown (High/Medium/Low)\n"
            "Requestor — Text — who asked for it\n"
            "OKR Alignment — Text — which OKR this supports\n"
            "Figma Link — URL"
        ),
        "automations": (
            "When status → In Design: notify designer and link Figma file\n"
            "When status → In Dev: create linked engineering tasks in sprint backlog\n"
            "When status → Shipped: notify requestor and move to Shipped list\n"
            "When Quarter changes: trigger roadmap review reminder to product lead"
        ),
        "integrations": ["Slack", "GitHub", "Figma"],
        "build_notes": (
            "The Now/Next/Later lists map to the Shape Up or roadmap horizon model. "
            "Use Effort × Impact scoring to auto-prioritise the backlog. "
            "Keep Feature Requests as a raw intake list — don't let it pollute the "
            "active roadmap. Shipped list is your changelog."
        ),
        "estimated_complexity": 4,
    },
    {
        "name": "HR Hiring Pipeline",
        "description": "End-to-end recruitment tracking from job posting through to offer and onboarding.",
        "workflow_type": "Hiring Pipeline",
        "industries": ["HR", "Recruiting", "Technology", "Professional Services"],
        "pain_points": ["Visibility", "Accountability", "Standardisation", "Handoffs"],
        "tools": ["Slack", "Google Drive", "Greenhouse", "LinkedIn"],
        "process_frameworks": ["Hiring Funnel"],
        "spaces": "Recruiting, HR",
        "lists": "Open Roles, Applicants, Interviewing, Offer Stage, Hired, Rejected",
        "statuses": "Applied → Screened → Phone Interview → Technical → Final Round → Offer Sent → Hired / Rejected",
        "custom_fields": (
            "Role — Text\n"
            "Department — Dropdown\n"
            "Hiring Manager — Person\n"
            "Interview Stage — Dropdown\n"
            "Interview Date — Date\n"
            "Salary Band — Text\n"
            "Referral — Checkbox"
        ),
        "automations": (
            "When status → Phone Interview: send calendar invite template to candidate\n"
            "When status → Offer Sent: set expiry date to +5 days and alert HR\n"
            "When status → Hired: create onboarding tasks and notify IT and manager\n"
            "When application sits in Screened > 5 days: nudge hiring manager"
        ),
        "integrations": ["Slack", "Google Drive", "Gmail"],
        "build_notes": (
            "One task per candidate — don't create sub-tasks per interview round, use "
            "status progression instead. The nudge automation on Screened is the highest "
            "ROI automation in this build — ghosting candidates is the #1 recruiter complaint. "
            "Hired status should trigger an IT provisioning checklist automatically."
        ),
        "estimated_complexity": 2,
    },
]


class Command(BaseCommand):
    help = "Seed WorkflowTemplate table with pre-built templates"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete all existing templates before seeding",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            count = WorkflowTemplate.objects.count()
            WorkflowTemplate.objects.all().delete()
            self.stdout.write(self.style.WARNING(f"Cleared {count} existing templates."))

        created = 0
        skipped = 0
        for data in TEMPLATES:
            _, was_created = WorkflowTemplate.objects.get_or_create(
                name=data["name"],
                defaults=data,
            )
            if was_created:
                created += 1
            else:
                skipped += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. {created} template(s) created, {skipped} already existed."
            )
        )
