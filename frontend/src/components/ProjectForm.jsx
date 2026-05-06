/**
 * CaseFileForm.jsx
 *
 * The full 6-step Patternly intake form.
 * Receives onSubmit(formData, enteredBy) and isSaving props.
 * Internally manages all form state; calls onSubmit when user hits "Save Project".
 *
 * This is the same form built in workflow-intake.jsx, refactored as a
 * reusable component that can be used for both Create and Edit flows.
 */
import { useState, useEffect, useRef } from "react";
import { useTheme } from "../hooks/useTheme";
import { useParsePrompt, useMatchTemplates } from "../hooks/useWorkflows";
import { WorkflowMapPanel } from "./WorkflowMapPanel";
import AgentCompilerPanel from "./AgentCompilerPanel";
import { compiledSuggestionToBuildState, formatMinutes } from "../utils/transforms";

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
  "Custom Field Changed","Custom Field Is","Comment Posted","Attachment Added","Tag Added","Tag Removed", "Task Type Is", "Task Name Contains",
  "Checklist Item Completed","Time Estimate Changed","Dependency Resolved","Form Submitted","Recurring Task Due",
];
export const CLICKUP_ACTIONS = [
  "Change Status","Assign To","Unassign From","Set Priority","Set Due Date","Set Start Date",
  "Move to List","Add to List","Create List","Copy Task","Create Subtask","Create Task","Post Comment","Send Email",
  "Add Tag","Remove Tag","Set Custom Field","Start Time Tracking","Stop Time Tracking", "Change Task Type",
  "Apply Template","Archive Task","Send Webhook",
];


const SECTIONS = [
  { id:"projectUpdates", label:"Project Updates",      subtitle:"Timestamped notes and attachments",                                color:"#0284C7", group:"The Updates"  },
  { id:"scopeCreep",     label:"Scope Creep",           subtitle:"Unplanned additions to the build",                                color:"#D97706", group:"The Updates"  },
  { id:"audit",          label:"What's in place now?", subtitle:"Document the client's current setup and what's breaking",          color:"#7C3AED", group:"The Project"   },
  { id:"intake",         label:"Who's the client?",    subtitle:"Capture the scenario, industry, team, and tools",                  color:"#7C3AED", group:"The Project"   },
  { id:"build",          label:"The Build",            subtitle:"Document everything that was built",                               color:"#0284C7", group:"The Build"     },
  { id:"delta",          label:"Intent vs Reality",    subtitle:"Log the gap between what was wanted and what was delivered",       color:"#059668", group:"The Outcome"   },
  { id:"reasoning",      label:"Decision Reasoning",   subtitle:"Record the reasoning behind every major decision",                 color:"#059668", group:"The Outcome"   },
  { id:"outcome",        label:"Outcome",              subtitle:"Capture the post-build result and long-term usage signal",         color:"#059668", group:"The Outcome"   },
];

const DEFAULT_STATE = {
  audit:         {hasExisting:null,overallAssessment:"",builds:[],patternSummary:""},
  intake:        {rawPrompt:"",industries:[],teamSize:"",workflowType:"",processFrameworks:[],tools:[],painPoints:[],priorAttempts:""},
  build:         {buildNotes:"",workflows:[]},
  delta:         {userIntent:"",successCriteria:"",actualBuild:"",diverged:null,divergenceReason:"",compromises:"",scopeCreep:[],roadblocks:[]},
  reasoning:     {whyStructure:"",alternatives:"",whyRejected:"",assumptions:"",whenOpposite:"",lessons:"",complexity:3},
  outcome:       {built:null,blockReason:"",changes:"",whatWorked:"",whatFailed:"",satisfaction:3,recommend:null,revisitWhen:""},
  projectUpdates:[],
};

//  ── Primitive UI components (self-contained, no external deps) ────────────────
const F = "'Plus Jakarta Sans', sans-serif";
const BLUE = "#9B93E8";

function useWidth() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 800);
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return w;
}

function AiBadge() {
  return (
    <span style={{ fontSize:10, fontWeight:700, fontFamily:F, color:"#9B93E8", background:"#9B93E818", border:"1px solid #9B93E830", borderRadius:6, padding:"2px 6px", marginLeft:6, letterSpacing:"0.04em", verticalAlign:"middle" }}>
      AI
    </span>
  );
}

function Lbl({ children, hint, aiBadge }) {
  const { theme } = useTheme();
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:6 }}>
      <span style={{ fontSize:13, fontWeight:600, color:theme.text, fontFamily:F }}>{children}{aiBadge && <AiBadge/>}</span>
      {hint && <span style={{ fontSize:11, color:theme.textFaint, fontFamily:F }}>{hint}</span>}
    </div>
  );
}

