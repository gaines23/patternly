/**
 * CaseFileForm.jsx
 *
 * The full 6-step Flowpath intake form.
 * Receives onSubmit(formData, enteredBy) and isSaving props.
 * Internally manages all form state; calls onSubmit when user hits "Save Case File".
 *
 * This is the same form built in workflow-intake.jsx, refactored as a
 * reusable component that can be used for both Create and Edit flows.
 */
import { useState, useEffect, useRef } from "react";
import { useTheme } from "../hooks/useTheme";

// ── All data constants (same as workflow-intake.jsx) ──────────────────────────
const INDUSTRY_MAP = {
  "Creative & Marketing": ["Marketing Agency","Creative Agency","PR & Communications","Branding Studio","Video Production","Photography Studio","Copywriting / Content Agency","Social Media Agency","SEO / Digital Marketing","Influencer Management"],
  "Technology": ["SaaS / Software Product","Mobile App Development","IT Consulting","Cybersecurity","Data & Analytics","AI / ML Company","Dev Shop / Software Agency","DevOps / Infrastructure","Hardware / IoT","Web3 / Crypto"],
  "Professional Services": ["Management Consulting","Legal / Law Firm","Accounting / CPA Firm","Financial Advisory","HR Consulting","Business Coaching","Recruiting / Staffing","Architecture Firm","Engineering Consulting","Research & Strategy","Market Research Firm","Consumer Insights Agency","UX Research","Survey & Data Collection","Focus Group Facilitation","Panel Management","Competitive Intelligence","Brand Tracking","Ethnographic Research","Behavioral Research"],
  "Construction & Real Estate": ["General Contractor","Residential Construction","Commercial Construction","Real Estate Development","Property Management","Interior Design","Landscape Architecture","Civil Engineering","Home Renovation"],
  "Healthcare & Life Sciences": ["Hospital / Health System","Medical Practice / Clinic","Telehealth Platform","Pharmaceutical","Biotech / MedTech","Mental Health Services","Dental Practice","Physical Therapy","Healthcare Staffing","Clinical Research"],
  "Education": ["K-12 School / District","Higher Education / University","EdTech Platform","Corporate Training","Online Course Creator","Tutoring Service","Coding Bootcamp","Curriculum Development","Non-profit Education"],
  "E-commerce & Retail": ["DTC E-commerce Brand","Marketplace Seller","Retail Chain","Wholesale / Distribution","Subscription Box","Fashion & Apparel","Food & Beverage Brand","Consumer Electronics","Luxury Goods"],
  "Operations & Logistics": ["Supply Chain / Logistics","Fulfillment / 3PL","Manufacturing","Field Services","Facilities Management","Fleet Management","Event Management","Hospitality / Hotel","Restaurant Group"],
  "Non-profit & Government": ["Non-profit Organization","NGO / International Aid","Government Agency","Public Health","Community Organization","Foundation / Philanthropy"],
  "Finance & Insurance": ["Investment Firm / VC","Private Equity","Insurance Agency","Fintech Startup","Mortgage / Lending","Wealth Management","Audit Firm"],
};

const WORKFLOW_PROCESS_MAP = {
  "Strategic Planning": [
    {name:"OKRs",desc:"Objectives & Key Results — goal-setting tied to measurable outcomes"},
    {name:"KPIs",desc:"Key Performance Indicators — ongoing performance metrics"},
    {name:"Balanced Scorecard",desc:"Strategic performance across financial, customer, process, learning"},
    {name:"SWOT Analysis",desc:"Strengths, Weaknesses, Opportunities, Threats"},
    {name:"North Star Metric",desc:"Single defining metric that reflects core product value"},
    {name:"Hoshin Kanri",desc:"Policy deployment aligning strategy from exec to front-line"},
  ],
  "Project Delivery": [
    {name:"Phase Gate",desc:"Stage-gate reviews before each project phase can proceed"},
    {name:"Waterfall",desc:"Sequential, phase-by-phase project delivery"},
    {name:"Agile / Scrum",desc:"Iterative sprints with standups, retrospectives, backlog grooming"},
    {name:"Kanban",desc:"Continuous flow with WIP limits and visual board"},
    {name:"SAFe",desc:"Scaled Agile Framework for enterprise multi-team programs"},
    {name:"PRINCE2",desc:"Structured project management with defined roles and stages"},
    {name:"Critical Path Method",desc:"Identify longest dependency chain to determine project duration"},
    {name:"PMBOK",desc:"PMI's process-based framework for project management"},
    {name:"Program Delivery",desc:"Multi-cohort or recurring delivery of structured programs with defined curricula and completion criteria"},
  ],
  "Product Development": [
    {name:"Dual-Track Agile",desc:"Parallel discovery and delivery tracks"},
    {name:"Shape Up",desc:"Basecamp's 6-week cycle with appetite-based scoping"},
    {name:"Jobs To Be Done",desc:"Feature development driven by user job stories"},
    {name:"Design Sprint",desc:"5-day Google Ventures framework for rapid prototyping"},
    {name:"Product Roadmapping",desc:"Theme or timeline-based feature planning"},
    {name:"MoSCoW Prioritization",desc:"Must have / Should have / Could have / Won't have"},
    {name:"RICE Scoring",desc:"Reach x Impact x Confidence divided by Effort prioritization"},
  ],
  "Operations & Process": [
    {name:"SOPs",desc:"Standard Operating Procedures for repeatable processes"},
    {name:"Lean / Six Sigma",desc:"Waste elimination and process variation reduction"},
    {name:"RACI Matrix",desc:"Responsible, Accountable, Consulted, Informed assignments"},
    {name:"BPM",desc:"Business Process Management — model, automate, monitor processes"},
    {name:"ISO 9001",desc:"Quality management system standard"},
    {name:"Value Stream Mapping",desc:"Visualize and optimize end-to-end process flow"},
    {name:"RPA",desc:"Robotic Process Automation for rule-based task execution"},
  ],
  "Client & Sales": [
    {name:"Sales Pipeline",desc:"Stage-based deal management from lead to close"},
    {name:"Client Onboarding",desc:"Structured intake and setup process for new clients"},
    {name:"QBR",desc:"Quarterly Business Review — client performance check-in"},
    {name:"NPS Tracking",desc:"Net Promoter Score collection and response workflow"},
    {name:"Renewal / Upsell Workflow",desc:"Proactive account expansion and retention process"},
    {name:"RFP / Proposal Process",desc:"Structured response and approval workflow for bids"},
    {name:"Milestones & Deliverables",desc:"Checkpoints marking major stage completions paired with the tangible or intangible outputs produced at each phase"},
  ],
  "People & HR": [
    {name:"Employee Onboarding",desc:"Day 1 through 90-day structured ramp plan"},
    {name:"Performance Review Cycle",desc:"Quarterly or annual review and feedback process"},
    {name:"OKR Check-ins",desc:"Recurring goal progress reviews"},
    {name:"Headcount Planning",desc:"Hiring roadmap and role prioritization"},
    {name:"L&D Tracking",desc:"Learning and development program management"},
    {name:"Cohort Management",desc:"Managing groups of participants across sessions, tracks, and completion milestones"},
    {name:"Offboarding",desc:"Structured exit process and knowledge transfer"},
  ],
  "Compliance & Risk": [
    {name:"Audit Workflow",desc:"Internal or external audit preparation and execution"},
    {name:"Change Management",desc:"Structured process for organizational or system changes"},
    {name:"Risk Register",desc:"Identify, score, and track mitigation of risks"},
    {name:"Incident Response",desc:"Structured triage and resolution for critical issues"},
    {name:"Compliance Checklist",desc:"Regulatory requirement tracking and sign-off"},
  ],
};

export const WORKFLOW_TYPES = [
  { name: "Bug Tracking",               desc: "Issue logging, reproduction, assignment, and fix verification" },
  { name: "Campaign Management",        desc: "Multi-channel marketing campaign planning, execution, and performance tracking" },
  { name: "Client Onboarding",          desc: "Intake and setup process for new clients, from signed contract to first delivery" },
  { name: "Client Project Management",  desc: "Tracking deliverables, timelines, and communication for client-facing work" },
  { name: "Clinical Trial Tracking",    desc: "Protocol adherence, participant management, and regulatory reporting" },
  { name: "Construction Milestones",    desc: "Phase-based project tracking for build, inspection, and handoff" },
  { name: "Content Production",         desc: "Brief-to-publish pipeline covering writing, design, review, and scheduling" },
  { name: "Design Review",              desc: "Creative feedback loops, revision tracking, and approval workflows" },
  { name: "Employee Onboarding",        desc: "Structured ramp covering tools, training, and 30/60/90-day milestones" },
  { name: "Event Planning",             desc: "Logistics, vendor coordination, and timeline management for events" },
  { name: "Grant Management",           desc: "Application tracking, reporting requirements, and fund disbursement" },
  { name: "Legal Matter Management",    desc: "Case intake, document management, deadline tracking, and billing" },
  { name: "Procurement / Vendor Mgmt",  desc: "Vendor selection, contract management, and purchase order workflows" },
  { name: "Product Roadmap",            desc: "Feature prioritization, planning cycles, and cross-team alignment" },
  { name: "Project Management",         desc: "General-purpose project tracking with tasks, milestones, owners, and deadlines" },
  { name: "Reporting & Dashboards",     desc: "Recurring data collection, aggregation, and stakeholder reporting workflows" },
  { name: "Sales Pipeline",             desc: "Stage-based deal management from lead qualification through close" },
  { name: "Sprint Planning",            desc: "Agile iteration planning with task assignment, backlog grooming, and velocity tracking" },
  { name: "Support Ticketing",          desc: "Issue intake, triage, assignment, and resolution tracking" },
];

export const TOOLS = ["ClickUp","Slack","HubSpot","GitHub","Google Drive","Google Sheets","Excel","Google Docs","Word","Stripe","Notion","Jira","Salesforce","Zoom","Asana","Monday","Trello","Zapier","Make","Airtable","Figma","Linear","Intercom","Zendesk","QuickBooks","Xero","DocuSign","Loom","Miro","Confluence", "SmartSheet"];
export const PAIN_POINTS = ["Visibility","Accountability","Handoffs","Reporting","Capacity Planning","Communication","Deadline Tracking","Resource Allocation","Client Transparency","Cross-team Alignment","Process Consistency","Approval Bottlenecks"];
export const FAILURE_REASONS = ["Too complex for the team","Nobody using it consistently","Automations breaking","Wrong tool for the job","Integrations not working","Statuses don't match real workflow","Too many custom fields","Permissions/visibility issues","No ownership assigned","Outgrown the current setup","Poor onboarding — built wrong from start","Duplicate work across tools","No reporting / can't see progress","Manual steps still required"];
export const CURRENT_TOOLS_USED = ["ClickUp (prior setup)","Spreadsheets / Excel","Notion","Trello","Asana","Monday.com","Jira","Email threads","Slack channels","Whiteboard / sticky notes","MS Project","Basecamp","Smartsheet","Paper / manual","No system at all"];
const ROADBLOCK_TYPES = ["Integration Limitation","API Limitation","Automation Limitation","Data Mapping Mismatch","Auth Complexity","Timing Conflict","Cost Ceiling","User Behavior Gap","Scope Creep Block"];
const SEVERITIES = ["Low","Medium","High","Blocker"];