function Field({ label, hint, children, style, aiBadge }) {
  return (
    <div style={{ marginBottom:16, ...style }}>
      {label && <Lbl hint={hint} aiBadge={aiBadge}>{label}</Lbl>}
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
  const allOptions = [...options, ...selected.filter(s => !options.includes(s))];
  return (
    <div>
      {selected.length>0 && (
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10, padding:"10px 12px", background:color+"10", border:`1px solid ${color}30`, borderRadius:8 }}>
          <span style={{ fontSize:11, fontWeight:700, color, alignSelf:"center", fontFamily:F, textTransform:"uppercase", letterSpacing:"0.05em" }}>Selected:</span>
          {selected.map(s=><span key={s} onClick={()=>toggle(s)} style={{ fontSize:12, color, background:theme.surface, border:`1px solid ${color}40`, borderRadius:12, padding:"3px 10px", cursor:"pointer", fontFamily:F, fontWeight:500 }}>{s} ×</span>)}
        </div>
      )}
      <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>{allOptions.map(o=><Chip key={o} label={o} active={selected.includes(o)} color={color} onClick={()=>toggle(o)}/>)}</div>
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
    <div style={{ borderTop:`1px solid ${theme.border}`, padding:"18px 0", ...style }}>
      {/* {accent && <div style={{ width:3, height:18, borderRadius:2, background:accent, marginBottom:12 }} />} */}
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
    <div style={{ display:"flex", gap:12, padding:"12px 14px", background:color+"08", borderLeft:`3px solid ${color}`, borderRadius:"0 8px 8px 0", marginBottom:16 }}>
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

function BuildCard({ item, index, onChange, onRemove, w, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  const { theme } = useTheme();
  const UC={Low:"#10B981",Medium:"#F59E0B",High:"#F97316",Critical:"#EF4444"};
  return (
    <div style={{ border:"1.5px solid #FED7AA", borderRadius:12, marginBottom:10, overflow:"hidden" }}>
      <button onClick={()=>setOpen(o=>!o)} style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", padding:"13px 16px", background:"#FFFBF5", border:"none", cursor:"pointer", borderBottom:open?"1px solid #FED7AA":"none", minHeight:52 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:13, fontWeight:700, color:"#EA580C", fontFamily:F }}>Previous Build {index+1}</span>
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

const COMM_COLORS = { Yes:"#059669", Partially:"#D97706", No:"#EF4444" };

function AuditScopeCreepCard({ item, index, onChange, onRemove }) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const cc = COMM_COLORS[item.communicated] || "#9CA3AF";
  return (
    <div style={{ border:"1.5px solid #FDE68A", borderRadius:10, marginBottom:8, overflow:"hidden" }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", background:"#D9770610", border:"none", cursor:"pointer", borderBottom: open ? "1px solid #FDE68A" : "none" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:12, fontWeight:700, color:"#D97706", fontFamily:F }}>Item {index+1}</span>
          {item.area && <span style={{ fontSize:12, color:theme.textSec, fontFamily:F }}>{item.area}</span>}
          {item.communicated && <span style={{ fontSize:10, fontWeight:700, color:cc, background:`${cc}18`, borderRadius:8, padding:"2px 7px", fontFamily:F }}>{item.communicated}</span>}
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <button type="button" onClick={e=>{e.stopPropagation();onRemove();}} style={{ fontSize:12, color:"#EF4444", background:"none", border:"none", cursor:"pointer", fontFamily:F }}>Remove</button>
          <span style={{ fontSize:11, color:theme.textFaint }}>{open ? "▲" : "▼"}</span>
        </div>
      </button>
      {open && (
        <div style={{ padding:"14px 16px", background:theme.surface }}>
          <Field label="What was added?"><TI value={item.area} onChange={v=>onChange({...item,area:v})} placeholder="e.g. Added a second pipeline for enterprise clients"/></Field>
          <Field label="Why was it added?"><TI rows={2} value={item.reason} onChange={v=>onChange({...item,reason:v})} placeholder="Client requested it, discovered dependency…"/></Field>
          <Field label="Impact on timeline / complexity"><TI rows={2} value={item.impact} onChange={v=>onChange({...item,impact:v})} placeholder="Added 2 days, introduced 3 new automations…"/></Field>
          <Field label="Communicated & approved?"><TogGroup options={["Yes","Partially","No"]} value={item.communicated} onChange={v=>onChange({...item,communicated:v})} color="#D97706"/></Field>
        </div>
      )}
    </div>
  );
}

function AuditProjectUpdateCard({ item, onChange, onRemove }) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(!!item._new);
  const dateLabel = item.createdAt
    ? (() => { const [y,m,d] = item.createdAt.slice(0,10).split("-"); return new Date(+y,+m-1,+d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); })()
    : "New update";
  const hoursNum = item.hours === "" || item.hours == null ? 0 : parseInt(item.hours, 10) || 0;
  const minsNum = item.minutes === "" || item.minutes == null ? 0 : parseInt(item.minutes, 10) || 0;
  const durationLabel = formatMinutes(hoursNum * 60 + minsNum);
  return (
    <div style={{ border:"1.5px solid #BAE6FD", borderRadius:10, marginBottom:8, overflow:"hidden" }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", background:"#0284C710", border:"none", cursor:"pointer", borderBottom: open ? "1px solid #BAE6FD" : "none" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:12, fontWeight:700, color:"#0284C7", fontFamily:F }}>{dateLabel}</span>
          {durationLabel && <span style={{ fontSize:10, fontWeight:700, color:"#0284C7", background:"#E0F2FE", border:"1px solid #BAE6FD", borderRadius:8, padding:"2px 7px", fontFamily:F }}>⏱ {durationLabel}</span>}
          {(item.attachments||[]).length > 0 && <span style={{ fontSize:10, fontWeight:700, color:"#0284C7", background:"#E0F2FE", border:"1px solid #BAE6FD", borderRadius:8, padding:"2px 7px", fontFamily:F }}>📎 {item.attachments.length}</span>}
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <button type="button" onClick={e=>{e.stopPropagation();onRemove();}} style={{ fontSize:12, color:"#EF4444", background:"none", border:"none", cursor:"pointer", fontFamily:F }}>Remove</button>
          <span style={{ fontSize:11, color:theme.textFaint }}>{open ? "▲" : "▼"}</span>
        </div>
      </button>
      {open && (
        <div style={{ padding:"14px 16px", background:theme.surface }}>
          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            <Field label="Date">
              <input type="date" value={item.createdAt ? item.createdAt.slice(0,10) : ""}
                onChange={e=>onChange({...item, createdAt: e.target.value || ""})}
                style={{ fontFamily:F, fontSize:13, color:theme.text, border:`1.5px solid ${theme.borderInput}`, borderRadius:9, padding:"9px 12px", outline:"none", background:theme.inputBg }}/>
            </Field>
            <Field label="Hours">
              <input type="number" min="0" step="1" value={item.hours ?? ""}
                onChange={e=>onChange({...item, hours: e.target.value})}
                placeholder="0"
                style={{ fontFamily:F, fontSize:13, color:theme.text, border:`1.5px solid ${theme.borderInput}`, borderRadius:9, padding:"9px 12px", outline:"none", background:theme.inputBg, width:90 }}/>
            </Field>
            <Field label="Minutes">
              <input type="number" min="0" max="59" step="1" value={item.minutes ?? ""}
                onChange={e=>onChange({...item, minutes: e.target.value})}
                placeholder="0"
                style={{ fontFamily:F, fontSize:13, color:theme.text, border:`1.5px solid ${theme.borderInput}`, borderRadius:9, padding:"9px 12px", outline:"none", background:theme.inputBg, width:90 }}/>
            </Field>
          </div>
          <Field label="Update"><TI rows={4} value={item.content} onChange={v=>onChange({...item,content:v})} placeholder="Describe what changed, what was decided, any relevant progress notes…"/></Field>
          <div style={{ marginTop:4 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <span style={{ fontSize:11, fontWeight:700, color:"#6B7280", fontFamily:F, textTransform:"uppercase", letterSpacing:"0.06em" }}>Attachments <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0 }}>(links)</span></span>
              <button type="button" onClick={()=>onChange({...item,attachments:[...(item.attachments||[]),{name:"",url:""}]})} style={{ fontSize:12, color:"#0284C7", background:"none", border:"1px dashed #BAE6FD", borderRadius:6, padding:"4px 10px", cursor:"pointer", fontFamily:F }}>+ Add link</button>
            </div>
            {(item.attachments||[]).map((att,ai)=>(
              <div key={ai} style={{ display:"flex", gap:8, alignItems:"center", marginBottom:6 }}>
                <div style={{ flex:"0 0 130px" }}><TI value={att.name} onChange={v=>onChange({...item,attachments:(item.attachments||[]).map((a,idx)=>idx===ai?{...a,name:v}:a)})} placeholder="Label…"/></div>
                <div style={{ flex:1 }}><TI value={att.url} onChange={v=>onChange({...item,attachments:(item.attachments||[]).map((a,idx)=>idx===ai?{...a,url:v}:a)})} placeholder="https://…"/></div>
                <button type="button" onClick={()=>onChange({...item,attachments:(item.attachments||[]).filter((_,idx)=>idx!==ai)})} style={{ fontSize:18, color:"#EF4444", background:"none", border:"none", cursor:"pointer", padding:"4px", lineHeight:1 }}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StepProjectUpdates({ projectUpdates, onProjectUpdatesChange, isEditing }) {
  const { theme } = useTheme();
  const pu = projectUpdates || [];

  if (!isEditing) {
    return (
      <div style={{ padding:"32px 0", textAlign:"center" }}>
        <p style={{ margin:0, fontSize:14, color:theme.textFaint, fontFamily:F }}>Project updates can be added after the project is saved.</p>
      </div>
    );
  }

  return (
    <Card>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom: pu.length > 0 ? 12 : 0 }}>
        <div>
          <p style={{ margin:0, fontSize:14, fontWeight:700, color:theme.text, fontFamily:F }}>Project Updates</p>
          <p style={{ margin:"2px 0 0", fontSize:12, color:theme.textFaint, fontFamily:F }}>Timestamped notes & attachments</p>
        </div>
        <button type="button" onClick={() => {
          const _key = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
          onProjectUpdatesChange([{content:"",attachments:[],createdAt:new Date().toISOString(),_new:true,_key}, ...pu]);
        }}
          style={{ fontSize:12, fontWeight:600, color:"#0284C7", background:"#E0F2FE", border:"1px solid #BAE6FD", borderRadius:8, padding:"6px 10px", cursor:"pointer", fontFamily:F, flexShrink:0 }}>
          + Add
        </button>
      </div>
      {pu.length === 0
        ? <p style={{ margin:0, fontSize:12, color:theme.textFaint, fontFamily:F }}>No updates yet — click Add to log progress notes.</p>
        : pu.map((item, i) => (
            <AuditProjectUpdateCard key={item.id || item._key || i} item={item}
              onChange={v => { const next=[...pu]; next[i]=v; onProjectUpdatesChange(next); }}
              onRemove={() => onProjectUpdatesChange(pu.filter((_,idx)=>idx!==i))}/>
          ))
      }
    </Card>
  );
}

function StepScopeCreep({ scopeCreep, onScopeCreepChange, isEditing }) {
  const { theme } = useTheme();
  const sc = scopeCreep || [];

  if (!isEditing) {
    return (
      <div style={{ padding:"32px 0", textAlign:"center" }}>
        <p style={{ margin:0, fontSize:14, color:theme.textFaint, fontFamily:F }}>Scope creep can be logged after the project is saved.</p>
      </div>
    );
  }

  return (
    <Card>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom: sc.length > 0 ? 12 : 0 }}>
        <div>
          <p style={{ margin:0, fontSize:14, fontWeight:700, color:theme.text, fontFamily:F }}>Scope Creep</p>
          <p style={{ margin:"2px 0 0", fontSize:12, color:theme.textFaint, fontFamily:F }}>Unplanned additions to the build</p>
        </div>
        <button type="button" onClick={() => onScopeCreepChange([...sc, {area:"",reason:"",impact:"",communicated:null}])}
          style={{ fontSize:12, fontWeight:600, color:"#D97706", background:"#FEF3C7", border:"1px solid #FDE68A", borderRadius:8, padding:"6px 10px", cursor:"pointer", fontFamily:F, flexShrink:0 }}>
          + Add
        </button>
      </div>
      {sc.length === 0
        ? <p style={{ margin:0, fontSize:12, color:theme.textFaint, fontFamily:F }}>No scope creep logged yet.</p>
        : sc.map((item, i) => (
            <AuditScopeCreepCard key={i} item={item} index={i}
              onChange={v => { const next=[...sc]; next[i]=v; onScopeCreepChange(next); }}
              onRemove={() => onScopeCreepChange(sc.filter((_,idx)=>idx!==i))}/>
          ))
      }
    </Card>
  );
}

function StepAudit({ caseName, setCaseName, hideRawPrompt, intakeData, setIntake, deltaData, setDelta, onAiParse, isParsing, parseError, auditData, setAudit, w, isEditing }) {
  const { theme } = useTheme();
  const [promptFocused, setPromptFocused] = useState(false);

  const builds = auditData?.builds || [];
  const hasExisting = auditData?.hasExisting === "Yes, they have something";
  const addBuild = () => setAudit({ ...auditData, builds: [...builds, emptyBuild()] });
  const updBuild = (i,v) => setAudit({ ...auditData, builds: builds.map((b,idx)=>idx===i?v:b) });
  const remBuild = i => setAudit({ ...auditData, builds: builds.filter((_,idx)=>idx!==i) });

  const canParse = !hideRawPrompt && (intakeData?.rawPrompt||"").trim().length > 20 && !!onAiParse;
  const promptVal = intakeData?.rawPrompt || "";
  const promptLower = promptVal.toLowerCase();

  // Real-time checklist — detects what the user has mentioned
  const CHECKLIST = [
    { key: "client",   label: "Who is the client",        hint: "company name, type, or industry",   check: () => promptVal.trim().length > 10 },
    { key: "team",     label: "Team size or structure",    hint: "e.g. '6-person team', 'small team'", check: () => /\d+[\s-]*(person|people|team|member|employee|staff)/i.test(promptVal) || /small|large|growing|solo/i.test(promptVal) },
    { key: "tools",    label: "Tools currently in use",    hint: "e.g. Slack, HubSpot, ClickUp",     check: () => TOOLS.some(t => promptLower.includes(t.toLowerCase())) },
    { key: "pain",     label: "Pain points or problems",   hint: "what's breaking or frustrating",    check: () => /break|fail|frustrat|problem|issue|manual|slow|miss|losing|pain|struggle|chaotic|siloed|disconnect/i.test(promptVal) },
    { key: "goal",     label: "Goal or desired outcome",   hint: "what success looks like",           check: () => /want|need|goal|hope|looking for|success|automat|streamline|centralize|should|ideal|wish|replace/i.test(promptVal) },
    { key: "existing", label: "Existing setup status",     hint: "have a system or starting fresh",   check: () => /existing|current|already|using|set up|setup|in place|no system|from scratch|nothing|greenfield/i.test(promptVal) },
  ];
  const checkedCount = CHECKLIST.filter(c => c.check()).length;

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && canParse) {
      e.preventDefault();
      onAiParse();
    }
  };

  const applyQuickAction = (text) => {
    const next = promptVal ? promptVal.trimEnd() + "\n\n" + text : text;
    setIntake({ ...intakeData, rawPrompt: next });
  };

  return (
    <div>
      <Card accent="#7C3AED">
        <CardTitle sub="Give this project file a short, memorable name">Project name</CardTitle>
        <TI value={caseName} onChange={setCaseName} placeholder="e.g. Company/Client Name"/>
      </Card>

      {!hideRawPrompt && (
        <div style={{ border:`1px solid #9B93E830`, borderRadius:14, padding:0, overflow:"hidden", marginBottom:14 }}>
          {/* AI Assistant header */}
          <div style={{ display:"flex", alignItems:"center", gap:12, padding:"16px 20px", borderBottom:`1px solid #9B93E830` }}>
            <div style={{ width:36, height:36, borderRadius:"50%", background:"#9B93E8", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 2v4M10 14v4M2 10h4M14 10h4M4.93 4.93l2.83 2.83M12.24 12.24l2.83 2.83M15.07 4.93l-2.83 2.83M7.76 12.24l-2.83 2.83"/>
              </svg>
            </div>
            <div>
              <p style={{ margin:0, fontSize:15, fontWeight:700, color:theme.text, fontFamily:F }}>AI Assistant <span style={{ fontSize:10, fontWeight:700, color:"#9B93E8", background:"#9B93E818", border:"1px solid #9B93E830", borderRadius:6, padding:"2px 6px", marginLeft:6, letterSpacing:"0.04em", verticalAlign:"middle" }}>AI</span></p>
              <p style={{ margin:0, fontSize:12, color:theme.textFaint, fontFamily:F }}>Describe the client and their situation — AI will extract all the details</p>
            </div>
          </div>

          {/* Prompt textarea */}
          <div style={{ padding:"16px 20px" }}>
            <textarea
              value={promptVal}
              onChange={e => setIntake({ ...intakeData, rawPrompt: e.target.value })}
              onFocus={() => setPromptFocused(true)}
              onBlur={() => setPromptFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. We're a 12-person marketing agency using ClickUp and HubSpot. Our project handoffs keep falling through the cracks and nothing is automated — we need a system that connects intake to delivery so clients stop slipping through."
              rows={5}
              style={{
                width:"100%", boxSizing:"border-box", fontFamily:F, fontSize:14, color:theme.text,
                background:theme.bg, border:`1.5px solid ${promptFocused ? "#9B93E8" : theme.borderInput}`,
                borderRadius:10, padding:"12px 14px", outline:"none", resize:"vertical", lineHeight:1.6,
                transition:"border-color 0.15s, box-shadow 0.15s",
                boxShadow: promptFocused ? "0 0 0 3px #9B93E818" : "none",
              }}
            />

            {/* Hint + Send button */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:10 }}>
              <span style={{ fontSize:12, color: promptVal.trim().length > 0 ? "#9B93E8" : theme.textFaint, fontFamily:F, fontWeight: promptVal.trim().length > 0 ? 600 : 400 }}>
                {promptVal.trim().length > 0 ? `✦ ${checkedCount}/${CHECKLIST.length} details detected` : "Describe the client's situation, tools, and goals"}
              </span>
              <button type="button" onClick={onAiParse} disabled={!canParse || isParsing}
                style={{
                  display:"flex", alignItems:"center", gap:6, padding:"8px 18px", borderRadius:8,
                  fontSize:13, fontWeight:700, fontFamily:F, border:"none", cursor: canParse && !isParsing ? "pointer" : "not-allowed",
                  background: canParse ? "#9B93E8" : theme.borderInput, color: canParse ? "#fff" : theme.textFaint,
                  opacity: isParsing ? 0.7 : 1, transition:"all 0.15s",
                }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2L7 9M14 2l-5 12-2-5-5-2 12-5z"/>
                </svg>
                {isParsing ? "Parsing…" : "Send"}
              </button>
            </div>
            {parseError && <p style={{ margin:"8px 0 0", fontSize:12, color:"#DC2626", fontFamily:F }}>{parseError}</p>}
          </div>

          {/* Quick actions */}
          <div style={{ padding:"0 20px 16px", display:"flex", flexWrap:"wrap", gap:8, alignItems:"center" }}>
            <span style={{ fontSize:12, fontWeight:600, color:theme.textFaint, fontFamily:F }}>Quick actions:</span>
            {[
              { label: "Client Overview", text: "The client is a [industry] company with [X] team members. They currently use [tools]." },
              { label: "Pain Points", text: "Their main problems are: [describe what's breaking, what's manual, what's frustrating]." },
              { label: "Current Setup", text: "They currently have [tool/system] set up for [purpose], but it's [what's wrong with it]." },
              { label: "Goals", text: "The client wants to [desired outcome]. Success looks like [measurable result]." },
            ].map(qa => (
              <button key={qa.label} type="button" onClick={() => applyQuickAction(qa.text)}
                style={{
                  padding:"5px 12px", borderRadius:8, fontSize:12, fontWeight:500, fontFamily:F,
                  background:"#9B93E808", border:"1px solid #9B93E830", color:theme.textSec,
                  cursor:"pointer", transition:"all 0.12s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#9B93E818"; e.currentTarget.style.borderColor = "#9B93E8"; e.currentTarget.style.color = "#9B93E8"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#9B93E808"; e.currentTarget.style.borderColor = "#9B93E830"; e.currentTarget.style.color = theme.textSec; }}>
                {qa.label}
              </button>
            ))}
          </div>

          {/* Checklist */}
          <div style={{ padding:"14px 20px", borderTop:`1px solid #9B93E830`, background:"#9B93E808" }}>
            <p style={{ margin:"0 0 10px", fontSize:11, fontWeight:700, color:"#9B93E8", fontFamily:F, textTransform:"uppercase", letterSpacing:"0.06em" }}>
              ✦ Information checklist — {checkedCount}/{CHECKLIST.length} detected
            </p>
            <div style={{ display:"grid", gridTemplateColumns: w >= 560 ? "1fr 1fr" : "1fr", gap:"6px 16px" }}>
              {CHECKLIST.map(c => {
                const done = c.check();
                return (
                  <div key={c.key} style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
                    <span style={{
                      width:18, height:18, borderRadius:5, flexShrink:0, marginTop:1,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      border: done ? "2px solid #9B93E8" : `2px solid ${theme.borderInput}`,
                      background: done ? "#9B93E8" : "transparent",
                      fontSize:10, color:"#fff", fontWeight:700, transition:"all 0.2s",
                    }}>
                      {done ? "✓" : ""}
                    </span>
                    <div>
                      <span style={{ fontSize:12, fontWeight: done ? 600 : 500, color: done ? "#9B93E8" : theme.textMuted, fontFamily:F }}>{c.label}</span>
                      {!done && <span style={{ fontSize:11, color:theme.textFaint, fontFamily:F, marginLeft:4 }}>— {c.hint}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Existing setup audit ─────────────────────────────────────────── */}
      <Card>
        <CardTitle>Does this client have an existing setup?</CardTitle>
        <TogGroup options={["Yes, they have something","No — starting from scratch"]} value={auditData?.hasExisting} onChange={v=>setAudit({...auditData,hasExisting:v})} color="#7C3AED"/>
      </Card>
      {auditData?.hasExisting==="No — starting from scratch" && (
        <div style={{ padding:24, textAlign:"center", background:"#ECFDF5", border:"1px solid #6EE7B7", borderRadius:12, marginBottom:14 }}>
          <span style={{ fontSize:28 }}>🌱</span>
          <p style={{ margin:"8px 0 0", fontSize:14, color:"#065F46", fontFamily:F, fontWeight:600 }}>Greenfield build — move to the next step.</p>
        </div>
      )}
      {hasExisting && (<>
        <HR label="previous builds — what was in place"/>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, flexWrap:"wrap", gap:10 }}>
          <div>
            <p style={{ margin:0, fontSize:14, fontWeight:700, color:theme.text, fontFamily:F }}>Previous Builds <span style={{ color:theme.textFaint, fontWeight:400 }}>({builds.length})</span></p>
            <p style={{ margin:"2px 0 0", fontSize:12, color:theme.textFaint, fontFamily:F }}>What the client had before — broken setups, legacy tools, or workflows being replaced</p>
          </div>
          <button onClick={addBuild} style={{ padding:"11px 18px", background:theme.surface, border:"1.5px solid #EA580C", borderRadius:10, color:"#EA580C", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:F, minHeight:44 }}>+ Add Previous Build</button>
        </div>
        {builds.length === 0
          ? <div style={{ padding:32, textAlign:"center", border:`2px dashed ${theme.borderInput}`, borderRadius:12, marginBottom:14 }}><p style={{ margin:0, fontSize:13, color:theme.textFaint, fontFamily:F }}>Click "Add Previous Build" to document what was in place.</p></div>
          : builds.map((b,i) => <BuildCard key={i} item={b} index={i} onChange={v=>updBuild(i,v)} onRemove={()=>remBuild(i)} w={w} defaultOpen={!isEditing}/>)
        }
        {builds.length > 0 && (
          <Card accent="#EA580C">
            <CardTitle sub="What does the broken state pattern reveal about what they need?">Pattern summary</CardTitle>
            <TI rows={3} value={auditData.patternSummary} onChange={v=>setAudit({...auditData,patternSummary:v})} placeholder="Core insight from the audit…"/>
          </Card>
        )}
      </>)}
      {auditData?.hasExisting && (
        <Card accent="#7C3AED">
          <CardTitle sub="Your high-level read on the client's current state">Overall assessment</CardTitle>
          <TI rows={3} value={auditData.overallAssessment||""} onChange={v=>setAudit({...auditData,overallAssessment:v})} placeholder="What's the overall picture? Key risks, strengths, or patterns worth flagging…"/>
        </Card>
      )}
    </div>
  );
}

const GUIDED_QUESTIONS = [
  { key:"g1", q:"Who is the client and what do they do?",   placeholder:"e.g. A 6-person marketing agency managing 12 client campaigns" },
  { key:"g2", q:"What's breaking down right now?",          placeholder:"e.g. Nothing talks to each other — Slack, HubSpot, and spreadsheets are all siloed" },
  { key:"g3", q:"What would success look like for them?",   placeholder:"e.g. One place to see all client status, automations that update without manual entry" },
];

function assembleGuidedPrompt(g1, g2, g3) {
  const parts = [];
  if (g1.trim()) parts.push(g1.trim());
  if (g2.trim()) parts.push(`Current issue: ${g2.trim()}`);
  if (g3.trim()) parts.push(`Success looks like: ${g3.trim()}`);
  return parts.join("\n\n");
}

const AI_FILLABLE_FIELDS = new Set(["teamSize", "workflowType", "industries", "processFrameworks", "tools", "painPoints"]);

function AiInfoTip({ hasAiFields }) {
  const [hovered, setHovered] = useState(false);
  const { theme } = useTheme();
  const color = "#9B93E8";
  const tip = hasAiFields
    ? { title:"AI pre-filled these fields", body:"Review each suggestion below — correct anything that looks off before saving." }
    : { title:"AI can pre-fill these fields", body:"Go back to Current State, fill out the guided form, and click 'Let AI parse this' to auto-fill the highlighted fields below." };
  return (
    <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:12, position:"relative" }}>
      <div style={{ position:"relative", display:"inline-flex" }}
        onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}>
        <button type="button"
          style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"4px 10px", borderRadius:20, border:`1px solid ${color}40`, background: hovered ? `${color}14` : `${color}08`, color, fontFamily:F, fontSize:11, fontWeight:700, cursor:"default", transition:"background 0.15s" }}>
          <span style={{ fontSize:12 }}>✦</span> AI {hasAiFields ? "filled" : "available"}
        </button>
        {hovered && (
          <div style={{ position:"absolute", top:"calc(100% + 8px)", right:0, width:260, background:theme.surface, border:`1px solid ${color}30`, borderRadius:10, padding:"12px 14px", zIndex:30, boxShadow:"0 4px 16px rgba(0,0,0,0.12)", pointerEvents:"none" }}>
            <p style={{ margin:"0 0 4px", fontSize:12, fontWeight:700, color, fontFamily:F }}>{tip.title}</p>
            <p style={{ margin:0, fontSize:12, color:theme.textMuted, fontFamily:F, lineHeight:1.6 }}>{tip.body}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SuggestedBuildsPanel({ builds, onApply }) {
  const { theme } = useTheme();
  const [previewIdx, setPreviewIdx] = useState(null);
  if (!builds?.length) return null;
  const color = "#9B93E8";
  const COMPLEXITY_LABELS = ["", "Very simple", "Simple", "Moderate", "Complex", "Very complex"];
  const preview = previewIdx !== null ? builds[previewIdx] : null;

  return (
    <div style={{ marginBottom:16 }}>
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
        <span style={{ fontSize:12, fontWeight:700, color, fontFamily:F, textTransform:"uppercase", letterSpacing:"0.06em" }}>Suggested builds</span>
        <AiBadge/>
      </div>

      {/* Card list */}
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {builds.map((result, i) => {
          const { template, score, match_reasons } = result;
          const isActive = previewIdx === i;
          const scoreColor = score >= 70 ? { bg:"#ECFDF5", border:"#6EE7B7", text:"#059669" }
            : score >= 40 ? { bg:"#EEEAF8", border:"#C8C2E8", text:"#7B72B8" }
            : { bg:theme.surfaceAlt, border:theme.border, text:theme.textFaint };
          return (
            <button key={i} type="button" onClick={() => setPreviewIdx(isActive ? null : i)}
              style={{ textAlign:"left", background: isActive ? theme.blueLight : theme.surface, border:`1.5px solid ${isActive ? color : theme.borderInput}`, borderRadius:10, padding:"12px 14px", cursor:"pointer", transition:"border-color 0.15s, background 0.15s", width:"100%" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, marginBottom:4 }}>
                <span style={{ fontSize:13, fontWeight:700, color: isActive ? color : theme.text, fontFamily:F }}>{template.name}</span>
                <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
                  <span style={{ fontSize:11, fontWeight:700, padding:"2px 8px", background:scoreColor.bg, border:`1px solid ${scoreColor.border}`, borderRadius:8, color:scoreColor.text, fontFamily:F }}>{score}% match</span>
                  <span style={{ fontSize:11, color:isActive ? color : theme.textFaint, fontFamily:F }}>{isActive ? "▲" : "▼"}</span>
                </div>
              </div>
              <p style={{ margin:"0 0 6px", fontSize:12, color:theme.textMuted, fontFamily:F, lineHeight:1.45 }}>{template.description}</p>
              <div style={{ display:"flex", flexWrap:"wrap", gap:4, alignItems:"center" }}>
                {(match_reasons || []).slice(0, 3).map((r, j) => (
                  <span key={j} style={{ fontSize:11, padding:"1px 7px", borderRadius:6, background:theme.surfaceAlt, border:`1px solid ${theme.border}`, color:theme.textMuted, fontFamily:F }}>{r}</span>
                ))}
                {template.estimated_complexity && (
                  <span style={{ fontSize:11, color:theme.textFaint, fontFamily:F, marginLeft:"auto" }}>
                    {COMPLEXITY_LABELS[template.estimated_complexity] || ""}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Expanded preview */}
      {preview && (() => {
        const { template } = preview;
        return (
          <div style={{ marginTop:10, border:`1.5px solid ${color}40`, borderRadius:12, background:theme.surface, overflow:"hidden" }}>
            <div style={{ padding:"14px 16px", borderBottom:`1px solid ${theme.borderSubtle}`, display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10 }}>
              <div>
                <p style={{ margin:0, fontSize:14, fontWeight:700, color:theme.text, fontFamily:F }}>{template.name}</p>
                {template.description && <p style={{ margin:"3px 0 0", fontSize:12, color:theme.textMuted, fontFamily:F, lineHeight:1.5 }}>{template.description}</p>}
              </div>
              <button type="button" onClick={() => setPreviewIdx(null)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:16, color:theme.textFaint, lineHeight:1, padding:"0 2px", flexShrink:0 }}>×</button>
            </div>
            <div style={{ padding:"14px 16px", display:"flex", flexDirection:"column", gap:12 }}>
              {template.spaces && (
                <div>
                  <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:700, color:theme.textFaint, fontFamily:F, textTransform:"uppercase", letterSpacing:"0.06em" }}>Spaces</p>
                  <p style={{ margin:0, fontSize:13, color:theme.text, fontFamily:F }}>{template.spaces}</p>
                </div>
              )}
              {template.lists && (
                <div>
                  <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:700, color:theme.textFaint, fontFamily:F, textTransform:"uppercase", letterSpacing:"0.06em" }}>Lists</p>
                  <p style={{ margin:0, fontSize:13, color:theme.text, fontFamily:F }}>{template.lists}</p>
                </div>
              )}
              {template.statuses && (
                <div>
                  <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:700, color:theme.textFaint, fontFamily:F, textTransform:"uppercase", letterSpacing:"0.06em" }}>Status flow</p>
                  <p style={{ margin:0, fontSize:13, color:theme.text, fontFamily:F }}>{template.statuses}</p>
                </div>
              )}
              {template.build_notes && (
                <div>
                  <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:700, color:theme.textFaint, fontFamily:F, textTransform:"uppercase", letterSpacing:"0.06em" }}>Build notes</p>
                  <p style={{ margin:0, fontSize:13, color:theme.textSec, fontFamily:F, lineHeight:1.6 }}>{template.build_notes}</p>
                </div>
              )}
            </div>
            <div style={{ padding:"12px 16px", borderTop:`1px solid ${theme.borderSubtle}`, display:"flex", justifyContent:"flex-end" }}>
              <button type="button"
                onClick={() => { onApply(template); setPreviewIdx(null); }}
                style={{ padding:"9px 20px", background:color, border:"none", borderRadius:9, color:"#fff", fontSize:13, fontWeight:700, fontFamily:F, cursor:"pointer" }}>
                Use Template →
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function StepIntake({ data, set, w, hideRawPrompt, aiSuggestedFields = new Set() }) {
  const ai = (field) => aiSuggestedFields.has(field) || (!hideRawPrompt && AI_FILLABLE_FIELDS.has(field));
  const hasAiFields = aiSuggestedFields.size > 0;

  return (
    <div>
      {(!hideRawPrompt || hasAiFields) && <AiInfoTip hasAiFields={hasAiFields}/>}
      <Card>
        <CardTitle>Team basics</CardTitle>
        <Grid2 w={w}>
          <Field label="Team size" aiBadge={ai("teamSize")}><TI value={data.teamSize} onChange={v=>set({...data,teamSize:v})} placeholder="e.g. 6"/></Field>
          <Field label="Primary workflow type" aiBadge={ai("workflowType")}><SelDesc value={data.workflowType} onChange={v=>set({...data,workflowType:v})} options={WORKFLOW_TYPES}/></Field>
        </Grid2>
      </Card>
      <Card>
        <CardTitle sub="Expand a category — multiple allowed">Industry{ai("industries") && <AiBadge/>}</CardTitle>
        <IndustryPicker selected={data.industries} onChange={v=>set({...data,industries:v})}/>
      </Card>
      <Card>
        <CardTitle sub="Select every framework they reference or need support with">Process frameworks{ai("processFrameworks") && <AiBadge/>}</CardTitle>
        <FrameworkPicker selected={data.processFrameworks} onChange={v=>set({...data,processFrameworks:v})}/>
      </Card>
      <Card>
        <CardTitle>Tools & pain points</CardTitle>
        <Field label="Tools currently in use" hint="select all" aiBadge={ai("tools")}><ChipGroup options={TOOLS} selected={data.tools} onChange={v=>set({...data,tools:v})} color={BLUE}/></Field>
        <HR label="pain points"/>
        <Field label="Core pain points" aiBadge={ai("painPoints")}><ChipGroup options={PAIN_POINTS} selected={data.painPoints} onChange={v=>set({...data,painPoints:v})} color="#9B93E8"/></Field>
        <HR/>
        <Field label="What have they already tried that didn't work?" hint="optional"><TI rows={2} value={data.priorAttempts} onChange={v=>set({...data,priorAttempts:v})} placeholder="Previous tools, failed automations…"/></Field>
      </Card>
    </div>
  );
}

const emptyTrigger = () => ({ type:"", detail:"" });
const emptyAction = () => ({ type:"", detail:"" });
const emptyAutomation = () => ({ platform:"clickup", automation_mode:"pipeline", pipelinePhase:"", triggers:[emptyTrigger()], actions:[emptyAction()], automation_prompt:"", instructions:"", map_description:"", use_agent:false });
const emptyList = () => ({ name:"", statuses:"", customFields:"", automations:[] });

function summarizeInstructions(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(l => l && !l.startsWith("#"));
  const first = lines[0] || "";
  return first.length > 80 ? first.slice(0, 80) + "…" : first;
}
const emptyWorkflow = () => ({ name:"", notes:"", pipeline:[], lists:[emptyList()], status:"Mapping", replaces:"", learnings:{ rating:"", whatWorked:"", whatToAvoid:"" } });

function AutomationCard({ auto, autoIdx, onChange, onRemove, canRemove, onMoveUp, onMoveDown, isFirst, isLast, color, pipelinePhases, suggestedAutomations, wfIdx, listIdx }) {
  const { theme } = useTheme();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionQuery, setSuggestionQuery] = useState("");
  const updTrigger = (i,k,v) => onChange({ ...auto, triggers: auto.triggers.map((t,idx)=>idx===i?{...t,[k]:v}:t) });
  const addTrigger = () => onChange({ ...auto, triggers:[...auto.triggers, emptyTrigger()] });
  const remTrigger = i => onChange({ ...auto, triggers: auto.triggers.filter((_,idx)=>idx!==i) });
  const updAction = (i,k,v) => onChange({ ...auto, actions: auto.actions.map((a,idx)=>idx===i?{...a,[k]:v}:a) });
  const addAction = () => onChange({ ...auto, actions:[...auto.actions, emptyAction()] });
  const remAction = i => onChange({ ...auto, actions: auto.actions.filter((_,idx)=>idx!==i) });
  const validPhases = (pipelinePhases||[]).filter(p=>p.trim());
  const hasSuggestions = suggestedAutomations?.length > 0;

  const applySuggestion = (s) => {
    onChange({ ...auto, triggers: s.triggers, actions: s.actions, instructions: s.instructions || "", use_agent: !!(s.instructions?.trim()) });
    setShowSuggestions(false);
  };

  const suggestionLabel = (s) => {
    const t = s.triggers?.[0];
    const a = s.actions?.[0];
    const tLabel = t?.type || t?.detail || "…";
    const aLabel = a?.type || a?.detail || "…";
    return `${tLabel} → ${aLabel}`;
  };

  const focusKey = (typeof wfIdx === "number" && typeof listIdx === "number") ? `${wfIdx}-${listIdx}-${autoIdx}` : undefined;
  return (
    <div data-fp-automation={focusKey} style={{ position:"relative", border:`1px solid ${color}20`, borderLeft:`3px solid ${color}80`, borderRadius:9, padding:"14px 16px", marginBottom:10, background:theme.surface }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:11, fontWeight:700, color, fontFamily:F, textTransform:"uppercase", letterSpacing:"0.06em" }}>Automation {autoIdx+1}</span>
          {auto.pipelinePhase && <span style={{ fontSize:10, fontWeight:700, color, background:color+"12", border:`1px solid ${color}30`, borderRadius:6, padding:"2px 8px", fontFamily:F }}>{auto.pipelinePhase}</span>}
          {hasSuggestions && (
            <button type="button" onClick={() => setShowSuggestions(s => !s)}
              style={{ fontSize:11, fontWeight:600, color: showSuggestions ? "#fff" : color, background: showSuggestions ? color : `${color}12`, border:`1px solid ${color}40`, borderRadius:6, padding:"2px 9px", cursor:"pointer", fontFamily:F, display:"flex", alignItems:"center", gap:4 }}>
              ✨ {showSuggestions ? "Close" : "Flow suggestion"}
            </button>
          )}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <button type="button" onClick={onMoveUp} disabled={isFirst} style={{ fontSize:13, color:isFirst?theme.borderInput:theme.textMuted, background:"none", border:"none", cursor:isFirst?"default":"pointer", padding:"2px 4px", lineHeight:1 }} title="Move up">▲</button>
          <button type="button" onClick={onMoveDown} disabled={isLast} style={{ fontSize:13, color:isLast?theme.borderInput:theme.textMuted, background:"none", border:"none", cursor:isLast?"default":"pointer", padding:"2px 4px", lineHeight:1 }} title="Move down">▼</button>
          {canRemove && <button type="button" onClick={onRemove} style={{ fontSize:12, color:"#EF4444", background:"none", border:"none", cursor:"pointer", fontFamily:F, marginLeft:4 }}>Remove</button>}
        </div>
      </div>

      {/* Suggestion popover — floats to the right of the card */}
      {showSuggestions && (
        <div style={{ position:"absolute", left:"calc(100% + 12px)", top:0, width:280, zIndex:50, border:`1px solid ${color}25`, borderRadius:8, overflow:"hidden", background:theme.surface, boxShadow:"0 4px 20px rgba(0,0,0,0.14)" }}>
          {/* Header */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 10px", background:`${color}08`, borderBottom:`1px solid ${color}20` }}>
            <p style={{ margin:0, fontSize:10, fontWeight:700, color, fontFamily:F, textTransform:"uppercase", letterSpacing:"0.06em" }}>Flow suggestions</p>
            <button type="button" onClick={() => { setShowSuggestions(false); setSuggestionQuery(""); }} style={{ fontSize:16, lineHeight:1, color, background:"none", border:"none", cursor:"pointer", padding:0 }}>×</button>
          </div>
          {/* Search */}
          <div style={{ padding:"7px 10px", borderBottom:`1px solid ${color}15` }}>
            <input
              type="text"
              value={suggestionQuery}
              onChange={e => setSuggestionQuery(e.target.value)}
              placeholder="Search suggestions…"
              autoFocus
              style={{ width:"100%", boxSizing:"border-box", fontSize:12, fontFamily:F, color:theme.text, background:theme.bg, border:`1px solid ${theme.borderInput}`, borderRadius:6, padding:"5px 9px", outline:"none" }}
            />
          </div>
          {/* Grouped scrollable list — ~5 items visible */}
          {(() => {
            const q = suggestionQuery.toLowerCase();
            const filtered = suggestedAutomations.filter(s => {
              if (!q) return true;
              const searchable = [
                ...(s.triggers||[]).map(t => `${t.type} ${t.detail}`),
                ...(s.actions||[]).map(a => `${a.type} ${a.detail}`),
              ].join(" ").toLowerCase();
              return searchable.includes(q);
            });
            const groups = {};
            filtered.forEach(s => {
              const key = s.triggers?.[0]?.type || s.triggers?.[0]?.detail || "Other";
              if (!groups[key]) groups[key] = [];
              groups[key].push(s);
            });
            const groupKeys = Object.keys(groups);
            if (groupKeys.length === 0) {
              return <p style={{ margin:0, padding:"12px 10px", fontSize:12, color:theme.textFaint, fontFamily:F, textAlign:"center" }}>No matches</p>;
            }
            return (
              <div style={{ maxHeight:185, overflowY:"auto" }}>
                {groupKeys.map(key => (
                  <div key={key}>
                    <div style={{ padding:"5px 10px 3px", fontSize:10, fontWeight:700, color, fontFamily:F, textTransform:"uppercase", letterSpacing:"0.06em", background:`${color}06`, borderBottom:`1px solid ${color}12`, position:"sticky", top:0 }}>
                      {key}
                    </div>
                    {groups[key].map((s, i) => (
                      <button key={i} type="button" onClick={() => applySuggestion(s)}
                        style={{ width:"100%", display:"block", textAlign:"left", padding:"7px 10px", fontSize:12, fontFamily:F, color:theme.textSec, background:"none", border:"none", borderBottom:`1px solid ${theme.border}`, cursor:"pointer", lineHeight:1.4 }}
                        onMouseEnter={e => e.currentTarget.style.background = `${color}08`}
                        onMouseLeave={e => e.currentTarget.style.background = "none"}
                      >
                        {suggestionLabel(s)}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Pipeline phase */}
      {validPhases.length > 0 && (
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#6B7280", fontFamily:F, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Pipeline phase <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0 }}>(optional)</span></div>
          <Sel value={auto.pipelinePhase||""} onChange={v=>onChange({...auto,pipelinePhase:v})} options={validPhases} placeholder="— none —"/>
        </div>
      )}
      {/* Pipeline / Standalone mode */}
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:11, fontWeight:700, color:"#6B7280", fontFamily:F, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>Mode</div>
        <div style={{ display:"flex", gap:0, border:`1.5px solid ${theme.borderInput}`, borderRadius:9, overflow:"hidden", width:"fit-content" }}>
          {[["pipeline","↔ Pipeline"],["standalone","⊕ Standalone"]].map(([m, label])=>{
            const active = (auto.automation_mode||"pipeline")===m;
            return (
              <button key={m} type="button" onClick={()=>onChange({...auto,automation_mode:m})}
                style={{ padding:"6px 16px", fontSize:12, fontWeight:600, fontFamily:F, border:"none", cursor:"pointer", background:active?(m==="standalone"?"#D97706":color):theme.surface, color:active?"#fff":theme.textMuted, transition:"all 0.15s" }}>
                {label}
              </button>
            );
          })}
        </div>
      </div>
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
            <span style={{ fontSize:11, fontWeight:700, color:theme.textMuted, fontFamily:F, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:8 }}>
              Agent / Automation Instructions
            </span>
            {auto.use_agent && <span style={{ fontSize:10, fontWeight:700, color:"#7C3AED", background:"#F5F3FF", border:"1px solid #DDD6FE", borderRadius:6, padding:"2px 7px", fontFamily:F, letterSpacing:"0.04em" }}>AGENT ON</span>}
          </div>
          <span style={{ fontSize:11, color:theme.textFaint, fontFamily:F }}>optional</span>
        </div>
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:11, fontWeight:700, color:theme.textMuted, fontFamily:F, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>
            description <span style={{ fontSize:10, fontWeight:400, textTransform:"none", letterSpacing:0, color:theme.textFaint }}>— shown on the workflow map instead of the full instructions</span>
          </div>
          <TI
            value={auto.map_description||""}
            onChange={v=>onChange({...auto, map_description:v})}
            placeholder="e.g. Sends Slack alert and creates HubSpot record"
          />
        </div>
        <div style={{ marginBottom:10 }}>
          <div style={{ fontSize:11, fontWeight:700, color:theme.textMuted, fontFamily:F, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>
            Automation Prompt <span style={{ fontSize:10, fontWeight:400, textTransform:"none", letterSpacing:0, color:theme.textFaint }}>— short prompt that drives this automation</span>
          </div>
          <TI
            rows={3}
            value={auto.automation_prompt||""}
            onChange={v=>onChange({...auto, automation_prompt:v})}
            placeholder="e.g. When a task moves to Done, summarize the work and notify the assignee with next steps."
          />
        </div>
        <div style={{ fontSize:11, fontWeight:700, color:theme.textMuted, fontFamily:F, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:6 }}>
            Instructions
          </div>
        <textarea
          value={auto.instructions}
          onChange={e=>{
            const val = e.target.value;
            const desc = !auto.map_description?.trim() ? summarizeInstructions(val) : auto.map_description;
            onChange({...auto, instructions:val, use_agent:val.trim().length>0, map_description:desc});
          }}
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

function WorkflowListCard({ list, listIdx, onChange, onRemove, canRemove, color, pipelinePhases, suggestedAutomations, wfIdx }) {
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
        <AutomationCard key={ai} auto={auto} autoIdx={ai} onChange={v=>updAuto(ai,v)} onRemove={()=>remAuto(ai)} canRemove={autos.length>0} onMoveUp={()=>moveAuto(ai,-1)} onMoveDown={()=>moveAuto(ai,1)} isFirst={ai===0} isLast={ai===autos.length-1} color={color} pipelinePhases={pipelinePhases} suggestedAutomations={suggestedAutomations} wfIdx={wfIdx} listIdx={listIdx}/>
      ))}
      <button type="button" onClick={addAuto} style={{ width:"100%", padding:"8px 0", background:"transparent", border:`1.5px dashed ${color}50`, borderRadius:9, color, fontSize:12, fontWeight:600, fontFamily:F, cursor:"pointer", marginTop:4 }}>
        + Add automation
      </button>
    </div>
  );
}

const LIFECYCLE_STAGES = ["Mapping","In Review","Client Approved","Live","Archived"];
const LIFECYCLE_COLORS = { "Mapping":"#D97706","In Review":"#7C3AED","Client Approved":"#0284C7","Live":"#059669","Archived":"#6B7280" };

function WorkflowBuildCard({ wf, wfIdx, onChange, onRemove, w, suggestedAutomations, previousBuilds, isMapActive, onToggleMap, defaultCollapsed = false }) {
  const { theme } = useTheme();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const color = "#0284C7";
  const status = wf.status || "Mapping";
  const sc = LIFECYCLE_COLORS[status] || "#D97706";
  const showLearnings = status === "Client Approved" || status === "Live" || status === "Archived";
  const updList = (i,v) => onChange({ ...wf, lists: wf.lists.map((l,idx)=>idx===i?v:l) });
  const addList = () => onChange({ ...wf, lists: [...wf.lists, emptyList()] });
  const remList = i => onChange({ ...wf, lists: wf.lists.filter((_,idx)=>idx!==i) });
  return (
    <Card accent={color} style={{ marginBottom:16 }}>
      <div style={{ display:"flex", alignItems:"center", marginBottom: collapsed ? 0 : 14, gap:8 }}>
        <button type="button" onClick={()=>setCollapsed(c=>!c)} style={{ display:"flex", alignItems:"center", gap:8, background:"none", border:"none", cursor:"pointer", padding:0, flex:1, minWidth:0, textAlign:"left" }}>
          <span style={{ width:24, height:24, borderRadius:6, background:color, color:"#fff", fontSize:12, fontWeight:700, fontFamily:F, display:"inline-flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>{wfIdx+1}</span>
          <span style={{ fontSize:14, fontWeight:700, color:theme.text, fontFamily:F, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{wf.name||`Workflow ${wfIdx+1}`}</span>
          <span style={{ fontSize:16, color:theme.textMuted, transition:"transform 0.2s", display:"inline-block", transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)", flexShrink:0 }}>▾</span>
        </button>
        <select value={status}
          onChange={e => { if (e.target.value === "__remove__") { onRemove(); } else { onChange({...wf, status: e.target.value}); } }}
          onClick={e => e.stopPropagation()}
          style={{ fontFamily:F, fontSize:11, fontWeight:700, color:sc, border:`1.5px solid ${sc}40`, borderRadius:8, padding:"5px 24px 5px 9px", outline:"none", background:`${sc}0D`, cursor:"pointer", appearance:"none", backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%239CA3AF' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`, backgroundRepeat:"no-repeat", backgroundPosition:"right 8px center", flexShrink:0 }}>
          {LIFECYCLE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          <option disabled style={{ color:"#9CA3AF" }}>──────────</option>
          <option value="__remove__" style={{ color:"#EF4444" }}>Remove workflow</option>
        </select>
        <button type="button" onClick={e => { e.stopPropagation(); onToggleMap(); }}
          style={{ fontSize:11, fontWeight:600, fontFamily:F, color: isMapActive ? "#fff" : "#0284C7", background: isMapActive ? "#0284C7" : "#E0F2FE", border:"1px solid #BAE6FD", borderRadius:6, padding:"3px 10px", cursor:"pointer", lineHeight:1.4, flexShrink:0 }}>
          {isMapActive ? "✕ Map" : "Map ↗"}
        </button>
      </div>
      {!collapsed && (
        <>
          <Field label="Workflow name"><TI value={wf.name} onChange={v=>onChange({...wf,name:v})} placeholder="e.g. Sales Space Pipeline, Workspace Workflow"/></Field>
          {previousBuilds && previousBuilds.length > 0 && (
            <Field label="Replaces" hint="optional">
              <Sel value={wf.replaces||""} onChange={v=>onChange({...wf,replaces:v})} options={["— None —", ...previousBuilds.map(b=>b.tool).filter(Boolean)]}/>
            </Field>
          )}
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
            <WorkflowListCard key={i} list={l} listIdx={i} onChange={v=>updList(i,v)} onRemove={()=>remList(i)} canRemove={wf.lists.length>1} color={color} pipelinePhases={wf.pipeline||[]} suggestedAutomations={suggestedAutomations} wfIdx={wfIdx}/>
          ))}
          <button type="button" onClick={addList} style={{ width:"100%", padding:"9px 0", background:"transparent", border:`1.5px dashed ${color}50`, borderRadius:9, color, fontSize:12, fontWeight:600, fontFamily:F, cursor:"pointer", marginTop:4 }}>
            + Add list to this workflow
          </button>

          {/* ── Build Learnings (unlocks at Client Approved / Live / Archived) ── */}
          {showLearnings && (
            <>
              <HR label="build learnings"/>
              <div style={{ background:"#F0FDF4", border:"1px solid #BBF7D0", borderRadius:10, padding:"14px 16px", marginTop:4 }}>
                <p style={{ margin:"0 0 12px", fontSize:12, fontWeight:700, color:"#065F46", fontFamily:F, textTransform:"uppercase", letterSpacing:"0.05em" }}>Build learnings <span style={{ fontSize:11, fontWeight:400, textTransform:"none", letterSpacing:0, color:"#6B7280" }}>— used to train future recommendations</span></p>
                <Field label="Overall rating">
                  <TogGroup options={["Good build","Mixed","Bad build"]} value={wf.learnings?.rating} onChange={v=>onChange({...wf,learnings:{...(wf.learnings||{}),rating:v}})} color="#059669"/>
                </Field>
                <Field label="What worked well?">
                  <TI rows={2} value={wf.learnings?.whatWorked} onChange={v=>onChange({...wf,learnings:{...(wf.learnings||{}),whatWorked:v}})} placeholder="What about this build was effective or reusable?"/>
                </Field>
                <Field label="What would you avoid next time?">
                  <TI rows={2} value={wf.learnings?.whatToAvoid} onChange={v=>onChange({...wf,learnings:{...(wf.learnings||{}),whatToAvoid:v}})} placeholder="Mistakes, misalignments, things that needed rework…"/>
                </Field>
              </div>
            </>
          )}
        </>
      )}
    </Card>
  );
}

function formWfToMapWf(wf) {
  return {
    ...wf,
    lists: (wf.lists || []).map(l => ({
      ...l,
      custom_fields: l.customFields,
      automations: (l.automations || []).map(a => ({
        ...a,
        pipeline_phase: a.pipelinePhase,
        third_party_platform: a.third_party_platform,
        map_description: a.map_description,
      })),
    })),
  };
}

function StepBuild({ data, set, w, suggestedAutomations, auditData, suggestedBuilds = [], intakePrompt = "", isEditing = false, focusPath = null }) {
  const { theme } = useTheme();
  const [mapWfIndex, setMapWfIndex] = useState(null);
  const workflows = data.workflows || [];
  const addWf = () => set({ ...data, workflows: [...workflows, emptyWorkflow()] });
  const updWf = (i,v) => set({ ...data, workflows: workflows.map((wf,idx)=>idx===i?v:wf) });
  const remWf = i => set({ ...data, workflows: workflows.filter((_,idx)=>idx!==i) });

  const builds = auditData?.builds || [];

  const handleApplyTemplate = (template) => {
    const listNames = (template.lists || "").split(",").map(l => l.trim()).filter(Boolean);
    const newLists = listNames.length
      ? listNames.map(name => ({ name, statuses: template.statuses || "", customFields: template.custom_fields || "", automations: [] }))
      : [emptyList()];
    const newWf = {
      name: template.workflow_type || template.name,
      notes: template.build_notes || "",
      pipeline: [],
      lists: newLists,
      status: "Mapping",
      replaces: "",
      learnings: { rating: "", whatWorked: "", whatToAvoid: "" },
    };
    set({ ...data, workflows: [...workflows, newWf] });
  };

  const handleCompilerApply = (suggestion) => {
    const buildState = compiledSuggestionToBuildState(suggestion);
    set({
      ...data,
      buildNotes: [data.buildNotes, buildState.buildNotes].filter(Boolean).join("\n\n"),
      workflows: [...workflows, ...buildState.workflows],
    });
  };

  return (
    <div>
      {/* Agent Compiler — AI-powered build generation */}
      <AgentCompilerPanel
        onApplyBuild={handleCompilerApply}
        existingPrompt={intakePrompt}
      />

      <Banner emoji="🏗️" title="Map what you're building." body="Add each new mapped workflow space by space." color="#0284C7"/>

      {suggestedBuilds.length > 0 && (
        <Card>
          <SuggestedBuildsPanel builds={suggestedBuilds} onApply={handleApplyTemplate}/>
        </Card>
      )}

      {/* ── Mapped workflows ────────────────────────────────────────────────── */}
      <HR label="mapped workflows — what you're building"/>
      {workflows.length === 0 ? (
        <div style={{ padding:"40px 24px", textAlign:"center", background:theme.surface, border:"1.5px dashed #C8C2E8", borderRadius:14, marginBottom:14 }}>
          <p style={{ margin:"0 0 16px", fontSize:14, color:theme.textMuted, fontFamily:F }}>No workflows yet. Add one to start mapping the build.</p>
          <button type="button" onClick={addWf} style={{ padding:"10px 24px", background:"#0284C7", border:"none", borderRadius:10, color:"#fff", fontSize:13, fontWeight:700, fontFamily:F, cursor:"pointer" }}>+ Add first workflow</button>
        </div>
      ) : (<>
        {workflows.map((wf,i) => (
          <WorkflowBuildCard key={i} wf={wf} wfIdx={i} onChange={v=>updWf(i,v)} onRemove={()=>remWf(i)} w={w} suggestedAutomations={suggestedAutomations} previousBuilds={builds} isMapActive={mapWfIndex===i} onToggleMap={()=>setMapWfIndex(mapWfIndex===i?null:i)} defaultCollapsed={isEditing && focusPath?.workflow !== i}/>
        ))}
        <button type="button" onClick={addWf} style={{ width:"100%", padding:"11px 0", background:"transparent", border:"1.5px dashed #C8C2E8", borderRadius:10, color:"#0284C7", fontSize:13, fontWeight:600, fontFamily:F, cursor:"pointer", marginBottom:14 }}>
          + Add another workflow
        </button>
      </>)}
      {mapWfIndex !== null && workflows[mapWfIndex] && (
        <WorkflowMapPanel workflow={formWfToMapWf(workflows[mapWfIndex])} onClose={() => setMapWfIndex(null)} asModal />
      )}
      <Card><CardTitle hint="optional">Overall build notes</CardTitle><TI rows={3} value={data.buildNotes} onChange={v=>set({...data,buildNotes:v})} placeholder="General notes that apply across all workflows…"/></Card>
    </div>
  );
}

function StepDelta({ data, set, w, aiSuggestedFields = new Set() }) {
  const { theme } = useTheme();
  const roadblocks = data.roadblocks || [];
  const addRb = () => set({...data, roadblocks:[...roadblocks, emptyRB()]});
  const updRb = (i,v) => set({...data, roadblocks: roadblocks.map((r,idx)=>idx===i?v:r)});
  const remRb = (i) => set({...data, roadblocks: roadblocks.filter((_,idx)=>idx!==i)});
  return (
    <div>
      <Banner emoji="⚖️" title="Where did intent and reality diverge?" body="Capture not just what was built, but the gap between what was asked for and what was achievable." color="#DC2626"/>
      <Card>
        <CardTitle>User's original intent{aiSuggestedFields.has("userIntent") && <AiBadge/>}</CardTitle>
        <Field label="What did they want in their own words?" aiBadge={aiSuggestedFields.has("userIntent")}><TI rows={3} value={data.userIntent} onChange={v=>set({...data,userIntent:v})} placeholder="The ideal end-state they described…"/></Field>
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


// ── AI Confidence Score ───────────────────────────────────────────────────────
function computeConfidence(data) {
  let score = 0;

  // Current State / Audit — 25 pts
  const assess = (data.audit?.overallAssessment || "").trim();
  if (assess.length > 30) score += 12;
  else if (assess.length > 0) score += 5;
  if (data.audit?.hasExisting !== null && data.audit?.hasExisting !== undefined) score += 5;
  if (data.audit?.builds?.length > 0) score += 8;

  // Scenario / Intake — 30 pts
  if (data.intake?.industries?.length > 0) score += 8;
  if (data.intake?.workflowType) score += 7;
  if (data.intake?.teamSize) score += 5;
  if (data.intake?.tools?.length > 0) score += 5;
  if (data.intake?.painPoints?.length > 0) score += 5;

  // Build — 20 pts
  const workflows = data.build?.workflows || [];
  if (workflows.length > 0 && workflows[0].name) score += 10;
  if (workflows.some(w => w.lists?.some(l => l.statuses || l.customFields))) score += 10;

  // Delta — 10 pts
  if ((data.delta?.userIntent || "").trim()) score += 5;
  if ((data.delta?.successCriteria || "").trim()) score += 5;

  // Reasoning — 10 pts
  if ((data.reasoning?.whyStructure || "").trim()) score += 6;
  if ((data.reasoning?.lessons || "").trim()) score += 4;

  // Outcome — 5 pts
  if (data.outcome?.built !== null && data.outcome?.built !== undefined) score += 3;
  if ((data.outcome?.whatWorked || "").trim()) score += 2;

  const pct = Math.min(100, score);

  // Determine next highest-value action
  let hint;
  if (!data.intake?.workflowType || !data.intake?.industries?.length) {
    hint = `Add scenario details to reach ${Math.min(100, pct + 20)}%`;
  } else if (assess.length < 30) {
    hint = `Describe the current setup to reach ${Math.min(100, pct + 12)}%`;
  } else if (!(workflows.length > 0 && workflows[0].name)) {
    hint = `Add build documentation to reach ${Math.min(100, pct + 20)}%`;
  } else if (!data.delta?.userIntent?.trim()) {
    hint = `Log intent vs reality to reach ${Math.min(100, pct + 10)}%`;
  } else if (!data.reasoning?.whyStructure?.trim()) {
    hint = `Add decision reasoning to reach ${Math.min(100, pct + 10)}%`;
  } else if (data.outcome?.built === null || data.outcome?.built === undefined) {
    hint = `Capture the outcome to reach ${Math.min(100, pct + 5)}%`;
  } else {
    hint = "Case file complete";
  }

  return { score: pct, hint };
}

// ── Main CaseFileForm ─────────────────────────────────────────────────────────
export default function ProjectForm({ onSubmit, isSaving, initialData, initialName, initialEnteredBy, isEditing, onCancel, hideRawPrompt, suggestedAutomations, initialStep, focusPath }) {
  const shouldHidePrompt = hideRawPrompt || isEditing;
  const buildStepIndex = SECTIONS.findIndex(s => s.id === "build");
  const [step, setStep] = useState(
    typeof initialStep === "number"
      ? initialStep
      : (focusPath ? buildStepIndex : (isEditing ? 0 : 2))
  );

  // When a deep-link focusPath is provided, scroll the targeted automation
  // (or list/workflow) into view once after we land on the build step.
  // Only fires once per page load to avoid hijacking subsequent scroll.
  const focusAppliedRef = useRef(false);
  useEffect(() => {
    if (!focusPath || focusAppliedRef.current) return;
    if (SECTIONS[step]?.id !== "build") return;
    const wf = focusPath.workflow;
    const list = focusPath.list;
    const auto = focusPath.automation;
    if (typeof wf !== "number") return;

    // Wait a tick so the build step (and the now-expanded workflow card) renders.
    const t = window.setTimeout(() => {
      let target = null;
      if (typeof list === "number" && typeof auto === "number") {
        target = document.querySelector(`[data-fp-automation="${wf}-${list}-${auto}"]`);
      }
      if (!target) {
        // Fall back to the workflow card header if a more specific target isn't found.
        target = document.querySelectorAll(".fp-page-wrap, main")[0];
      }
      if (target && typeof target.scrollIntoView === "function") {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.style.outline = "2px solid #7C3AED";
        target.style.outlineOffset = "4px";
        window.setTimeout(() => {
          target.style.outline = "";
          target.style.outlineOffset = "";
        }, 1800);
      }
      focusAppliedRef.current = true;
    }, 200);
    return () => window.clearTimeout(t);
  }, [focusPath, step]);
  const [data, setData] = useState(initialData || DEFAULT_STATE);
  const [enteredBy, setEnteredBy] = useState(initialEnteredBy || "");
  const [caseName, setCaseName] = useState(initialName || "");
  const [parseError, setParseError] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [showIntro, setShowIntro] = useState(!isEditing);
  const w = useWidth();
  const { theme } = useTheme();
  const parsePromutMutation = useParsePrompt();
  const matchTemplatesMutation = useMatchTemplates();
  const [suggestedBuilds, setSuggestedBuilds] = useState([]);

  // Compute which intake fields were pre-filled by AI (brief flow only)
  const [aiSuggestedFields, setAiSuggestedFields] = useState(() => {
    if (shouldHidePrompt && initialData?.intake) {
      const fields = new Set();
      const i = initialData.intake;
      if (i.industries?.length) fields.add("industries");
      if (i.teamSize) fields.add("teamSize");
      if (i.workflowType) fields.add("workflowType");
      if (i.tools?.length) fields.add("tools");
      if (i.painPoints?.length) fields.add("painPoints");
      if (i.processFrameworks?.length) fields.add("processFrameworks");
      return fields;
    }
    return new Set();
  });

  const handleAiParse = async () => {
    const prompt = data.intake.rawPrompt.trim();
    if (!prompt) return;
    setParseError(null);
    try {
      const parsed = await parsePromutMutation.mutateAsync(prompt);
      const newFields = new Set();
      const newIntake = { ...data.intake };
      if (parsed.industries?.length) { newIntake.industries = parsed.industries; newFields.add("industries"); }
      if (parsed.team_size) { newIntake.teamSize = parsed.team_size; newFields.add("teamSize"); }
      if (parsed.workflow_type) { newIntake.workflowType = parsed.workflow_type; newFields.add("workflowType"); }
      if (parsed.tools?.length) { newIntake.tools = parsed.tools; newFields.add("tools"); }
      if (parsed.pain_points?.length) { newIntake.painPoints = parsed.pain_points; newFields.add("painPoints"); }
      if (parsed.process_frameworks?.length) {
        const allFrameworkNames = Object.values(WORKFLOW_PROCESS_MAP).flat().map(p => p.name);
        const matched = parsed.process_frameworks.map(aiName => {
          const lower = aiName.toLowerCase();
          return (
            allFrameworkNames.find(f => f.toLowerCase() === lower) ||
            allFrameworkNames.find(f => {
              const fl = f.toLowerCase();
              return fl.includes(lower) || lower.includes(fl.split(/[\s/]+/)[0]);
            }) ||
            null
          );
        }).filter(Boolean);
        const uniqueFrameworks = [...new Set(matched)];
        if (uniqueFrameworks.length) { newIntake.processFrameworks = uniqueFrameworks; newFields.add("processFrameworks"); }
      }

      // Pre-fill the existing setup section from AI inference
      const auditUpdates = {};
      if (parsed.has_existing_setup != null) {
        auditUpdates.hasExisting = parsed.has_existing_setup
          ? "Yes, they have something"
          : "No — starting from scratch";
      }
      if (parsed.has_existing_setup && (parsed.existing_tools?.length || parsed.existing_issues?.length)) {
        // Match AI-detected tool name to the closest option in our known list
        const matchedTool = (parsed.existing_tools || []).reduce((found, aiTool) => {
          if (found) return found;
          const lower = aiTool.toLowerCase();
          return CURRENT_TOOLS_USED.find(opt => opt.toLowerCase().includes(lower) || lower.includes(opt.toLowerCase().split(" ")[0])) || "";
        }, "");
        // Match AI-detected issues to predefined failure reason chips
        const matchedReasons = FAILURE_REASONS.filter(reason =>
          (parsed.existing_issues || []).some(issue =>
            reason.toLowerCase().split(" ").slice(0, 3).some(word => issue.toLowerCase().includes(word))
          )
        );
        // Any issues that didn't map to a chip go into the free-text field
        const unmatchedIssues = (parsed.existing_issues || []).filter(issue =>
          !matchedReasons.some(r => r.toLowerCase().split(" ").some(word => issue.toLowerCase().includes(word)))
        );
        const suggestedBuild = {
          tool: matchedTool,
          structure: "",
          failureReasons: matchedReasons,
          whatBreaks: unmatchedIssues.join("\n"),
          workaroundsTheyUse: "",
          howLongBroken: "",
          whoReported: "",
          integrationsInPlace: [],
          impactOnTeam: "",
          urgency: "Medium",
        };
        auditUpdates.builds = [suggestedBuild];
      }

      setData(d => ({
        ...d,
        intake: newIntake,
        audit: { ...d.audit, ...auditUpdates },
        delta: { ...d.delta, userIntent: d.delta.userIntent || prompt },
      }));
      newFields.add("userIntent");
      setAiSuggestedFields(newFields);

      // Non-critical: also fetch template suggestions for the suggested builds panel
      matchTemplatesMutation.mutateAsync(prompt)
        .then(res => setSuggestedBuilds(res.matches?.slice(0, 3) || []))
        .catch(() => {});
    } catch {
      setParseError("We weren't able to read your prompt right now. Please try again in a moment.");
    }
  };

  const isMobile = w < 640;
  const cs = SECTIONS[step];
  const px = isMobile ? 16 : 24;

  const setSD = (key, val) => setData(d => ({ ...d, [key]: val }));

  const handleSave = () => {
    if (!caseName.trim()) {
      setSaveError("A project name is required before saving.");
      setStep(2);
      return;
    }
    const hasScenario = !!(data.intake?.rawPrompt?.trim());
    const hasWorkflow = !!(data.build?.workflows?.length);
    const hasAuditBuild = !!(data.audit?.builds?.length);
    if (!hasScenario && !hasWorkflow && !hasAuditBuild) {
      setSaveError("Add a scenario, at least one workflow, or a previous build before saving.");
      return;
    }
    setSaveError(null);
    onSubmit(data, enteredBy, caseName);
  };

  const { score: confScore, hint: confHint } = computeConfidence(data);
  const confColor = confScore >= 80 ? "#059669" : confScore >= 50 ? "#7C3AED" : "#D97706";

  const sectionFilled = [
    !!(data.projectUpdates?.length),
    !!(data.delta?.scopeCreep?.length),
    !!(data.audit.overallAssessment || data.audit.builds?.length),
    !!(data.intake.industries.length || data.intake.workflowType),
    !!(data.build.buildNotes || data.build.workflows?.length),
    !!(data.delta.userIntent || data.delta.actualBuild),
    !!(data.reasoning.whyStructure || data.reasoning.lessons),
    !!(data.outcome.built || data.outcome.whatWorked),
  ];

  const visibleSections = isEditing ? SECTIONS : SECTIONS.filter(s => s.group !== "The Updates");


  if (showIntro) return (
    <div style={{ background:theme.bg, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:"40px 20px" }}>
      <div style={{ maxWidth:560, width:"100%" }}>
        <p style={{ margin:"0 0 4px", fontSize:11, fontWeight:700, color:theme.textFaint, fontFamily:F, textTransform:"uppercase", letterSpacing:"0.08em" }}>New project file</p>
        <p style={{ margin:"0 0 8px", fontSize:26, fontWeight:800, color:theme.text, fontFamily:F }}>Document a client build</p>
        <p style={{ margin:"0 0 28px", fontSize:14, color:theme.textSec, fontFamily:F, lineHeight:1.6 }}>This form captures everything about a client engagement — what existed, what was built, and why. Filling it out completely trains the AI to make better recommendations over time.</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:28 }}>
          {[
            { color:"#7C3AED", label:"Current State",    desc:"Existing setup & audit" },
            { color:"#7C3AED", label:"Client Profile",   desc:"Industry, team & tools" },
            { color:"#0284C7", label:"The Build",        desc:"Workflows & what was built" },
            { color:"#059669", label:"Intent vs Reality",desc:"What diverged and why" },
            { color:"#059669", label:"Decision Reasoning",desc:"Why you built it this way" },
            { color:"#059669", label:"Outcome",          desc:"Results and satisfaction" },
          ].map(({ color, label, desc }) => (
            <div key={label} style={{ display:"flex", alignItems:"flex-start", gap:10, background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:10, padding:"10px 12px" }}>
              <span style={{ width:8, height:8, borderRadius:"50%", background:color, flexShrink:0, marginTop:5 }}/>
              <div>
                <p style={{ margin:0, fontSize:12, fontWeight:700, color:theme.text, fontFamily:F }}>{label}</p>
                <p style={{ margin:0, fontSize:11, color:theme.textFaint, fontFamily:F }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <button onClick={() => setShowIntro(false)}
            style={{ padding:"12px 28px", background:"#7C3AED", border:"none", borderRadius:10, color:"#fff", fontSize:14, fontWeight:700, fontFamily:F, cursor:"pointer", boxShadow:"0 2px 10px rgba(124,58,237,0.35)" }}>
            Start documenting →
          </button>
          {onCancel && (
            <button onClick={onCancel}
              style={{ padding:"12px 20px", background:"transparent", border:`1.5px solid ${theme.borderInput}`, borderRadius:10, color:theme.textSec, fontSize:13, fontWeight:600, fontFamily:F, cursor:"pointer" }}>
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ background:theme.bg, height: isMobile ? "calc(100vh - 56px)" : "100vh", display:"flex", flexDirection:"column", overflow:"hidden" }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ flexShrink:0, zIndex:20, background:theme.surface, borderBottom:`1px solid ${theme.border}`, boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ maxWidth:1060, margin:"0 auto", padding:`0 ${px}px` }}>

          {/* Top row */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", height: isMobile ? 52 : 60 }}>
            <div>
              <p style={{ margin:0, fontSize:11, fontWeight:700, color:theme.textFaint, fontFamily:F, textTransform:"uppercase", letterSpacing:"0.08em" }}>{isEditing ? "Edit project" : "New project"}</p>
              <p style={{ margin:0, fontSize:14, fontWeight:700, color:theme.text, fontFamily:F }}>{caseName || "Untitled project"}</p>
            </div>
            <div style={{ textAlign:"right", flexShrink:0, marginLeft:16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:6, justifyContent:"flex-end", marginBottom:3 }}>
                <span style={{ fontSize:11, fontFamily:F, color:theme.textFaint }}>🧠</span>
                <span style={{ fontSize:12, fontWeight:700, fontFamily:F, color:confColor }}>AI Confidence: {confScore}%</span>
              </div>
              <div style={{ width: isMobile ? 100 : 140, height:3, background:theme.skeleton, borderRadius:4, marginBottom:3, marginLeft:"auto" }}>
                <div style={{ height:"100%", width:`${confScore}%`, background:confColor, borderRadius:4, transition:"width 0.4s ease" }}/>
              </div>
              {!isMobile && <p style={{ margin:0, fontSize:10, color:theme.textFaint, fontFamily:F, maxWidth:200 }}>{confHint}</p>}
            </div>
          </div>

          {/* ── Step progress bar (desktop) ────────────────────────────────── */}
          {!isMobile && (
            <div style={{ display:"flex", alignItems:"flex-start", borderTop:`1px solid ${theme.border}`, padding:"12px 0 8px" }}>
              {visibleSections.flatMap((s, idx) => {
                const i = SECTIONS.indexOf(s);
                const filled = sectionFilled[i];
                const active = i === step;
                const isLast = idx === visibleSections.length - 1;
                const items = [
                  <div key={`dot-${s.id}`}
                    onClick={() => setStep(i)}
                    style={{ display:"flex", flexDirection:"column", alignItems:"center", cursor:"pointer", flexShrink:0 }}>
                    <div style={{
                      width:26, height:26, borderRadius:"50%",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      background: filled ? "#059669" : active ? `${s.color}15` : theme.surface,
                      border: filled ? "2px solid #059669" : active ? `2px solid ${s.color}` : `2px solid ${theme.borderInput}`,
                      transition:"all 0.2s",
                    }}>
                      {filled
                        ? <span style={{ color:"#fff", fontSize:11, fontWeight:700, lineHeight:1 }}>✓</span>
                        : <span style={{ color: active ? s.color : theme.textFaint, fontSize:10, fontWeight:700, fontFamily:F, lineHeight:1 }}>{idx+1}</span>}
                    </div>
                    <span style={{
                      marginTop:4, fontSize:12, fontWeight: active ? 700 : 500,
                      color: filled ? "#059669" : active ? s.color : theme.textFaint,
                      fontFamily:F, whiteSpace:"nowrap", textAlign:"center",
                    }}>{s.label}</span>
                  </div>
                ];
                if (!isLast) items.push(
                  <div key={`line-${s.id}`} style={{ flex:1, height:2, marginTop:13, background: filled ? "#059669" : theme.borderInput, transition:"background 0.3s" }} />
                );
                return items;
              })}
            </div>
          )}

          {/* Mobile: progress strip + horizontal scrollable section tabs */}
          {isMobile && (<>
            <div style={{ height:3, background:theme.borderInput, borderTop:`1px solid ${theme.border}` }}>
              <div style={{ height:"100%", width:`${Math.round((visibleSections.filter(s => sectionFilled[SECTIONS.indexOf(s)]).length / visibleSections.length) * 100)}%`, background:"#059669", borderRadius:2, transition:"width 0.4s ease" }} />
            </div>
            <div style={{ display:"flex", gap:0, overflowX:"auto", scrollbarWidth:"none" }}>
              {visibleSections.map((s)=>{
                const i = SECTIONS.indexOf(s);
                return (
                  <button key={s.id} onClick={()=>setStep(i)}
                    style={{ display:"flex", alignItems:"center", gap:4, padding:"10px 12px", background:"transparent", border:"none", cursor:"pointer", flexShrink:0, borderBottom:i===step?`3px solid ${s.color}`:"3px solid transparent", transition:"border-color 0.2s" }}>
                    {sectionFilled[i] && <span style={{ width:12, height:12, background:"#059669", borderRadius:"50%", display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:7, color:"#fff", fontWeight:700, flexShrink:0 }}>✓</span>}
                    <span style={{ fontSize:11, fontWeight:i===step?700:500, color:i===step?s.color:theme.textFaint, fontFamily:F, whiteSpace:"nowrap" }}>{s.label}</span>
                  </button>
                );
              })}
            </div>
          </>)}
        </div>
      </div>

      {/* ── Body: content ──────────────────────────────────────────────── */}
      <div style={{ flex:1, overflow:"hidden", display:"flex" }}>
      <div style={{ maxWidth:900, margin:"0 auto", width:"100%", display:"flex" }}>

        {/* Content area */}
        <div style={{ flex:1, minWidth:0, overflowY:"auto", padding:`24px ${px}px 24px` }}>
          <div style={{ background:theme.surface, border:`1px solid ${theme.border}`, borderRadius:14, padding: isMobile ? "20px 16px" : "28px 28px" }}>

            {/* Section heading */}
            <div style={{ marginBottom:20 }}>
              <p style={{ margin:"0 0 2px", fontSize:11, fontWeight:700, color:theme.textFaint, fontFamily:F, textTransform:"uppercase", letterSpacing:"0.08em" }}>{cs.group}</p>
              <p style={{ margin:"0 0 4px", fontSize:20, fontWeight:700, color:cs.color, fontFamily:F }}>{cs.label}</p>
              <p style={{ margin:0, fontSize:13, color:theme.textFaint, fontFamily:F }}>{cs.subtitle}</p>
            </div>

            {/* ── Section content ──────────────────────────────────────────── */}
            {step===0 && <StepProjectUpdates projectUpdates={data.projectUpdates||[]} onProjectUpdatesChange={v=>setSD("projectUpdates",v)} isEditing={isEditing}/>}
            {step===1 && <StepScopeCreep scopeCreep={data.delta?.scopeCreep||[]} onScopeCreepChange={v=>setData(d=>({...d,delta:{...d.delta,scopeCreep:v}}))} isEditing={isEditing}/>}
            {step===2 && (
              <StepAudit caseName={caseName} setCaseName={setCaseName}
                hideRawPrompt={shouldHidePrompt}
                intakeData={data.intake} setIntake={v=>setSD("intake",v)}
                deltaData={data.delta} setDelta={v=>setSD("delta",v)}
                onAiParse={handleAiParse} isParsing={parsePromutMutation.isPending} parseError={parseError}
                auditData={data.audit} setAudit={v=>setSD("audit",v)} w={w} isEditing={isEditing}/>
            )}
            {step===3 && <StepIntake data={data.intake} set={v=>setSD("intake",v)} w={w} hideRawPrompt={shouldHidePrompt} aiSuggestedFields={aiSuggestedFields}/>}
            {step===4 && <StepBuild data={data.build} set={v=>setSD("build",v)} w={w} suggestedAutomations={suggestedAutomations} auditData={data.audit} suggestedBuilds={suggestedBuilds} intakePrompt={data.intake?.rawPrompt || ""} isEditing={isEditing} focusPath={focusPath}/>}
            {step===5 && <StepDelta data={data.delta} set={v=>setSD("delta",v)} w={w} aiSuggestedFields={aiSuggestedFields}/>}
            {step===6 && <StepReasoning data={data.reasoning} set={v=>setSD("reasoning",v)} w={w}/>}
            {step===7 && <StepOutcome data={data.outcome} set={v=>setSD("outcome",v)} w={w}/>}

          </div>
        </div>
      </div>
      </div>

      {/* ── Sticky footer ────────────────────────────────────────────────── */}
      <div style={{ flexShrink:0, background:theme.surface, borderTop:`1px solid ${theme.border}`, padding:`12px ${isMobile?16:24}px`, boxShadow:"0 -4px 16px rgba(0,0,0,0.06)", zIndex:20 }}>
        <div style={{ maxWidth:1060, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center" }}>

          {/* Left: Cancel or Prev */}
          {(() => {
            const minStep = isEditing ? 0 : 2;
            const atFirst = step === minStep;
            return atFirst && onCancel ? (
              <button onClick={onCancel}
                style={{ padding:`11px ${isMobile?18:24}px`, border:`1.5px solid ${theme.borderInput}`, borderRadius:10, background:theme.surface, color:theme.textSec, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:F, minHeight:44 }}>
                Cancel
              </button>
            ) : (
              <button onClick={()=>setStep(s=>Math.max(minStep,s-1))} disabled={atFirst}
                style={{ padding:`11px ${isMobile?18:24}px`, border:`1.5px solid ${theme.borderInput}`, borderRadius:10, background:theme.surface, color:atFirst?theme.borderInput:theme.textSec, fontSize:13, fontWeight:600, cursor:atFirst?"not-allowed":"pointer", fontFamily:F, opacity:atFirst?0.45:1, minHeight:44 }}>
                ← Back
              </button>
            );
          })()}

          {/* Right: Save + Next (or just Save on last) */}
          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
          {saveError && <p style={{ margin:0, fontSize:12, color:"#DC2626", fontFamily:F, textAlign:"right" }}>{saveError}</p>}
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {(isEditing || step===SECTIONS.length-1) && (
              <button onClick={handleSave} disabled={isSaving}
                style={{ padding:`11px ${isMobile?18:22}px`, border:"none", borderRadius:10, background:isSaving?"#6EE7B7":"#059669", color:"#fff", fontSize:13, fontWeight:700, cursor:isSaving?"not-allowed":"pointer", fontFamily:F, boxShadow:"0 2px 10px rgba(5,150,105,0.35)", minHeight:44 }}>
                {isSaving ? "Saving…" : step===SECTIONS.length-1 ? "Save Project File ✓" : "Save ✓"}
              </button>
            )}
            {step < SECTIONS.length-1 && (
              <button onClick={()=>setStep(s=>s+1)}
                style={{ padding:`11px ${isMobile?22:28}px`, border:"none", borderRadius:10, background:cs.color, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:F, boxShadow:`0 2px 10px ${cs.color}45`, minHeight:44 }}>
                Continue →
              </button>
            )}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