export const THIRD_PARTY_PLATFORMS = ["Make","Zapier","HubSpot Workflows","n8n","Pabbly Connect","ActiveCampaign","Monday Automations","Other"];

const HUBSPOT_TRIGGERS = ["Filter-based","Event-based","Based on a schedule","Based on webhooks"];

export const CLICKUP_TRIGGERS = [
  "Task Created","Task Status Changed","Task Completed","Task Moved","Task Assigned","Task Unassigned",
  "Task Due Date Arrives","Task Start Date Arrives","Task Due Date Changed","Task Priority Changed",
  "Custom Field Changed","Custom Field Is","Comment Posted","Attachment Added","Tag Added","Tag Removed", "Task Type Is",
  "Checklist Item Completed","Time Estimate Changed","Dependency Resolved","Form Submitted","Recurring Task Due",
];
export const CLICKUP_ACTIONS = [
  "Change Status","Assign To","Unassign From","Set Priority","Set Due Date","Set Start Date",
  "Move to List","Add to List","Create List","Copy Task","Create Subtask","Create Task","Post Comment","Send Email",
  "Add Tag","Remove Tag","Set Custom Field","Start Time Tracking","Stop Time Tracking", "Change Task Type",
  "Apply Template","Archive Task","Send Webhook",
];

const STEPS = [
  {id:"audit",     label:"Current State",    short:"Audit",     color:"#EA580C"},
  {id:"intake",    label:"Scenario",          short:"Scenario",  color:"#7C3AED"},
  {id:"build",     label:"Build",             short:"Build",     color:"#0284C7"},
  {id:"delta",     label:"Intent vs Reality", short:"Delta",     color:"#DC2626"},
  {id:"reasoning", label:"Reasoning",         short:"Reasoning", color:"#059669"},
  {id:"outcome",   label:"Outcome",           short:"Outcome",   color:"#4F46E5"},
];

const STEP_TITLES = ["Current State Audit","Scenario Intake","Build Documentation","Intent vs Reality","Decision Reasoning","Outcome Capture"];
const STEP_DESC = [
  "Document what the user already has — and exactly why it's failing.",
  "Capture the raw scenario and what the user is trying to solve.",
  "Document what was actually built in ClickUp, field by field.",
  "Log the gap between what was wanted and what was delivered.",
  "Record the reasoning behind every major decision.",
  "Capture the post-build result and long-term usage signal.",
];

const DEFAULT_STATE = {
  audit:     {hasExisting:null,overallAssessment:"",triedToFix:null,previousFixes:"",builds:[],patternSummary:""},
  intake:    {rawPrompt:"",industries:[],teamSize:"",workflowType:"",processFrameworks:[],tools:[],painPoints:[],priorAttempts:""},
  build:     {buildNotes:"",workflows:[]},
  delta:     {userIntent:"",successCriteria:"",actualBuild:"",diverged:null,divergenceReason:"",compromises:"",roadblocks:[]},
  reasoning: {whyStructure:"",alternatives:"",whyRejected:"",assumptions:"",whenOpposite:"",lessons:"",complexity:3},
  outcome:   {built:null,blockReason:"",changes:"",whatWorked:"",whatFailed:"",satisfaction:3,recommend:null,revisitWhen:""},
};

//  ── Primitive UI components (self-contained, no external deps) ────────────────
const F = "'Plus Jakarta Sans', sans-serif";
const BLUE = "#2563EB";

function useWidth() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 800);
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return w;
}

function Lbl({ children, hint }) {
  const { theme } = useTheme();
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:6 }}>
      <span style={{ fontSize:13, fontWeight:600, color:theme.text, fontFamily:F }}>{children}</span>
      {hint && <span style={{ fontSize:11, color:theme.textFaint, fontFamily:F }}>{hint}</span>}
    </div>
  );
}

function Field({ label, hint, children, style }) {
  return (
    <div style={{ marginBottom:16, ...style }}>
      {label && <Lbl hint={hint}>{label}</Lbl>}
      {children}
    </div>
  );
}

function TI({ value, onChange, placeholder, rows }) {
  const [f, setF] = useState(false);
  const { theme } = useTheme();
  const s = { width:"100%", boxSizing:"border-box", fontFamily:F, fontSize:14, color:theme.text, background:theme.inputBg, border:`1.5px solid ${f?theme.blue:theme.borderInput}`, borderRadius:10, padding:"10px 13px", outline:"none", transition:"border-color 0.15s, box-shadow 0.15s", boxShadow:f?`0 0 0 3px ${theme.blueLight}`:"none", resize:"vertical", lineHeight:1.6, WebkitAppearance:"none" };
  return rows
    ? <textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} style={s} onFocus={()=>setF(true)} onBlur={()=>setF(false)}/>
    : <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={s} onFocus={()=>setF(true)} onBlur={()=>setF(false)}/>;
}

function Sel({ value, onChange, options, placeholder="Choose one…" }) {
  const [f, setF] = useState(false);
  const { theme } = useTheme();
  return (
    <select value={value} onChange={e=>onChange(e.target.value)} onFocus={()=>setF(true)} onBlur={()=>setF(false)}
      style={{ width:"100%", boxSizing:"border-box", fontFamily:F, fontSize:14, color:value?theme.text:theme.textFaint, background:theme.inputBg, border:`1.5px solid ${f?theme.blue:theme.borderInput}`, borderRadius:10, padding:"10px 13px", outline:"none", cursor:"pointer", boxShadow:f?`0 0 0 3px ${theme.blueLight}`:"none", WebkitAppearance:"none", appearance:"none", backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' stroke='%239CA3AF' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")", backgroundRepeat:"no-repeat", backgroundPosition:"right 12px center", paddingRight:36 }}>
      <option value="">{placeholder}</option>
      {options.map(o=><option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function SelDesc({ value, onChange, options, placeholder="Choose one…" }) {
  const [open, setOpen] = useState(false);
  const { theme } = useTheme();
  const ref = useRef(null);
  const selected = options.find(o => o.name === value);

  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={ref} style={{ position:"relative", width:"100%" }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{
        width:"100%", boxSizing:"border-box", fontFamily:F, fontSize:14,
        color: value ? theme.text : theme.textFaint,
        background:theme.inputBg, border:`1.5px solid ${open ? theme.blue : theme.borderInput}`,
        borderRadius:10, padding:"10px 36px 10px 13px", outline:"none", cursor:"pointer",
        textAlign:"left", boxShadow: open ? `0 0 0 3px ${theme.blueLight}` : "none",
        backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' stroke='%239CA3AF' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E\")",
        backgroundRepeat:"no-repeat", backgroundPosition:"right 12px center",
      }}>
        {value || placeholder}
      </button>
      {open && (
        <div style={{
          position:"absolute", top:"calc(100% + 4px)", left:0, right:0, zIndex:100,
          background:theme.surface, border:`1.5px solid ${theme.borderInput}`, borderRadius:12,
          boxShadow:"0 8px 24px rgba(0,0,0,0.15)", maxHeight:320, overflowY:"auto",
        }}>
          {options.map(o => (
            <button key={o.name} type="button" onClick={() => { onChange(o.name); setOpen(false); }} style={{
              display:"block", width:"100%", textAlign:"left", padding:"10px 14px",
              background: value === o.name ? theme.blueLight : "transparent",
              border:"none", cursor:"pointer", fontFamily:F,
            }}
            onMouseEnter={e => { if (value !== o.name) e.currentTarget.style.background = theme.surfaceAlt; }}
            onMouseLeave={e => { if (value !== o.name) e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ display:"block", fontSize:13, fontWeight:600, color: value === o.name ? theme.blue : theme.text }}>{o.name}</span>
              <span style={{ display:"block", fontSize:12, color:theme.textMuted, marginTop:2, lineHeight:1.4 }}>{o.desc}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({ label, active, color=BLUE, onClick }) {
  const { theme } = useTheme();
  return (
    <button onClick={onClick} style={{ padding:"7px 14px", borderRadius:20, fontSize:12, fontWeight:500, fontFamily:F, cursor:"pointer", transition:"all 0.15s", border:active?`1.5px solid ${color}`:`1.5px solid ${theme.borderInput}`, background:active?color+"18":theme.inputBg, color:active?color:theme.textMuted, minHeight:36, WebkitTapHighlightColor:"transparent" }}>
      {label}
    </button>
  );
}

export function ChipGroup({ options, selected, onChange, color=BLUE }) {
  const { theme } = useTheme();
  const toggle = item => onChange(selected.includes(item)?selected.filter(i=>i!==item):[...selected,item]);
  return (
    <div>
      {selected.length>0 && (
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10, padding:"10px 12px", background:color+"10", border:`1px solid ${color}30`, borderRadius:8 }}>
          <span style={{ fontSize:11, fontWeight:700, color, alignSelf:"center", fontFamily:F, textTransform:"uppercase", letterSpacing:"0.05em" }}>Selected:</span>
          {selected.map(s=><span key={s} onClick={()=>toggle(s)} style={{ fontSize:12, color, background:theme.surface, border:`1px solid ${color}40`, borderRadius:12, padding:"3px 10px", cursor:"pointer", fontFamily:F, fontWeight:500 }}>{s} ×</span>)}
        </div>
      )}
      <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>{options.map(o=><Chip key={o} label={o} active={selected.includes(o)} color={color} onClick={()=>toggle(o)}/>)}</div>
    </div>
  );
}

function TogGroup({ options, value, onChange, color=BLUE }) {
  const { theme } = useTheme();
  return (
    <div style={{ display:"flex", gap:8 }}>
      {options.map(o=>(
        <button key={o} onClick={()=>onChange(value===o?null:o)} style={{ flex:1, padding:"11px 8px", borderRadius:10, fontSize:13, fontWeight:500, fontFamily:F, cursor:"pointer", transition:"all 0.15s", border:value===o?`1.5px solid ${color}`:`1.5px solid ${theme.borderInput}`, background:value===o?color+"14":theme.inputBg, color:value===o?color:theme.textMuted, minHeight:44, WebkitTapHighlightColor:"transparent" }}>
          {o}
        </button>
      ))}
    </div>
  );
}

function Card({ children, accent, style }) {
  const { theme } = useTheme();
  return (
    <div style={{ background:theme.surface, border:accent?`1.5px solid ${accent}28`:`1px solid ${theme.border}`, borderRadius:14, padding:"20px 18px", marginBottom:14, boxShadow:"0 1px 4px rgba(0,0,0,0.04)", borderLeft:accent?`4px solid ${accent}`:undefined, ...style }}>
      {children}
    </div>
  );
}

function CardTitle({ children, sub }) {
  const { theme } = useTheme();
  return (
    <div style={{ marginBottom:16 }}>
      <p style={{ margin:0, fontSize:15, fontWeight:700, color:theme.text, fontFamily:F }}>{children}</p>
      {sub && <p style={{ margin:"3px 0 0", fontSize:12, color:theme.textFaint, fontFamily:F, lineHeight:1.5 }}>{sub}</p>}
    </div>
  );
}

function Banner({ emoji, title, body, color }) {
  const { theme } = useTheme();
  return (
    <div style={{ display:"flex", gap:12, padding:"14px 16px", background:color+"0D", border:`1px solid ${color}30`, borderRadius:12, marginBottom:18 }}>
      <span style={{ fontSize:20, flexShrink:0, lineHeight:1.4 }}>{emoji}</span>
      <div>
        <p style={{ margin:"0 0 3px", fontSize:12, fontWeight:700, color, fontFamily:F }}>{title}</p>
        <p style={{ margin:0, fontSize:12, color:theme.textMuted, fontFamily:F, lineHeight:1.65 }}>{body}</p>
      </div>
    </div>
  );
}

function HR({ label }) {
  const { theme } = useTheme();
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, margin:"18px 0" }}>
      <div style={{ flex:1, height:1, background:theme.borderSubtle }}/>
      {label && <span style={{ fontSize:10, fontWeight:700, color:theme.textFaint, fontFamily:F, letterSpacing:"0.08em", textTransform:"uppercase", whiteSpace:"nowrap" }}>{label}</span>}
      <div style={{ flex:1, height:1, background:theme.borderSubtle }}/>
    </div>
  );
}

function Stars({ value, onChange }) {
  const [hov, setHov] = useState(0);
  const { theme } = useTheme();
  const labels = ["","Needs major rework","Partially useful","Mostly worked","Solid outcome","Exactly what they needed"];
  return (
    <div>
      <div style={{ display:"flex", gap:4, marginBottom:6 }}>
        {[1,2,3,4,5].map(n=>(
          <button key={n} onClick={()=>onChange(n)} onMouseEnter={()=>setHov(n)} onMouseLeave={()=>setHov(0)}
            style={{ background:"none", border:"none", cursor:"pointer", padding:4, fontSize:28, lineHeight:1, transition:"transform 0.1s", transform:(hov||value)>=n?"scale(1.15)":"scale(1)", WebkitTapHighlightColor:"transparent" }}>
            <span style={{ color:(hov||value)>=n?"#F59E0B":theme.border }}>{(hov||value)>=n?"★":"☆"}</span>
          </button>
        ))}
      </div>
      {(hov||value)>0 && <p style={{ margin:0, fontSize:12, color:theme.textMuted, fontFamily:F }}>{labels[hov||value]}</p>}
    </div>
  );
}

function Grid2({ children, w }) {
  return <div style={{ display:"grid", gridTemplateColumns: w>=560?"1fr 1fr":"1fr", gap:14 }}>{children}</div>;
}

// Accordion pickers, failure lists, roadblock & build cards are identical to
// workflow-intake.jsx — they are reproduced here so this component is self-contained.
// (In a real codebase these would be shared component imports from @components/form/)

export function IndustryPicker({ selected, onChange }) {
  const [open, setOpen] = useState(null);
  const { theme } = useTheme();
  const toggle = item => onChange(selected.includes(item)?selected.filter(i=>i!==item):[...selected,item]);
  return (
    <div>
      {selected.length>0 && (
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10, padding:"10px 12px", background:theme.blueLight, border:`1px solid ${theme.blueBorder}`, borderRadius:8 }}>
          <span style={{ fontSize:11, fontWeight:700, color:theme.blue, alignSelf:"center", fontFamily:F, textTransform:"uppercase", letterSpacing:"0.05em" }}>Selected:</span>
          {selected.map(s=><span key={s} onClick={()=>toggle(s)} style={{ fontSize:12, color:theme.blue, background:theme.surface, border:`1px solid ${theme.blueBorder}`, borderRadius:12, padding:"3px 10px", cursor:"pointer", fontFamily:F, fontWeight:500 }}>{s} ×</span>)}
        </div>
      )}
      <div style={{ border:`1px solid ${theme.borderInput}`, borderRadius:12, overflow:"hidden" }}>
        {Object.entries(INDUSTRY_MAP).map(([grp,items],gi,arr)=>{
          const count = items.filter(i=>selected.includes(i)).length;
          const isOpen = open===grp;
          return (
            <div key={grp} style={{ borderBottom:gi<arr.length-1?`1px solid ${theme.borderSubtle}`:"none" }}>
              <button onClick={()=>setOpen(isOpen?null:grp)} style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", padding:"13px 16px", background:isOpen?theme.blueLight:theme.surface, border:"none", cursor:"pointer", minHeight:48 }}>
                <span style={{ fontSize:13, fontWeight:600, color:theme.textSec, fontFamily:F }}>{grp}</span>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  {count>0 && <span style={{ background:theme.blue, color:"#fff", fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:10, fontFamily:F }}>{count}</span>}
                  <span style={{ color:theme.textFaint, fontSize:11 }}>{isOpen?"▲":"▼"}</span>
                </div>
              </button>
              {isOpen && (
                <div style={{ padding:"12px 14px", background:theme.surfaceAlt, borderTop:`1px solid ${theme.borderSubtle}`, display:"flex", flexWrap:"wrap", gap:7 }}>
                  {items.map(item=><Chip key={item} label={item} active={selected.includes(item)} onClick={()=>toggle(item)}/>)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function FrameworkPicker({ selected, onChange }) {
  const [open, setOpen] = useState(null);
  const { theme } = useTheme();
  const toggle = name => onChange(selected.includes(name)?selected.filter(i=>i!==name):[...selected,name]);
  return (
    <div>
      {selected.length>0 && (
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10, padding:"10px 12px", background:theme.blueLight, border:`1px solid ${theme.blueBorder}`, borderRadius:8 }}>
          <span style={{ fontSize:11, fontWeight:700, color:BLUE, alignSelf:"center", fontFamily:F, textTransform:"uppercase", letterSpacing:"0.05em" }}>Selected:</span>
          {selected.map(s=><span key={s} onClick={()=>toggle(s)} style={{ fontSize:12, color:BLUE, background:theme.surface, border:`1px solid ${theme.blueBorder}`, borderRadius:12, padding:"3px 10px", cursor:"pointer", fontFamily:F, fontWeight:500 }}>{s} ×</span>)}
        </div>
      )}
      <div style={{ border:`1px solid ${theme.borderInput}`, borderRadius:12, overflow:"hidden" }}>
        {Object.entries(WORKFLOW_PROCESS_MAP).map(([cat,procs],ci,arr)=>{
          const count = procs.filter(p=>selected.includes(p.name)).length;
          const isOpen = open===cat;
          return (
            <div key={cat} style={{ borderBottom:ci<arr.length-1?`1px solid ${theme.borderSubtle}`:"none" }}>
              <button onClick={()=>setOpen(isOpen?null:cat)} style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", padding:"13px 16px", background:isOpen?theme.blueLight:theme.surface, border:"none", cursor:"pointer", minHeight:48 }}>
                <span style={{ fontSize:13, fontWeight:600, color:theme.textSec, fontFamily:F }}>{cat}</span>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  {count>0 && <span style={{ background:BLUE, color:"#fff", fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:10, fontFamily:F }}>{count}</span>}
                  <span style={{ color:theme.textFaint, fontSize:11 }}>{isOpen?"▲":"▼"}</span>
                </div>
              </button>
              {isOpen && (
                <div style={{ background:theme.surfaceAlt, borderTop:`1px solid ${theme.borderSubtle}`, overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", minWidth:320 }}>
                    <thead>
                      <tr>
                        <th style={{ width:44 }}/>
                        <th style={{ textAlign:"left", padding:"8px 0", fontSize:11, fontWeight:700, color:theme.textFaint, fontFamily:F, textTransform:"uppercase", letterSpacing:"0.06em" }}>Framework</th>
                        <th style={{ textAlign:"left", padding:"8px 16px 8px 0", fontSize:11, fontWeight:700, color:theme.textFaint, fontFamily:F, textTransform:"uppercase", letterSpacing:"0.06em" }}>What it is</th>
                      </tr>
                    </thead>
                    <tbody>
                      {procs.map(p=>(
                        <tr key={p.name} onClick={()=>toggle(p.name)} style={{ cursor:"pointer", background:selected.includes(p.name)?theme.blueLight:theme.surface, borderTop:`1px solid ${theme.borderSubtle}` }}>
                          <td style={{ padding:"11px 16px", textAlign:"center" }}>
                            <div style={{ width:18, height:18, borderRadius:4, border:`2px solid ${selected.includes(p.name)?BLUE:theme.borderInput}`, background:selected.includes(p.name)?BLUE:"transparent", display:"inline-flex", alignItems:"center", justifyContent:"center" }}>
                              {selected.includes(p.name) && <span style={{ color:"#fff", fontSize:11, fontWeight:700 }}>✓</span>}
                            </div>
                          </td>
                          <td style={{ padding:"11px 12px 11px 0", fontSize:13, fontWeight:600, color:selected.includes(p.name)?BLUE:theme.textSec, fontFamily:F, whiteSpace:"nowrap" }}>{p.name}</td>
                          <td style={{ padding:"11px 14px 11px 0", fontSize:12, color:theme.textMuted, fontFamily:F, lineHeight:1.5 }}>{p.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FailureList({ selected, onChange, w }) {
  const { theme } = useTheme();
  const toggle = r => onChange(selected.includes(r)?selected.filter(x=>x!==r):[...selected,r]);
  return (
    <div style={{ display:"grid", gridTemplateColumns:w>=560?"1fr 1fr":"1fr", gap:7 }}>
      {FAILURE_REASONS.map(r=>(
        <button key={r} onClick={()=>toggle(r)} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"11px 13px", background:selected.includes(r)?"#FEF2F2":theme.surface, border:`1.5px solid ${selected.includes(r)?"#EF4444":theme.borderInput}`, borderRadius:10, cursor:"pointer", textAlign:"left", minHeight:44 }}>
          <div style={{ width:17, height:17, borderRadius:4, border:`2px solid ${selected.includes(r)?"#EF4444":theme.borderInput}`, background:selected.includes(r)?"#EF4444":"transparent", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1 }}>
            {selected.includes(r) && <span style={{ color:"#fff", fontSize:9, fontWeight:700 }}>✓</span>}
          </div>
          <span style={{ fontSize:13, color:selected.includes(r)?"#DC2626":theme.textMuted, fontFamily:F, fontWeight:selected.includes(r)?600:400, lineHeight:1.4 }}>{r}</span>
        </button>
      ))}
    </div>
  );
}

const emptyRB = () => ({stage:"",type:"",severity:"",tools:[],description:"",workaroundFound:null,workaround:"",timeCost:"",futureWarning:""});
const emptyBuild = () => ({tool:"",structure:"",failureReasons:[],whatBreaks:"",workaroundsTheyUse:"",howLongBroken:"",whoReported:"",integrationsInPlace:[],impactOnTeam:"",urgency:"Medium"});

function RBCard({ rb, index, onChange, onRemove, w }) {
  const [open, setOpen] = useState(true);
  const { theme } = useTheme();
  const SC={Low:"#10B981",Medium:"#F59E0B",High:"#F97316",Blocker:"#EF4444"};
  return (
    <div style={{ border:"1.5px solid #FED7AA", borderRadius:12, marginBottom:10, overflow:"hidden" }}>
      <button onClick={()=>setOpen(o=>!o)} style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", padding:"13px 16px", background:"#FFFBF5", border:"none", cursor:"pointer", borderBottom:open?"1px solid #FED7AA":"none", minHeight:52 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:13, fontWeight:700, color:"#EA580C", fontFamily:F }}>Roadblock {index+1}</span>
          {rb.stage && <span style={{ fontSize:11, fontWeight:600, color:"#EA580C", background:"#FFF7ED", border:"1px solid #FED7AA", borderRadius:10, padding:"2px 8px", fontFamily:F }}>{rb.stage}</span>}
          {rb.severity && <span style={{ fontSize:11, fontWeight:700, color:SC[rb.severity]||"#9CA3AF", background:(SC[rb.severity]||"#9CA3AF")+"18", borderRadius:10, padding:"2px 8px", fontFamily:F }}>{rb.severity}</span>}
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <button onClick={e=>{e.stopPropagation();onRemove();}} style={{ fontSize:12, color:"#EF4444", background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:7, padding:"5px 11px", cursor:"pointer", fontFamily:F, fontWeight:600 }}>Remove</button>
          <span style={{ color:"#9CA3AF", fontSize:11 }}>{open?"▲":"▼"}</span>
        </div>
      </button>
      {open && (
        <div style={{ padding:"18px 16px", background:theme.surface }}>
          <Field label="Stage">
            <div style={{ display:"flex", gap:6 }}>
              {["Pre-build","During build","Post-build"].map(s=>(
                <button key={s} onClick={()=>onChange({...rb,stage:s})} style={{ flex:1, padding:"8px 4px", borderRadius:8, fontSize:11, fontWeight:600, fontFamily:F, cursor:"pointer", border:rb.stage===s?"1.5px solid #EA580C":"1.5px solid #E5E7EB", background:rb.stage===s?"#FFF7ED":"transparent", color:rb.stage===s?"#EA580C":"#9CA3AF", minHeight:40 }}>{s}</button>
              ))}
            </div>
          </Field>
          <Grid2 w={w}>
            <Field label="Roadblock type"><Sel value={rb.type} onChange={v=>onChange({...rb,type:v})} options={ROADBLOCK_TYPES}/></Field>
            <Field label="Severity"><Sel value={rb.severity} onChange={v=>onChange({...rb,severity:v})} options={SEVERITIES}/></Field>
          </Grid2>
          <Field label="Tools affected"><ChipGroup options={TOOLS} selected={rb.tools} onChange={v=>onChange({...rb,tools:v})} color="#F97316"/></Field>
          <Field label="What happened?"><TI rows={2} value={rb.description} onChange={v=>onChange({...rb,description:v})} placeholder="Describe the limitation or failure…"/></Field>
          <Field label="Workaround found?"><TogGroup options={["Yes","No"]} value={rb.workaroundFound} onChange={v=>onChange({...rb,workaroundFound:v})} color="#059669"/></Field>
          {rb.workaroundFound==="Yes" && <Field label="How did you solve it?" style={{marginTop:14}}><TI rows={2} value={rb.workaround} onChange={v=>onChange({...rb,workaround:v})} placeholder="Describe the workaround…"/></Field>}
          <Grid2 w={w} style={{marginTop:14}}><Field label="Time cost (hours)"><TI value={rb.timeCost} onChange={v=>onChange({...rb,timeCost:v})} placeholder="e.g. 4"/></Field></Grid2>
          <Field label="Warn future users" hint="proactive flag"><TI value={rb.futureWarning} onChange={v=>onChange({...rb,futureWarning:v})} placeholder="What should we flag before someone hits this?"/></Field>
        </div>
      )}
    </div>
  );
}

function BuildCard({ item, index, onChange, onRemove, w }) {
  const [open, setOpen] = useState(true);
  const { theme } = useTheme();
  const UC={Low:"#10B981",Medium:"#F59E0B",High:"#F97316",Critical:"#EF4444"};
  return (
    <div style={{ border:"1.5px solid #FED7AA", borderRadius:12, marginBottom:10, overflow:"hidden" }}>
      <button onClick={()=>setOpen(o=>!o)} style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", padding:"13px 16px", background:"#FFFBF5", border:"none", cursor:"pointer", borderBottom:open?"1px solid #FED7AA":"none", minHeight:52 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:13, fontWeight:700, color:"#EA580C", fontFamily:F }}>Build {index+1}</span>
          {item.tool && <span style={{ fontSize:12, color:theme.textSec, fontFamily:F, fontWeight:500 }}>{item.tool}</span>}
          <span style={{ fontSize:11, fontWeight:700, color:UC[item.urgency]||"#9CA3AF", background:(UC[item.urgency]||"#9CA3AF")+"18", borderRadius:10, padding:"2px 8px", fontFamily:F }}>{item.urgency}</span>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <button onClick={e=>{e.stopPropagation();onRemove();}} style={{ fontSize:12, color:"#EF4444", background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:7, padding:"5px 11px", cursor:"pointer", fontFamily:F, fontWeight:600 }}>Remove</button>
          <span style={{ color:"#9CA3AF", fontSize:11 }}>{open?"▲":"▼"}</span>
        </div>
      </button>
      {open && (
        <div style={{ padding:"18px 16px", background:theme.surface }}>
          <Grid2 w={w}>
            <Field label="Current tool"><Sel value={item.tool} onChange={v=>onChange({...item,tool:v})} options={CURRENT_TOOLS_USED}/></Field>
            <Field label="Fix urgency">
              <div style={{ display:"flex", gap:6 }}>
                {["Low","Medium","High","Critical"].map(u=><button key={u} onClick={()=>onChange({...item,urgency:u})} style={{ flex:1, padding:"8px 4px", borderRadius:8, fontSize:11, fontWeight:600, fontFamily:F, cursor:"pointer", border:item.urgency===u?`1.5px solid ${UC[u]}`:`1.5px solid ${theme.borderInput}`, background:item.urgency===u?UC[u]+"18":theme.surface, color:item.urgency===u?UC[u]:theme.textFaint, minHeight:40 }}>{u}</button>)}
              </div>
            </Field>
          </Grid2>
          <Field label="How is it currently structured?"><TI rows={2} value={item.structure} onChange={v=>onChange({...item,structure:v})} placeholder="e.g. One list per client, statuses: To Do / Done…"/></Field>
          <Field label="Why isn't it working?" hint="select all that apply"><FailureList selected={item.failureReasons} onChange={v=>onChange({...item,failureReasons:v})} w={w}/></Field>
          <Field label="What specifically frustrates the team?"><TI rows={2} value={item.whatBreaks} onChange={v=>onChange({...item,whatBreaks:v})} placeholder="Automations misfiring, team skips updates…"/></Field>
          <Field label="Workarounds they're using" hint="reveals what they actually need"><TI rows={2} value={item.workaroundsTheyUse} onChange={v=>onChange({...item,workaroundsTheyUse:v})} placeholder="Separate spreadsheet, Slack DMs instead of task comments…"/></Field>
          <Grid2 w={w}>
            <Field label="How long broken?"><Sel value={item.howLongBroken} onChange={v=>onChange({...item,howLongBroken:v})} options={["Just noticed","< 1 month","1–3 months","3–6 months","6–12 months","1+ year","Since day one"]}/></Field>
            <Field label="Who flagged this?"><Sel value={item.whoReported} onChange={v=>onChange({...item,whoReported:v})} options={["Client / End User","Team Lead","Manager / Director","Executive","Ops / Admin","IT","Self-identified"]}/></Field>
          </Grid2>
          <Field label="Integrations connected"><ChipGroup options={TOOLS} selected={item.integrationsInPlace} onChange={v=>onChange({...item,integrationsInPlace:v})} color="#F97316"/></Field>
          <Field label="Business impact"><TI rows={2} value={item.impactOnTeam} onChange={v=>onChange({...item,impactOnTeam:v})} placeholder="Billing delays, missed deadlines…"/></Field>
        </div>
      )}
    </div>
  );
}

// ── Step screens ──────────────────────────────────────────────────────────────

function StepAudit({ data, set, w, caseName, setCaseName }) {
  const { theme } = useTheme();
  const add=()=>set({...data,builds:[...data.builds,emptyBuild()]});
  const upd=(i,v)=>set({...data,builds:data.builds.map((b,idx)=>idx===i?v:b)});
  const rem=(i)=>set({...data,builds:data.builds.filter((_,idx)=>idx!==i)});
  return (
    <div>
      <Banner emoji="🔍" title="Before we recommend anything, let's understand what already exists." body="Documenting the current state — and exactly why it's failing — is the most important input for an accurate recommendation." color="#EA580C"/>
      <Card accent="#EA580C">
        <CardTitle sub="Give this project file a short, memorable name">Project name</CardTitle>
        <TI value={caseName} onChange={setCaseName} placeholder="e.g. Company/Client Name"/>
      </Card>
      <Card>
        <CardTitle>Does this client have an existing setup?</CardTitle>
        <TogGroup options={["Yes, they have something","No — starting from scratch"]} value={data.hasExisting} onChange={v=>set({...data,hasExisting:v})} color={BLUE}/>
      </Card>
      {data.hasExisting==="No — starting from scratch" && (
        <div style={{ padding:24, textAlign:"center", background:"#ECFDF5", border:"1px solid #6EE7B7", borderRadius:12 }}>
          <span style={{ fontSize:28 }}>🌱</span>
          <p style={{ margin:"8px 0 0", fontSize:14, color:"#065F46", fontFamily:F, fontWeight:600 }}>Greenfield build — proceed to Scenario.</p>
        </div>
      )}
      {data.hasExisting==="Yes, they have something" && (<>
        <Card>
          <CardTitle sub="High-level summary before diving into specifics">Overall assessment</CardTitle>
          <TI rows={3} value={data.overallAssessment} onChange={v=>set({...data,overallAssessment:v})} placeholder="e.g. They built a ClickUp workspace 18 months ago that was never properly adopted…"/>
        </Card>
        <Card>
          <CardTitle>Have they tried to fix this before?</CardTitle>
          <Field><TogGroup options={["Yes","No"]} value={data.triedToFix} onChange={v=>set({...data,triedToFix:v})} color={BLUE}/></Field>
          {data.triedToFix==="Yes" && <Field label="What did they try, and why didn't it stick?"><TI rows={2} value={data.previousFixes} onChange={v=>set({...data,previousFixes:v})} placeholder="What solution did they attempt?"/></Field>}
        </Card>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, flexWrap:"wrap", gap:10 }}>
          <div>
            <p style={{ margin:0, fontSize:14, fontWeight:700, color:theme.text, fontFamily:F }}>Builds to audit <span style={{ color:theme.textFaint, fontWeight:400 }}>({data.builds.length})</span></p>
            <p style={{ margin:"2px 0 0", fontSize:12, color:theme.textFaint, fontFamily:F }}>One entry per broken tool or workflow area</p>
          </div>
          <button onClick={add} style={{ padding:"11px 18px", background:theme.surface, border:"1.5px solid #EA580C", borderRadius:10, color:"#EA580C", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:F, minHeight:44 }}>+ Add Build</button>
        </div>
        {data.builds.length===0 && <div style={{ padding:32, textAlign:"center", border:`2px dashed ${theme.borderInput}`, borderRadius:12 }}><p style={{ margin:0, fontSize:13, color:theme.textFaint, fontFamily:F }}>Click "Add Build" to document what's broken.</p></div>}
        {data.builds.map((b,i)=><BuildCard key={i} item={b} index={i} onChange={v=>upd(i,v)} onRemove={()=>rem(i)} w={w}/>)}
        {data.builds.length>0 && (
          <Card accent="#EA580C">
            <CardTitle sub="What does the broken state pattern reveal about what they need?">Pattern summary</CardTitle>
            <TI rows={3} value={data.patternSummary} onChange={v=>set({...data,patternSummary:v})} placeholder="Core insight from the audit…"/>
          </Card>
        )}
      </>)}
    </div>
  );
}

function StepIntake({ data, set, w, hideRawPrompt }) {
  return (
    <div>
      {!hideRawPrompt && (
        <Card accent="#7C3AED">
          <CardTitle sub="Paste exactly as the user described — don't clean it up">Raw scenario prompt</CardTitle>
          <TI rows={4} value={data.rawPrompt} onChange={v=>set({...data,rawPrompt:v})} placeholder="e.g. We're a 6-person marketing agency managing 12 clients. We use Slack and HubSpot but nothing talks to each other…"/>
        </Card>
      )}
      <Card>
        <CardTitle>Team basics</CardTitle>
        <Grid2 w={w}>
          <Field label="Team size"><TI value={data.teamSize} onChange={v=>set({...data,teamSize:v})} placeholder="e.g. 6"/></Field>
          <Field label="Primary workflow type"><SelDesc value={data.workflowType} onChange={v=>set({...data,workflowType:v})} options={WORKFLOW_TYPES}/></Field>
        </Grid2>
      </Card>
      <Card>
        <CardTitle sub="Expand a category — multiple allowed">Industry</CardTitle>
        <IndustryPicker selected={data.industries} onChange={v=>set({...data,industries:v})}/>
      </Card>
      <Card>
        <CardTitle sub="Select every framework they reference or need support with">Process frameworks</CardTitle>
        <FrameworkPicker selected={data.processFrameworks} onChange={v=>set({...data,processFrameworks:v})}/>
      </Card>
      <Card>
        <CardTitle>Tools & pain points</CardTitle>
        <Field label="Tools currently in use" hint="select all"><ChipGroup options={TOOLS} selected={data.tools} onChange={v=>set({...data,tools:v})} color={BLUE}/></Field>
        <HR label="pain points"/>
        <Field label="Core pain points"><ChipGroup options={PAIN_POINTS} selected={data.painPoints} onChange={v=>set({...data,painPoints:v})} color="#7C3AED"/></Field>
        <HR/>
        <Field label="What have they already tried that didn't work?" hint="optional"><TI rows={2} value={data.priorAttempts} onChange={v=>set({...data,priorAttempts:v})} placeholder="Previous tools, failed automations…"/></Field>
      </Card>
    </div>
  );
}

const emptyTrigger = () => ({ type:"", detail:"" });
const emptyAction = () => ({ type:"", detail:"" });
const emptyAutomation = () => ({ platform:"clickup", pipelinePhase:"", triggers:[emptyTrigger()], actions:[emptyAction()], instructions:"", use_agent:false });
const emptyList = () => ({ name:"", statuses:"", customFields:"", automations:[] });
const emptyWorkflow = () => ({ name:"", notes:"", pipeline:[], lists:[emptyList()] });

function AutomationCard({ auto, autoIdx, onChange, onRemove, canRemove, onMoveUp, onMoveDown, isFirst, isLast, color, pipelinePhases }) {
  const { theme } = useTheme();
  const updTrigger = (i,k,v) => onChange({ ...auto, triggers: auto.triggers.map((t,idx)=>idx===i?{...t,[k]:v}:t) });
  const addTrigger = () => onChange({ ...auto, triggers:[...auto.triggers, emptyTrigger()] });
  const remTrigger = i => onChange({ ...auto, triggers: auto.triggers.filter((_,idx)=>idx!==i) });
  const updAction = (i,k,v) => onChange({ ...auto, actions: auto.actions.map((a,idx)=>idx===i?{...a,[k]:v}:a) });
  const addAction = () => onChange({ ...auto, actions:[...auto.actions, emptyAction()] });
  const remAction = i => onChange({ ...auto, actions: auto.actions.filter((_,idx)=>idx!==i) });
  const validPhases = (pipelinePhases||[]).filter(p=>p.trim());
  return (
    <div style={{ border:`1px solid ${color}20`, borderLeft:`3px solid ${color}80`, borderRadius:9, padding:"14px 16px", marginBottom:10, background:theme.surface }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:11, fontWeight:700, color, fontFamily:F, textTransform:"uppercase", letterSpacing:"0.06em" }}>Automation {autoIdx+1}</span>
          {auto.pipelinePhase && <span style={{ fontSize:10, fontWeight:700, color, background:color+"12", border:`1px solid ${color}30`, borderRadius:6, padding:"2px 8px", fontFamily:F }}>{auto.pipelinePhase}</span>}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <button type="button" onClick={onMoveUp} disabled={isFirst} style={{ fontSize:13, color:isFirst?theme.borderInput:theme.textMuted, background:"none", border:"none", cursor:isFirst?"default":"pointer", padding:"2px 4px", lineHeight:1 }} title="Move up">▲</button>
          <button type="button" onClick={onMoveDown} disabled={isLast} style={{ fontSize:13, color:isLast?theme.borderInput:theme.textMuted, background:"none", border:"none", cursor:isLast?"default":"pointer", padding:"2px 4px", lineHeight:1 }} title="Move down">▼</button>
          {canRemove && <button type="button" onClick={onRemove} style={{ fontSize:12, color:"#EF4444", background:"none", border:"none", cursor:"pointer", fontFamily:F, marginLeft:4 }}>Remove</button>}
        </div>
      </div>
      {/* Pipeline phase */}
      {validPhases.length > 0 && (
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#6B7280", fontFamily:F, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Pipeline phase <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0 }}>(optional)</span></div>
          <Sel value={auto.pipelinePhase||""} onChange={v=>onChange({...auto,pipelinePhase:v})} options={validPhases} placeholder="— none —"/>
        </div>
      )}
      {/* Platform toggle */}
      <div style={{ display:"flex", gap:0, marginBottom:14, border:`1.5px solid ${theme.borderInput}`, borderRadius:9, overflow:"hidden", width:"fit-content" }}>
        {["clickup","third_party"].map(p=>{
          const active = (auto.platform||"clickup")===p;
          const label = p==="clickup" ? "ClickUp" : "3rd Party";
          return (
            <button key={p} type="button" onClick={()=>onChange({...auto,platform:p})}
              style={{ padding:"6px 16px", fontSize:12, fontWeight:600, fontFamily:F, border:"none", cursor:"pointer", background:active?color:theme.surface, color:active?"#fff":theme.textMuted, transition:"all 0.15s" }}>
              {label}
            </button>
          );
        })}
      </div>
      {/* 3rd party platform picker */}
      {(auto.platform||"clickup")==="third_party" && (
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:11, fontWeight:700, color:theme.textMuted, fontFamily:F, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Platform</div>
          <Sel value={auto.third_party_platform||""} onChange={v=>onChange({...auto,third_party_platform:v})} options={THIRD_PARTY_PLATFORMS} placeholder="Select platform…"/>
        </div>
      )}
      {/* Triggers */}
      <div style={{ marginBottom:12 }}>
        <div style={{ fontSize:11, fontWeight:700, color:theme.textMuted, fontFamily:F, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Triggers</div>
        {auto.triggers.map((t,ti)=>(
          <div key={ti} style={{ display:"flex", gap:8, alignItems:"flex-start", marginBottom:8 }}>
            <div style={{ flex:"0 0 190px" }}><Sel value={t.type} onChange={v=>updTrigger(ti,"type",v)} options={auto.third_party_platform==="HubSpot Workflows" ? HUBSPOT_TRIGGERS : CLICKUP_TRIGGERS} placeholder="Select trigger…"/></div>
            <div style={{ flex:1 }}><TI value={t.detail} onChange={v=>updTrigger(ti,"detail",v)} placeholder="e.g. to Done, from any status…"/></div>
            {auto.triggers.length>1 && <button type="button" onClick={()=>remTrigger(ti)} style={{ fontSize:18, color:"#EF4444", background:"none", border:"none", cursor:"pointer", padding:"8px 4px", fontFamily:F, lineHeight:1 }}>×</button>}
          </div>
        ))}
        <button type="button" onClick={addTrigger} style={{ fontSize:12, color, background:"none", border:`1px dashed ${color}50`, borderRadius:7, padding:"5px 12px", cursor:"pointer", fontFamily:F, marginBottom:4 }}>+ Add trigger</button>
      </div>
      {/* Actions — ClickUp only */}
      {(auto.platform||"clickup")==="clickup" && (
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:11, fontWeight:700, color:theme.textMuted, fontFamily:F, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Actions</div>
          {auto.actions.map((a,ai)=>(
            <div key={ai} style={{ display:"flex", gap:8, alignItems:"flex-start", marginBottom:8 }}>
              <div style={{ flex:"0 0 190px" }}><Sel value={a.type} onChange={v=>updAction(ai,"type",v)} options={CLICKUP_ACTIONS} placeholder="Select action…"/></div>
              <div style={{ flex:1 }}><TI value={a.detail} onChange={v=>updAction(ai,"detail",v)} placeholder="e.g. to team lead, set to High…"/></div>
              {auto.actions.length>1 && <button type="button" onClick={()=>remAction(ai)} style={{ fontSize:18, color:"#EF4444", background:"none", border:"none", cursor:"pointer", padding:"8px 4px", fontFamily:F, lineHeight:1 }}>×</button>}
            </div>
          ))}
          <button type="button" onClick={addAction} style={{ fontSize:12, color, background:"none", border:`1px dashed ${color}50`, borderRadius:7, padding:"5px 12px", cursor:"pointer", fontFamily:F, marginBottom:4 }}>+ Add action</button>
        </div>
      )}
      {/* Instructions / Actions for 3rd party */}
      <div style={{ marginBottom:4 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:11, fontWeight:700, color:theme.textMuted, fontFamily:F, textTransform:"uppercase", letterSpacing:"0.06em" }}>
              {(auto.platform||"clickup")==="clickup" ? "Agent / Automation Instructions" : "Actions / Instructions"}
            </span>
            {auto.use_agent && <span style={{ fontSize:10, fontWeight:700, color:"#7C3AED", background:"#F5F3FF", border:"1px solid #DDD6FE", borderRadius:6, padding:"2px 7px", fontFamily:F, letterSpacing:"0.04em" }}>AGENT ON</span>}
          </div>
          <span style={{ fontSize:11, color:theme.textFaint, fontFamily:F }}>optional</span>
        </div>
        <textarea
          value={auto.instructions}
          onChange={e=>onChange({...auto, instructions:e.target.value, use_agent:e.target.value.trim().length>0})}
          rows={5}
          placeholder={(auto.platform||"clickup")==="clickup"
            ? "# Agent / automation instructions\n# Describe the logic for this automation\n\nIF task.status == 'Done':\n  notify(assignee)\n  move_to_list('Completed')"
            : "# 3rd party automation actions\n# e.g. Make scenario steps, Zapier actions\n\nStep 1: Watch for new ClickUp task\nStep 2: Create record in HubSpot\nStep 3: Send Slack notification"}
          style={{
            width:"100%", boxSizing:"border-box",
            fontFamily:"'Fira Code','Cascadia Code','Consolas',monospace",
            fontSize:13, color:"#FFFFFF", background:"#425eb2",
            border:"1px solid #313244", borderRadius:8,
            padding:"12px 14px", outline:"none", resize:"vertical", lineHeight:1.7,
            caretColor:"#CDD6F4",
          }}
        />
      </div>
    </div>
  );
}

function WorkflowListCard({ list, listIdx, onChange, onRemove, canRemove, color, pipelinePhases }) {
  const upd = (k,v) => onChange({ ...list, [k]: v });
  const autos = list.automations||[];
  const updAuto = (i,v) => upd("automations", autos.map((a,idx)=>idx===i?v:a));
  const addAuto = () => upd("automations", [...autos, emptyAutomation()]);
  const remAuto = i => upd("automations", autos.filter((_,idx)=>idx!==i));
  const moveAuto = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= autos.length) return;
    const next = [...autos];
    [next[i], next[j]] = [next[j], next[i]];
    upd("automations", next);
  };
  return (
    <div style={{ border:`1px solid ${color}30`, borderLeft:`3px solid ${color}`, borderRadius:10, padding:"14px 16px", marginBottom:10, background:`${color}04` }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <span style={{ fontSize:12, fontWeight:700, color, fontFamily:F, textTransform:"uppercase", letterSpacing:"0.06em" }}>List {listIdx+1}</span>
        {canRemove && <button type="button" onClick={onRemove} style={{ fontSize:12, color:"#EF4444", background:"none", border:"none", cursor:"pointer", fontFamily:F }}>Remove list</button>}
      </div>
      <Field label="List name"><TI value={list.name} onChange={v=>upd("name",v)} placeholder="e.g. Active Leads, Proposals, Onboarding"/></Field>
      <Field label="Status flow" hint="e.g. New → Contacted → Qualified → Closed"><TI value={list.statuses} onChange={v=>upd("statuses",v)} placeholder="New → In Progress → Review → Done"/></Field>
      <Field label="Custom fields"><TI rows={3} value={list.customFields} onChange={v=>upd("customFields",v)} placeholder={"Client Name — Text\nDue Date — Date\nPriority — Dropdown (High / Med / Low)"}/></Field>
      <HR label={`automations (${autos.length})`}/>
      {autos.map((auto,ai)=>(
        <AutomationCard key={ai} auto={auto} autoIdx={ai} onChange={v=>updAuto(ai,v)} onRemove={()=>remAuto(ai)} canRemove={autos.length>0} onMoveUp={()=>moveAuto(ai,-1)} onMoveDown={()=>moveAuto(ai,1)} isFirst={ai===0} isLast={ai===autos.length-1} color={color} pipelinePhases={pipelinePhases}/>
      ))}
      <button type="button" onClick={addAuto} style={{ width:"100%", padding:"8px 0", background:"transparent", border:`1.5px dashed ${color}50`, borderRadius:9, color, fontSize:12, fontWeight:600, fontFamily:F, cursor:"pointer", marginTop:4 }}>
        + Add automation
      </button>
    </div>
  );
}

function WorkflowBuildCard({ wf, wfIdx, onChange, onRemove, w }) {
  const { theme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const color = "#0284C7";
  const updList = (i,v) => onChange({ ...wf, lists: wf.lists.map((l,idx)=>idx===i?v:l) });
  const addList = () => onChange({ ...wf, lists: [...wf.lists, emptyList()] });
  const remList = i => onChange({ ...wf, lists: wf.lists.filter((_,idx)=>idx!==i) });
  return (
    <Card accent={color} style={{ marginBottom:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom: collapsed ? 0 : 14 }}>
        <button type="button" onClick={()=>setCollapsed(c=>!c)} style={{ display:"flex", alignItems:"center", gap:10, background:"none", border:"none", cursor:"pointer", padding:0, flex:1, textAlign:"left" }}>
          <span style={{ width:24, height:24, borderRadius:6, background:color, color:"#fff", fontSize:12, fontWeight:700, fontFamily:F, display:"inline-flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{wfIdx+1}</span>
          <span style={{ fontSize:14, fontWeight:700, color:theme.text, fontFamily:F }}>{wf.name||`Workflow ${wfIdx+1}`}</span>
          <span style={{ fontSize:11, color:theme.textFaint, fontFamily:F, marginLeft:4 }}>
            {collapsed ? `${wf.lists.length} list${wf.lists.length!==1?"s":""}` : ""}
          </span>
          <span style={{ fontSize:12, color:theme.textMuted, marginLeft:"auto", paddingRight:8, transition:"transform 0.2s", display:"inline-block", transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)" }}>▾</span>
        </button>
        <button type="button" onClick={onRemove} style={{ fontSize:12, color:"#EF4444", background:"none", border:"none", cursor:"pointer", fontFamily:F, flexShrink:0 }}>Remove workflow</button>
      </div>
      {!collapsed && (
        <>
          <Field label="Workflow name"><TI value={wf.name} onChange={v=>onChange({...wf,name:v})} placeholder="e.g. Sales Space Pipeline, Workspace Workflow"/></Field>
          <Field label="Notes" hint="optional"><TI rows={2} value={wf.notes} onChange={v=>onChange({...wf,notes:v})} placeholder="Edge cases, dependencies, context…"/></Field>
          <HR label={`pipeline phases (${(wf.pipeline||[]).length})`}/>
          <div style={{ marginBottom:8 }}>
            {(wf.pipeline||[]).map((phase,pi)=>(
              <div key={pi} style={{ display:"flex", gap:6, alignItems:"center", marginBottom:6 }}>
                <span style={{ fontSize:11, fontWeight:700, color:"#9CA3AF", fontFamily:F, minWidth:22, textAlign:"right" }}>{pi+1}.</span>
                <div style={{ flex:1 }}><TI value={phase} onChange={v=>onChange({...wf,pipeline:(wf.pipeline||[]).map((p,idx)=>idx===pi?v:p)})} placeholder={`Phase ${pi+1} name…`}/></div>
                <button type="button" onClick={()=>{const n=[...(wf.pipeline||[])];[n[pi],n[pi-1]]=[n[pi-1],n[pi]];onChange({...wf,pipeline:n});}} disabled={pi===0} style={{ fontSize:13, color:pi===0?theme.borderInput:theme.textMuted, background:"none", border:"none", cursor:pi===0?"default":"pointer", padding:"4px 2px" }} title="Move up">▲</button>
                <button type="button" onClick={()=>{const n=[...(wf.pipeline||[])];[n[pi],n[pi+1]]=[n[pi+1],n[pi]];onChange({...wf,pipeline:n});}} disabled={pi===(wf.pipeline||[]).length-1} style={{ fontSize:13, color:pi===(wf.pipeline||[]).length-1?theme.borderInput:theme.textMuted, background:"none", border:"none", cursor:pi===(wf.pipeline||[]).length-1?"default":"pointer", padding:"4px 2px" }} title="Move down">▼</button>
                <button type="button" onClick={()=>onChange({...wf,pipeline:(wf.pipeline||[]).filter((_,idx)=>idx!==pi)})} style={{ fontSize:16, color:"#EF4444", background:"none", border:"none", cursor:"pointer", padding:"4px 2px", lineHeight:1 }}>×</button>
              </div>
            ))}
            {(wf.pipeline||[]).length===0 && <p style={{ margin:"0 0 6px", fontSize:12, color:theme.textFaint, fontFamily:F }}>No pipeline phases yet.</p>}
            <button type="button" onClick={()=>onChange({...wf,pipeline:[...(wf.pipeline||[]),""]}) } style={{ fontSize:12, color, background:"none", border:`1px dashed ${color}50`, borderRadius:7, padding:"5px 12px", cursor:"pointer", fontFamily:F }}>+ Add phase</button>
          </div>
          <HR label={`lists (${wf.lists.length})`}/>
          {wf.lists.map((l,i)=>(
            <WorkflowListCard key={i} list={l} listIdx={i} onChange={v=>updList(i,v)} onRemove={()=>remList(i)} canRemove={wf.lists.length>1} color={color} pipelinePhases={wf.pipeline||[]}/>
          ))}
          <button type="button" onClick={addList} style={{ width:"100%", padding:"9px 0", background:"transparent", border:`1.5px dashed ${color}50`, borderRadius:9, color, fontSize:12, fontWeight:600, fontFamily:F, cursor:"pointer", marginTop:4 }}>
            + Add list to this workflow
          </button>
        </>
      )}
    </Card>
  );
}

function StepBuild({ data, set, w }) {
  const { theme } = useTheme();
  const workflows = data.workflows || [];
  const addWf = () => set({ ...data, workflows: [...workflows, emptyWorkflow()] });
  const updWf = (i,v) => set({ ...data, workflows: workflows.map((wf,idx)=>idx===i?v:wf) });
  const remWf = i => set({ ...data, workflows: workflows.filter((_,idx)=>idx!==i) });
  return (
    <div>
      <Banner emoji="🏗️" title="Map each workflow build in detail." body="Add one workflow per distinct space or flow. Each workflow has its own lists — and each list has its own statuses, custom fields, and automations." color="#0284C7"/>
      {workflows.length === 0 ? (
        <div style={{ padding:"40px 24px", textAlign:"center", background:theme.surface, border:"1.5px dashed #BFDBFE", borderRadius:14, marginBottom:14 }}>
          <p style={{ margin:"0 0 16px", fontSize:14, color:theme.textMuted, fontFamily:F }}>No workflows yet. Add one to start mapping the build.</p>
          <button type="button" onClick={addWf} style={{ padding:"10px 24px", background:"#0284C7", border:"none", borderRadius:10, color:"#fff", fontSize:13, fontWeight:700, fontFamily:F, cursor:"pointer" }}>+ Add first workflow</button>
        </div>
      ) : (
        <>
          {workflows.map((wf,i)=>(
            <WorkflowBuildCard key={i} wf={wf} wfIdx={i} onChange={v=>updWf(i,v)} onRemove={()=>remWf(i)} w={w}/>
          ))}
          <button type="button" onClick={addWf} style={{ width:"100%", padding:"11px 0", background:"transparent", border:"1.5px dashed #BFDBFE", borderRadius:10, color:"#0284C7", fontSize:13, fontWeight:600, fontFamily:F, cursor:"pointer", marginBottom:14 }}>
            + Add another workflow
          </button>
        </>
      )}
      <Card><CardTitle hint="optional">Overall build notes</CardTitle><TI rows={3} value={data.buildNotes} onChange={v=>set({...data,buildNotes:v})} placeholder="General notes that apply across all workflows…"/></Card>
    </div>
  );
}

function StepDelta({ data, set, w }) {
  const { theme } = useTheme();
  const roadblocks = data.roadblocks || [];
  const addRb = () => set({...data, roadblocks:[...roadblocks, emptyRB()]});
  const updRb = (i,v) => set({...data, roadblocks: roadblocks.map((r,idx)=>idx===i?v:r)});
  const remRb = (i) => set({...data, roadblocks: roadblocks.filter((_,idx)=>idx!==i)});
  return (
    <div>
      <Banner emoji="⚖️" title="Where did intent and reality diverge?" body="Capture not just what was built, but the gap between what was asked for and what was achievable." color="#DC2626"/>
      <Card>
        <CardTitle>User's original intent</CardTitle>
        <Field label="What did they want in their own words?"><TI rows={3} value={data.userIntent} onChange={v=>set({...data,userIntent:v})} placeholder="The ideal end-state they described…"/></Field>
        <Field label="How would they know it worked?" hint="success criteria"><TI rows={2} value={data.successCriteria} onChange={v=>set({...data,successCriteria:v})} placeholder="e.g. New project appears within 5 min of HubSpot deal closing…"/></Field>
      </Card>
      <Card>
        <CardTitle>What was actually built</CardTitle>
        <Field label="What did you deliver vs what they asked for?"><TI rows={3} value={data.actualBuild} onChange={v=>set({...data,actualBuild:v})} placeholder="Describe the divergence…"/></Field>
        <Field label="Did the build diverge from intent?"><TogGroup options={["Yes","No"]} value={data.diverged} onChange={v=>set({...data,diverged:v})} color="#DC2626"/></Field>
        {data.diverged==="Yes" && <Field label="What caused the divergence?" style={{marginTop:14}}><TI rows={2} value={data.divergenceReason} onChange={v=>set({...data,divergenceReason:v})} placeholder="Integration limitation? Scope change?"/></Field>}
        <Field label="Compromises accepted" style={{marginTop:14}}><TI rows={2} value={data.compromises} onChange={v=>set({...data,compromises:v})} placeholder="What did they settle for?"/></Field>
      </Card>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, flexWrap:"wrap", gap:10 }}>
        <div>
          <p style={{ margin:0, fontSize:14, fontWeight:700, color:theme.text, fontFamily:F }}>Roadblocks</p>
          <p style={{ margin:"2px 0 0", fontSize:12, color:theme.textFaint, fontFamily:F }}>Log once — tag the stage (pre / during / post-build) so the system knows when it occurred</p>
        </div>
        <button onClick={addRb} style={{ padding:"11px 18px", background:theme.surface, border:"1.5px solid #F97316", borderRadius:10, color:"#F97316", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:F, minHeight:44 }}>+ Add Roadblock</button>
      </div>
      {roadblocks.length===0 && <div style={{ padding:24, textAlign:"center", border:`2px dashed ${theme.borderInput}`, borderRadius:12 }}><p style={{ margin:0, fontSize:13, color:theme.textFaint, fontFamily:F }}>No roadblocks — add one if something broke or was blocked at any stage.</p></div>}
      {roadblocks.map((r,i)=><RBCard key={i} rb={r} index={i} onChange={v=>updRb(i,v)} onRemove={()=>remRb(i)} w={w}/>)}
    </div>
  );
}

function StepReasoning({ data, set, w }) {
  const { theme } = useTheme();
  return (
    <div>
      <Banner emoji="🧠" title="Document the thinking, not just the output." body="The 'why' behind every decision is what makes this system intelligent over time." color="#059669"/>
      <Card>
        <CardTitle>Core decision rationale</CardTitle>
        <Field label="Why this structure?"><TI rows={3} value={data.whyStructure} onChange={v=>set({...data,whyStructure:v})} placeholder="Why this Space/List/Status setup?"/></Field>
        <Field label="Alternatives considered"><TI rows={2} value={data.alternatives} onChange={v=>set({...data,alternatives:v})} placeholder="Other approaches you thought through…"/></Field>
        <Field label="Why were those rejected?"><TI rows={2} value={data.whyRejected} onChange={v=>set({...data,whyRejected:v})} placeholder="What made this approach better?"/></Field>
      </Card>
      <Card>
        <CardTitle>Assumptions & guardrails</CardTitle>
        <Field label="Assumptions made"><TI rows={2} value={data.assumptions} onChange={v=>set({...data,assumptions:v})} placeholder="What did you assume that might not hold elsewhere?"/></Field>
        <Field label="When NOT to use this pattern" hint="critical guardrail"><TI rows={2} value={data.whenOpposite} onChange={v=>set({...data,whenOpposite:v})} placeholder="Under what conditions would this fail?"/></Field>
        <Field label="Key lessons for the next builder"><TI rows={2} value={data.lessons} onChange={v=>set({...data,lessons:v})} placeholder="What would save them time?"/></Field>
      </Card>
      <Card>
        <CardTitle sub="How complex was this build overall?">Complexity rating</CardTitle>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          {[1,2,3,4,5].map(n=>(
            <button key={n} onClick={()=>set({...data,complexity:n})} style={{ width:48, height:48, borderRadius:10, border:`2px solid ${data.complexity>=n?BLUE:theme.borderInput}`, background:data.complexity>=n?theme.blueLight:theme.surface, fontSize:18, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <span style={{ color:data.complexity>=n?BLUE:theme.borderInput }}>◆</span>
            </button>
          ))}
          <span style={{ fontSize:13, color:theme.textMuted, fontFamily:F }}>
            {["","Very simple","Simple","Moderate","Complex","Very complex"][data.complexity]}
          </span>
        </div>
      </Card>
    </div>
  );
}

function StepOutcome({ data, set, w }) {
  return (
    <div>
      <Banner emoji="✅" title="How did it actually land?" body="Collected post-build — ideally 2 weeks after delivery. Honest answers directly improve future recommendations." color="#4F46E5"/>
      <Card>
        <CardTitle>Build outcome</CardTitle>
        <Field label="Did the user build the recommended workflow?"><TogGroup options={["Yes","Partially","No"]} value={data.built} onChange={v=>set({...data,built:v})} color="#4F46E5"/></Field>
        {(data.built==="Partially"||data.built==="No") && <Field label="What blocked them?" style={{marginTop:14}}><TI rows={2} value={data.blockReason} onChange={v=>set({...data,blockReason:v})} placeholder="What stopped them?"/></Field>}
        <Field label="What did they change?" style={{marginTop:14}}><TI rows={2} value={data.changes} onChange={v=>set({...data,changes:v})} placeholder="Specific modifications…"/></Field>
      </Card>
      <Card>
        <CardTitle>What worked and what didn't</CardTitle>
        <Field label="What worked well?"><TI rows={2} value={data.whatWorked} onChange={v=>set({...data,whatWorked:v})} placeholder="Parts that got adopted and made an impact…"/></Field>
        <Field label="What failed or got abandoned?"><TI rows={2} value={data.whatFailed} onChange={v=>set({...data,whatFailed:v})} placeholder="Automations that broke, fields nobody uses…"/></Field>
        <Field label="Revisit when?"><TI value={data.revisitWhen} onChange={v=>set({...data,revisitWhen:v})} placeholder="e.g. When ClickUp's native HubSpot sync matures…"/></Field>
      </Card>
      <Card>
        <CardTitle>Satisfaction & recommendation</CardTitle>
        <Field label="How close was the final result to what they originally wanted?"><Stars value={data.satisfaction} onChange={v=>set({...data,satisfaction:v})}/></Field>
        <HR/>
        <Field label="Would they recommend this pattern to a similar team?"><TogGroup options={["Yes","Maybe","No"]} value={data.recommend} onChange={v=>set({...data,recommend:v})} color="#4F46E5"/></Field>
      </Card>
    </div>
  );
}

// ── Mobile step drawer ────────────────────────────────────────────────────────
function MobileStepDrawer({ step, setStep, cs, open, onClose }) {
  const { theme } = useTheme();
  if (!open) return null;
  return (
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:40 }}/>
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:theme.surface, borderRadius:"18px 18px 0 0", zIndex:50, padding:"12px 0 32px" }}>
        <div style={{ width:36, height:4, background:theme.border, borderRadius:4, margin:"0 auto 16px" }}/>
        <p style={{ margin:"0 0 8px", padding:"0 20px", fontSize:11, fontWeight:700, color:theme.textFaint, fontFamily:F, letterSpacing:"0.08em", textTransform:"uppercase" }}>Jump to step</p>
        {STEPS.map((s,i)=>(
          <button key={s.id} onClick={()=>{setStep(i);onClose();}} style={{ width:"100%", display:"flex", alignItems:"center", gap:14, padding:"14px 20px", background:i===step?s.color+"0D":"transparent", border:"none", cursor:"pointer", borderLeft:i===step?`3px solid ${s.color}`:"3px solid transparent" }}>
            <div style={{ width:28, height:28, borderRadius:"50%", background:i<step?"#059669":i===step?s.color:theme.skeleton, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              {i<step
                ? <span style={{ color:"#fff", fontSize:12, fontWeight:700 }}>✓</span>
                : <span style={{ fontSize:11, fontWeight:700, color:i===step?"#fff":theme.textFaint, fontFamily:F }}>{i+1}</span>}
            </div>
            <div style={{ textAlign:"left" }}>
              <p style={{ margin:0, fontSize:14, fontWeight:i===step?700:500, color:i===step?s.color:theme.textSec, fontFamily:F }}>{s.label}</p>
              <p style={{ margin:0, fontSize:11, color:theme.textFaint, fontFamily:F }}>{STEP_DESC[i].slice(0,48)}…</p>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

// ── Main CaseFileForm ─────────────────────────────────────────────────────────
export default function CaseFileForm({ onSubmit, isSaving, initialData, initialName, initialEnteredBy, isEditing, onCancel, hideRawPrompt }) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState(initialData || DEFAULT_STATE);
  const [enteredBy, setEnteredBy] = useState(initialEnteredBy || "");
  const [caseName, setCaseName] = useState(initialName || "");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const w = useWidth();
  const { theme } = useTheme();

  const isMobile = w < 640;
  const cs = STEPS[step];
  const pct = (step / (STEPS.length - 1)) * 100;
  const px = isMobile ? 16 : 28;

  const setSD = (key, val) => setData(d => ({ ...d, [key]: val }));

  const handleSave = () => onSubmit(data, enteredBy, caseName);

  return (
    <div style={{ background:theme.bg, minHeight:"100vh" }}>

      {/* ── Sub-header (inside app layout) ──────────────────────────────── */}
      <div style={{ position:"sticky", top: isMobile ? 56 : 0, zIndex:20, background:theme.surface, borderBottom:`1px solid ${theme.border}`, boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ maxWidth:820, margin:"0 auto", padding:`0 ${px}px` }}>

          {/* Top row */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", height: isMobile ? 52 : 60 }}>
            <div>
              <p style={{ margin:0, fontSize:11, fontWeight:700, color:theme.textFaint, fontFamily:F, textTransform:"uppercase", letterSpacing:"0.08em" }}>{isEditing ? "Edit project file" : "New case file"}</p>
              <p style={{ margin:0, fontSize:14, fontWeight:700, color:theme.text, fontFamily:F }}>{STEP_TITLES[step]}</p>
            </div>
            {isMobile ? (
              <button onClick={()=>setDrawerOpen(true)} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 12px", background:`${cs.color}10`, border:`1px solid ${cs.color}40`, borderRadius:8, cursor:"pointer" }}>
                <span style={{ fontSize:11, fontWeight:700, color:cs.color, fontFamily:F }}>{step+1}/{STEPS.length}</span>
                <span style={{ fontSize:10, color:cs.color }}>▼</span>
              </button>
            ) : (
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <label style={{ fontSize:12, color:theme.textFaint, fontFamily:F, fontWeight:500 }}>Logged by</label>
                <input value={enteredBy} onChange={e=>setEnteredBy(e.target.value)} placeholder="Your name"
                  style={{ width:160, fontFamily:F, fontSize:13, color:theme.textSec, background:theme.surfaceAlt, border:`1.5px solid ${theme.borderInput}`, borderRadius:9, padding:"8px 12px", outline:"none" }}/>
              </div>
            )}
          </div>

          {/* Step tabs (desktop + tablet) */}
          {!isMobile && (
            <div style={{ display:"flex", gap:0, overflowX:"auto", scrollbarWidth:"none" }}>
              {STEPS.map((s,i)=>(
                <button key={s.id} onClick={()=>setStep(i)} style={{ display:"flex", alignItems:"center", gap:6, padding:"10px 16px", background:"transparent", border:"none", cursor:"pointer", flexShrink:0, borderBottom:i===step?`3px solid ${s.color}`:"3px solid transparent", transition:"all 0.2s" }}>
                  {i<step && <span style={{ width:16, height:16, background:"#059669", borderRadius:"50%", display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:9, color:"#fff", fontWeight:700 }}>✓</span>}
                  <span style={{ fontSize:12, fontWeight:i===step?700:500, color:i===step?s.color:i<step?theme.textFaint:theme.borderInput, fontFamily:F, whiteSpace:"nowrap" }}>{w < 900 ? s.short : s.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Mobile progress dots */}
          {isMobile && (
            <div style={{ display:"flex", gap:5, padding:"10px 0 11px" }}>
              {STEPS.map((_,i)=>(
                <div key={i} onClick={()=>setStep(i)} style={{ flex:i===step?3:1, height:4, borderRadius:4, background:i===step?cs.color:i<step?theme.textFaint:theme.border, cursor:"pointer", transition:"all 0.3s" }}/>
              ))}
            </div>
          )}
        </div>

        {/* Progress bar */}
        {!isMobile && (
          <div style={{ height:3, background:theme.skeleton }}>
            <div style={{ height:"100%", background:cs.color, width:`${pct}%`, transition:"width 0.4s ease" }}/>
          </div>
        )}
      </div>

      {/* Mobile drawer */}
      <MobileStepDrawer step={step} setStep={setStep} cs={cs} open={drawerOpen} onClose={()=>setDrawerOpen(false)}/>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div style={{ maxWidth:820, margin:"0 auto", padding:`24px ${px}px 140px` }}>

        {/* Mobile: logged by */}
        {isMobile && (
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20, background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:12, padding:"10px 14px" }}>
            <span style={{ fontSize:12, color:theme.textFaint, fontFamily:F, fontWeight:500, flexShrink:0 }}>Logged by</span>
            <input value={enteredBy} onChange={e=>setEnteredBy(e.target.value)} placeholder="Your name"
              style={{ flex:1, fontFamily:F, fontSize:14, color:theme.textSec, background:"transparent", border:"none", outline:"none" }}/>
          </div>
        )}

        {step===0 && <StepAudit   data={data.audit}     set={v=>setSD("audit",v)}     w={w} caseName={caseName} setCaseName={setCaseName}/>}
        {step===1 && <StepIntake  data={data.intake}    set={v=>setSD("intake",v)}    w={w} hideRawPrompt={hideRawPrompt}/>}
        {step===2 && <StepBuild   data={data.build}     set={v=>setSD("build",v)}     w={w}/>}
        {step===3 && <StepDelta   data={data.delta}     set={v=>setSD("delta",v)}     w={w}/>}
        {step===4 && <StepReasoning data={data.reasoning} set={v=>setSD("reasoning",v)} w={w}/>}
        {step===5 && <StepOutcome data={data.outcome}   set={v=>setSD("outcome",v)}   w={w}/>}
      </div>

      {/* ── Sticky footer ────────────────────────────────────────────────── */}
      <div style={{ position:"fixed", bottom:0, left:0, right:0, background:theme.surface, borderTop:`1px solid ${theme.border}`, padding:`12px ${isMobile?16:24}px`, boxShadow:"0 -4px 16px rgba(0,0,0,0.06)", zIndex:20 }}>
        <div style={{ maxWidth:820, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          {step === 0 && onCancel ? (
            <button onClick={onCancel}
              style={{ padding:`11px ${isMobile?18:24}px`, border:`1.5px solid ${theme.borderInput}`, borderRadius:10, background:theme.surface, color:theme.textSec, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:F, minHeight:44 }}>
              Cancel
            </button>
          ) : (
            <button onClick={()=>setStep(s=>s-1)} disabled={step===0}
              style={{ padding:`11px ${isMobile?18:24}px`, border:`1.5px solid ${theme.borderInput}`, borderRadius:10, background:theme.surface, color:step===0?theme.borderInput:theme.textSec, fontSize:13, fontWeight:600, cursor:step===0?"not-allowed":"pointer", fontFamily:F, opacity:step===0?0.45:1, minHeight:44 }}>
              ← Back
            </button>
          )}

          {!isMobile && (
            <div style={{ display:"flex", gap:5, alignItems:"center" }}>
              {STEPS.map((_,i)=>(
                <div key={i} onClick={()=>setStep(i)} style={{ width:i===step?20:6, height:6, borderRadius:3, background:i===step?cs.color:i<step?"#D1D5DB":"#E5E7EB", cursor:"pointer", transition:"all 0.3s" }}/>
              ))}
            </div>
          )}

          {step < STEPS.length - 1 ? (
            <button onClick={()=>setStep(s=>s+1)} style={{ padding:`11px ${isMobile?22:28}px`, border:"none", borderRadius:10, background:cs.color, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:F, boxShadow:`0 2px 10px ${cs.color}45`, minHeight:44 }}>
              Continue →
            </button>
          ) : (
            <button onClick={handleSave} disabled={isSaving}
              style={{ padding:`11px ${isMobile?22:28}px`, border:"none", borderRadius:10, background:isSaving?"#6EE7B7":"#059669", color:"#fff", fontSize:13, fontWeight:700, cursor:isSaving?"not-allowed":"pointer", fontFamily:F, boxShadow:"0 2px 10px rgba(5,150,105,0.35)", minHeight:44 }}>
              {isSaving ? "Saving…" : "Save Project File ✓"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
