import { useState, useEffect } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useCaseFile, useDeleteCaseFile, useUpdateCaseFile, useShareCaseFile } from "../../hooks/useCaseFiles";
import { formatDate, satisfactionLabel, formStateToCaseFilePayload, caseFileToFormState } from "../../utils/transforms";
import { ChipGroup, IndustryPicker, FrameworkPicker, TOOLS, PAIN_POINTS, CLICKUP_TRIGGERS, CLICKUP_ACTIONS, THIRD_PARTY_PLATFORMS, CURRENT_TOOLS_USED, FAILURE_REASONS, WORKFLOW_TYPES } from "../../components/CaseFileForm";

const F = "'Plus Jakarta Sans', sans-serif";
const BLUE = "#2563EB";

const STEP_COLORS = {
  audit: "#EA580C",
  intake: "#7C3AED",
  build: "#0284C7",
  delta: "#DC2626",
  reasoning: "#059669",
  outcome: "#4F46E5",
};

function Section({ title, emoji, color, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "14px 18px",
        background: color + "0A",
        borderRadius: "12px 12px 0 0",
        borderTop: `3px solid ${color}`,
        borderLeft: `1px solid ${color}25`,
        borderRight: `1px solid ${color}25`,
      }}>
        <span style={{ fontSize: 18 }}>{emoji}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color, fontFamily: F }}>{title}</span>
      </div>
      <div style={{
        background: "#fff",
        border: `1px solid ${color}20`,
        borderTop: "none",
        borderRadius: "0 0 12px 12px",
        padding: "20px 18px",
      }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, value, fullWidth }) {
  if (!value && value !== 0) return null;
  const displayValue = Array.isArray(value)
    ? value.length === 0 ? null : value.join(", ")
    : value;
  if (!displayValue) return null;
  return (
    <div style={{
      display: fullWidth ? "block" : "grid",
      gridTemplateColumns: "180px 1fr",
      gap: 12,
      padding: "10px 0",
      borderBottom: "1px solid #F9FAFB",
    }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", paddingTop: fullWidth ? 0 : 1 }}>
        {label}
      </span>
      <span style={{ fontSize: 13, color: "#374151", fontFamily: F, lineHeight: 1.6, marginTop: fullWidth ? 6 : 0 }}>
        {typeof displayValue === "boolean"
          ? displayValue ? "Yes" : "No"
          : displayValue}
      </span>
    </div>
  );
}

function TagList({ items, color = BLUE }) {
  if (!items?.length) return <span style={{ fontSize: 13, color: "#9CA3AF", fontFamily: F }}>None</span>;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {items.map(item => (
        <span key={item} style={{
          fontSize: 12, padding: "3px 10px", borderRadius: 12,
          background: color + "12", border: `1px solid ${color}30`,
          color, fontFamily: F, fontWeight: 500,
        }}>{item}</span>
      ))}
    </div>
  );
}

function SatisfactionStars({ score }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ display: "flex", gap: 3 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <span key={n} style={{ fontSize: 20, color: score >= n ? "#F59E0B" : "#E5E7EB" }}>
            {score >= n ? "★" : "☆"}
          </span>
        ))}
      </div>
      <span style={{ fontSize: 13, color: "#6B7280", fontFamily: F }}>
        {satisfactionLabel(score)}
      </span>
    </div>
  );
}

function RoadblockCard({ rb, index }) {
  const sevColors = { low: "#10B981", medium: "#F59E0B", high: "#F97316", blocker: "#EF4444" };
  const sc = sevColors[rb.severity] || "#9CA3AF";
  return (
    <div style={{
      border: `1px solid ${sc}30`,
      borderLeft: `3px solid ${sc}`,
      borderRadius: 10,
      padding: "14px 16px",
      marginBottom: 10,
      background: sc + "05",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#374151", fontFamily: F }}>
          Roadblock {index + 1}
        </span>
        {rb.severity && (
          <span style={{ fontSize: 11, fontWeight: 700, color: sc, background: sc + "18", border: `1px solid ${sc}40`, borderRadius: 10, padding: "2px 8px", fontFamily: F }}>
            {rb.severity.toUpperCase()}
          </span>
        )}
        {rb.type && (
          <span style={{ fontSize: 12, color: "#6B7280", fontFamily: F }}>
            {rb.type.replace(/_/g, " ")}
          </span>
        )}
      </div>
      <Row label="Description " value={rb.description} fullWidth />
      <Row label="Tools affected" value={rb.tools_affected} />
      <Row label="Workaround found" value={rb.workaround_found === true ? "Yes" : rb.workaround_found === false ? "No" : null} />
      <Row label="Workaround " value={rb.workaround_description} fullWidth />
      <Row label="Time cost" value={rb.time_cost_hours ? `${rb.time_cost_hours}h` : null} />
      {rb.future_warning && (
        <div style={{ marginTop: 10, padding: "10px 12px", background: "#FFFBF5", border: "1px solid #FED7AA", borderRadius: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#EA580C", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.05em" }}>⚠️ Future warning: </span>
          <span style={{ fontSize: 13, color: "#92400E", fontFamily: F }}>{rb.future_warning}</span>
        </div>
      )}
    </div>
  );
}

function CurrentBuildCard({ build, index }) {
  const urgColors = { low: "#10B981", medium: "#F59E0B", high: "#F97316", critical: "#EF4444" };
  const uc = urgColors[build.urgency?.toLowerCase()] || "#9CA3AF";
  return (
    <div style={{ border: "1px solid #FED7AA", borderRadius: 10, padding: "14px 16px", marginBottom: 10, background: "#FFFBF5" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#EA580C", fontFamily: F }}>Build {index + 1}</span>
        {build.tool && <span style={{ fontSize: 13, fontWeight: 600, color: "#374151", fontFamily: F }}>{build.tool}</span>}
        {build.urgency && (
          <span style={{ fontSize: 11, fontWeight: 700, color: uc, background: uc + "18", border: `1px solid ${uc}40`, borderRadius: 10, padding: "2px 8px", fontFamily: F }}>
            {build.urgency.toUpperCase()}
          </span>
        )}
      </div>
      <Row label="Structure" value={build.structure} fullWidth />
      {build.failure_reasons?.length > 0 && (
        <div style={{ padding: "10px 0", borderBottom: "1px solid #F9FAFB" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Why it's failing</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {build.failure_reasons.map(r => (
              <span key={r} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 12, background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", fontFamily: F }}>{r}</span>
            ))}
          </div>
        </div>
      )}
      <Row label="What breaks" value={build.what_breaks} fullWidth />
      <Row label="Workarounds" value={build.workarounds_they_use} fullWidth />
      <Row label="How long broken" value={build.how_long_broken} />
      <Row label="Reported by" value={build.who_reported} />
      <Row label="Business impact" value={build.impact_on_team} fullWidth />
    </div>
  );
}

// ── Edit field helpers ────────────────────────────────────────────────────────

function EInput({ value, onChange, placeholder }) {
  const [f, setF] = useState(false);
  const s = { width:"100%", boxSizing:"border-box", fontFamily:F, fontSize:13, color:"#374151", border:`1.5px solid ${f?BLUE:"#E5E7EB"}`, borderRadius:9, padding:"9px 12px", outline:"none", background:"#fff", boxShadow:f?"0 0 0 3px #EFF6FF":"none" };
  return <input value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} onFocus={()=>setF(true)} onBlur={()=>setF(false)} style={s}/>;
}

function ETextarea({ value, onChange, placeholder, rows=3 }) {
  const [f, setF] = useState(false);
  const s = { width:"100%", boxSizing:"border-box", fontFamily:F, fontSize:13, color:"#374151", border:`1.5px solid ${f?BLUE:"#E5E7EB"}`, borderRadius:9, padding:"9px 12px", outline:"none", background:"#fff", resize:"vertical", lineHeight:1.6, boxShadow:f?"0 0 0 3px #EFF6FF":"none" };
  return <textarea value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} onFocus={()=>setF(true)} onBlur={()=>setF(false)} style={s}/>;
}

function ESelect({ value, onChange, options }) {
  const [f, setF] = useState(false);
  const s = { width:"100%", boxSizing:"border-box", fontFamily:F, fontSize:13, color:value?"#374151":"#9CA3AF", border:`1.5px solid ${f?BLUE:"#E5E7EB"}`, borderRadius:9, padding:"9px 12px", outline:"none", background:"#fff", cursor:"pointer", WebkitAppearance:"none", appearance:"none", boxShadow:f?"0 0 0 3px #EFF6FF":"none" };
  return (
    <select value={value||""} onChange={e=>onChange(e.target.value)} onFocus={()=>setF(true)} onBlur={()=>setF(false)} style={s}>
      <option value="">— choose —</option>
      {options.map(o=><option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function EToggle({ value, options, onChange }) {
  return (
    <div style={{ display:"flex", gap:6, flexWrap:"wrap", paddingTop:2 }}>
      {options.map(o=>(
        <button key={o} type="button" onClick={()=>onChange(value===o?null:o)} style={{ padding:"7px 16px", borderRadius:8, border:`1.5px solid ${value===o?BLUE:"#E5E7EB"}`, background:value===o?"#EFF6FF":"#fff", color:value===o?BLUE:"#6B7280", fontSize:12, fontWeight:600, fontFamily:F, cursor:"pointer" }}>
          {o}
        </button>
      ))}
    </div>
  );
}


function EComplexity({ value, onChange }) {
  const labels = ["","Very simple","Simple","Moderate","Complex","Very complex"];
  return (
    <div style={{ display:"flex", gap:6, alignItems:"center", paddingTop:2 }}>
      {[1,2,3,4,5].map(n=>(
        <button key={n} type="button" onClick={()=>onChange(n)} style={{ width:32, height:32, borderRadius:8, border:`2px solid ${value>=n?BLUE:"#E5E7EB"}`, background:value>=n?"#EFF6FF":"#fff", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ color:value>=n?BLUE:"#D1D5DB", fontSize:12 }}>◆</span>
        </button>
      ))}
      <span style={{ fontSize:13, color:"#6B7280", fontFamily:F, paddingLeft:4 }}>{labels[value]||""}</span>
    </div>
  );
}

function ESatisfaction({ value, onChange }) {
  return (
    <div style={{ display:"flex", gap:4 }}>
      {[1,2,3,4,5].map(n=>(
        <button key={n} type="button" onClick={()=>onChange(n)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:26, color:value>=n?"#F59E0B":"#E5E7EB", padding:0, lineHeight:1 }}>
          {value>=n?"★":"☆"}
        </button>
      ))}
    </div>
  );
}

function ERow({ label, children, fullWidth }) {
  return (
    <div style={{ display:fullWidth?"block":"grid", gridTemplateColumns:fullWidth?undefined:"180px 1fr", gap:12, padding:"10px 0", borderBottom:"1px solid #F9FAFB", alignItems:"start" }}>
      <span style={{ fontSize:12, fontWeight:600, color:"#9CA3AF", fontFamily:F, textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:fullWidth?6:0, paddingTop:fullWidth?0:6 }}>{label}</span>
      {children}
    </div>
  );
}

// ── Roadblock accordion card (edit) ──────────────────────────────────────────

const SEV_COLORS = { Low:"#10B981", Medium:"#F59E0B", High:"#F97316", Blocker:"#EF4444" };

function EditRBCard({ rb, index, onChange, onRemove }) {
  const [open, setOpen] = useState(true);
  const sc = SEV_COLORS[rb.severity] || "#9CA3AF";
  return (
    <div style={{ border:"1.5px solid #FED7AA", borderRadius:12, marginBottom:10, overflow:"hidden" }}>
      <button type="button" onClick={()=>setOpen(o=>!o)} style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", padding:"13px 16px", background:"#FFFBF5", border:"none", cursor:"pointer", borderBottom:open?"1px solid #FED7AA":"none", minHeight:52 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:13, fontWeight:700, color:"#EA580C", fontFamily:F }}>Roadblock {index+1}</span>
          {rb.severity && <span style={{ fontSize:11, fontWeight:700, color:sc, background:sc+"18", borderRadius:10, padding:"2px 8px", fontFamily:F }}>{rb.severity}</span>}
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <button type="button" onClick={e=>{e.stopPropagation();onRemove();}} style={{ fontSize:12, color:"#EF4444", background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:7, padding:"5px 11px", cursor:"pointer", fontFamily:F, fontWeight:600 }}>Remove</button>
          <span style={{ color:"#9CA3AF", fontSize:11 }}>{open?"▲":"▼"}</span>
        </div>
      </button>
      {open && (
        <div style={{ padding:"18px 16px", background:"#fff" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
            <div>
              <span style={{ fontSize:12, fontWeight:600, color:"#9CA3AF", fontFamily:F, textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:6 }}>Roadblock type</span>
              <ESelect value={rb.type} onChange={v=>onChange({...rb,type:v})} options={ROADBLOCK_TYPE_OPTIONS}/>
            </div>
            <div>
              <span style={{ fontSize:12, fontWeight:600, color:"#9CA3AF", fontFamily:F, textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:6 }}>Severity</span>
              <EToggle value={rb.severity} options={["Low","Medium","High","Blocker"]} onChange={v=>onChange({...rb,severity:v})}/>
            </div>
          </div>
          <ERow label="Tools affected" fullWidth><ChipGroup options={TOOLS} selected={rb.tools||[]} onChange={v=>onChange({...rb,tools:v})} color="#F97316"/></ERow>
          <ERow label="What happened?" fullWidth><ETextarea value={rb.description} onChange={v=>onChange({...rb,description:v})} placeholder="Describe the limitation or failure…" rows={2}/></ERow>
          <ERow label="Workaround found"><EToggle value={rb.workaroundFound} options={["Yes","No"]} onChange={v=>onChange({...rb,workaroundFound:v})}/></ERow>
          {rb.workaroundFound==="Yes" && (
            <ERow label="How did you solve it?" fullWidth><ETextarea value={rb.workaround} onChange={v=>onChange({...rb,workaround:v})} placeholder="Describe the workaround…" rows={2}/></ERow>
          )}
          <ERow label="Time cost (hours)"><EInput value={rb.timeCost} onChange={v=>onChange({...rb,timeCost:v})} placeholder="e.g. 4"/></ERow>
          <ERow label="Warn future users" fullWidth><ETextarea value={rb.futureWarning} onChange={v=>onChange({...rb,futureWarning:v})} placeholder="What should we flag before someone hits this?" rows={2}/></ERow>
        </div>
      )}
    </div>
  );
}

const UC_COLORS = { Low:"#10B981", Medium:"#F59E0B", High:"#F97316", Critical:"#EF4444" };

function EditBuildCard({ build, index, onChange, onRemove }) {
  const [open, setOpen] = useState(true);
  const uc = UC_COLORS[build.urgency] || "#9CA3AF";
  return (
    <div style={{ border:"1.5px solid #FED7AA", borderRadius:12, marginBottom:10, overflow:"hidden" }}>
      <button type="button" onClick={()=>setOpen(o=>!o)} style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", padding:"13px 16px", background:"#FFFBF5", border:"none", cursor:"pointer", borderBottom:open?"1px solid #FED7AA":"none", minHeight:52 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:13, fontWeight:700, color:"#EA580C", fontFamily:F }}>Build {index+1}</span>
          {build.tool && <span style={{ fontSize:12, color:"#374151", fontFamily:F, fontWeight:500 }}>{build.tool}</span>}
          <span style={{ fontSize:11, fontWeight:700, color:uc, background:uc+"18", borderRadius:10, padding:"2px 8px", fontFamily:F }}>{build.urgency||"Medium"}</span>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <button type="button" onClick={e=>{e.stopPropagation();onRemove();}} style={{ fontSize:12, color:"#EF4444", background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:7, padding:"5px 11px", cursor:"pointer", fontFamily:F, fontWeight:600 }}>Remove</button>
          <span style={{ color:"#9CA3AF", fontSize:11 }}>{open?"▲":"▼"}</span>
        </div>
      </button>
      {open && (
        <div style={{ padding:"18px 16px", background:"#fff" }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
            <div>
              <span style={{ fontSize:12, fontWeight:600, color:"#9CA3AF", fontFamily:F, textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:6 }}>Current tool</span>
              <ESelect value={build.tool} onChange={v=>onChange({...build,tool:v})} options={CURRENT_TOOLS_USED}/>
            </div>
            <div>
              <span style={{ fontSize:12, fontWeight:600, color:"#9CA3AF", fontFamily:F, textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:6 }}>Fix urgency</span>
              <div style={{ display:"flex", gap:6 }}>
                {["Low","Medium","High","Critical"].map(u=>(
                  <button key={u} type="button" onClick={()=>onChange({...build,urgency:u})} style={{ flex:1, padding:"8px 4px", borderRadius:8, fontSize:11, fontWeight:600, fontFamily:F, cursor:"pointer", border:build.urgency===u?`1.5px solid ${UC_COLORS[u]}`:"1.5px solid #E5E7EB", background:build.urgency===u?UC_COLORS[u]+"18":"#fff", color:build.urgency===u?UC_COLORS[u]:"#9CA3AF", minHeight:40 }}>{u}</button>
                ))}
              </div>
            </div>
          </div>
          <ERow label="How is it currently structured?" fullWidth><ETextarea value={build.structure} onChange={v=>onChange({...build,structure:v})} placeholder="e.g. One list per client, statuses: To Do / Done…" rows={2}/></ERow>
          <ERow label="Why isn't it working?" fullWidth><ChipGroup options={FAILURE_REASONS} selected={build.failureReasons||[]} onChange={v=>onChange({...build,failureReasons:v})} color="#F97316"/></ERow>
          <ERow label="What frustrates the team?" fullWidth><ETextarea value={build.whatBreaks} onChange={v=>onChange({...build,whatBreaks:v})} placeholder="Automations misfiring, team skips updates…" rows={2}/></ERow>
          <ERow label="Workarounds they're using" fullWidth><ETextarea value={build.workaroundsTheyUse} onChange={v=>onChange({...build,workaroundsTheyUse:v})} placeholder="Separate spreadsheet, Slack DMs…" rows={2}/></ERow>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, margin:"14px 0" }}>
            <div>
              <span style={{ fontSize:12, fontWeight:600, color:"#9CA3AF", fontFamily:F, textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:6 }}>How long broken?</span>
              <ESelect value={build.howLongBroken} onChange={v=>onChange({...build,howLongBroken:v})} options={["Just noticed","< 1 month","1–3 months","3–6 months","6–12 months","1+ year","Since day one"]}/>
            </div>
            <div>
              <span style={{ fontSize:12, fontWeight:600, color:"#9CA3AF", fontFamily:F, textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:6 }}>Who flagged this?</span>
              <ESelect value={build.whoReported} onChange={v=>onChange({...build,whoReported:v})} options={["Client / End User","Team Lead","Manager / Director","Executive","Ops / Admin","IT","Self-identified"]}/>
            </div>
          </div>
          <ERow label="Integrations connected" fullWidth><ChipGroup options={TOOLS} selected={build.integrationsInPlace||[]} onChange={v=>onChange({...build,integrationsInPlace:v})} color="#F97316"/></ERow>
          <ERow label="Business impact" fullWidth><ETextarea value={build.impactOnTeam} onChange={v=>onChange({...build,impactOnTeam:v})} placeholder="Billing delays, missed deadlines…" rows={2}/></ERow>
        </div>
      )}
    </div>
  );
}

const COMM_COLORS = { Yes:"#059669", No:"#DC2626", Partially:"#D97706" };

function EditScopeCreepCard({ item, index, onChange, onRemove }) {
  const [open, setOpen] = useState(true);
  const cc = COMM_COLORS[item.communicated] || "#9CA3AF";
  return (
    <div style={{ border:"1.5px solid #FDE68A", borderRadius:12, marginBottom:10, overflow:"hidden" }}>
      <button type="button" onClick={()=>setOpen(o=>!o)} style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", padding:"13px 16px", background:"#FFFBEB", border:"none", cursor:"pointer", borderBottom:open?"1px solid #FDE68A":"none", minHeight:52 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:13, fontWeight:700, color:"#D97706", fontFamily:F }}>Scope item {index+1}</span>
          {item.area && <span style={{ fontSize:12, color:"#374151", fontFamily:F, fontWeight:500 }}>{item.area}</span>}
          {item.communicated && <span style={{ fontSize:11, fontWeight:700, color:cc, background:cc+"18", borderRadius:10, padding:"2px 8px", fontFamily:F }}>{item.communicated}</span>}
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <button type="button" onClick={e=>{e.stopPropagation();onRemove();}} style={{ fontSize:12, color:"#EF4444", background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:7, padding:"5px 11px", cursor:"pointer", fontFamily:F, fontWeight:600 }}>Remove</button>
          <span style={{ color:"#9CA3AF", fontSize:11 }}>{open?"▲":"▼"}</span>
        </div>
      </button>
      {open && (
        <div style={{ padding:"18px 16px", background:"#fff" }}>
          <ERow label="What was added?" fullWidth>
            <EInput value={item.area} onChange={v=>onChange({...item,area:v})} placeholder="e.g. Added a second pipeline for enterprise clients"/>
          </ERow>
          <ERow label="Why was it added?" fullWidth>
            <ETextarea value={item.reason} onChange={v=>onChange({...item,reason:v})} placeholder="Client requested it during the build, discovered dependency, etc." rows={2}/>
          </ERow>
          <ERow label="Impact on timeline / complexity" fullWidth>
            <ETextarea value={item.impact} onChange={v=>onChange({...item,impact:v})} placeholder="Added 2 days, introduced 3 new automations, etc." rows={2}/>
          </ERow>
          <ERow label="Was it communicated & approved?">
            <EToggle value={item.communicated} options={["Yes","Partially","No"]} onChange={v=>onChange({...item,communicated:v})}/>
          </ERow>
        </div>
      )}
    </div>
  );
}

function EditProjectUpdateCard({ item, onChange, onRemove }) {
  const [open, setOpen] = useState(true);
  const dateLabel = item.createdAt
    ? (() => { const [y,m,d] = item.createdAt.slice(0,10).split("-"); return new Date(+y,+m-1,+d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); })()
    : "New update";
  return (
    <div style={{ border:"1.5px solid #BAE6FD", borderRadius:12, marginBottom:10, overflow:"hidden" }}>
      <button type="button" onClick={()=>setOpen(o=>!o)} style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", padding:"13px 16px", background:"#F0F9FF", border:"none", cursor:"pointer", borderBottom:open?"1px solid #BAE6FD":"none", minHeight:52 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:13, fontWeight:700, color:"#0284C7", fontFamily:F }}>{dateLabel}</span>
          {(item.attachments||[]).length > 0 && <span style={{ fontSize:11, fontWeight:700, color:"#0284C7", background:"#E0F2FE", border:"1px solid #BAE6FD", borderRadius:8, padding:"2px 8px", fontFamily:F }}>📎 {item.attachments.length}</span>}
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <button type="button" onClick={e=>{e.stopPropagation();onRemove();}} style={{ fontSize:12, color:"#EF4444", background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:7, padding:"5px 11px", cursor:"pointer", fontFamily:F, fontWeight:600 }}>Remove</button>
          <span style={{ color:"#9CA3AF", fontSize:11 }}>{open?"▲":"▼"}</span>
        </div>
      </button>
      {open && (
        <div style={{ padding:"18px 16px", background:"#fff" }}>
          <ERow label="Date">
            <input
              type="date"
              value={item.createdAt ? item.createdAt.slice(0,10) : ""}
              onChange={e=>onChange({...item, createdAt: e.target.value || ""})}
              style={{ fontFamily:F, fontSize:13, color:"#374151", border:"1.5px solid #E5E7EB", borderRadius:9, padding:"9px 12px", outline:"none", background:"#fff", cursor:"pointer" }}
            />
          </ERow>
          <ERow label="Update" fullWidth>
            <ETextarea value={item.content} onChange={v=>onChange({...item,content:v})} placeholder="Describe what changed, what was decided, or any relevant progress notes…" rows={4}/>
          </ERow>
          {/* Attachments */}
          <div style={{ marginTop:14 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <span style={{ fontSize:12, fontWeight:600, color:"#9CA3AF", fontFamily:F, textTransform:"uppercase", letterSpacing:"0.06em" }}>Attachments <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0 }}>(links)</span></span>
              <button type="button" onClick={()=>onChange({...item,attachments:[...(item.attachments||[]),{name:"",url:""}]})} style={{ fontSize:12, color:"#0284C7", background:"none", border:"1px dashed #BAE6FD", borderRadius:6, padding:"4px 10px", cursor:"pointer", fontFamily:F }}>+ Add link</button>
            </div>
            {(item.attachments||[]).length === 0 && (
              <p style={{ fontSize:12, color:"#9CA3AF", fontFamily:F, margin:"0 0 4px" }}>No attachments yet — paste a Google Drive, Notion, or any file link above.</p>
            )}
            {(item.attachments||[]).map((att,ai)=>(
              <div key={ai} style={{ display:"flex", gap:8, alignItems:"center", marginBottom:6 }}>
                <div style={{ flex:"0 0 140px" }}>
                  <EInput value={att.name} onChange={v=>onChange({...item,attachments:(item.attachments||[]).map((a,idx)=>idx===ai?{...a,name:v}:a)})} placeholder="Label…"/>
                </div>
                <div style={{ flex:1 }}>
                  <EInput value={att.url} onChange={v=>onChange({...item,attachments:(item.attachments||[]).map((a,idx)=>idx===ai?{...a,url:v}:a)})} placeholder="https://…"/>
                </div>
                <button type="button" onClick={()=>onChange({...item,attachments:(item.attachments||[]).filter((_,idx)=>idx!==ai)})} style={{ fontSize:16, color:"#EF4444", background:"none", border:"none", cursor:"pointer", padding:"4px", lineHeight:1 }}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Inline edit view ──────────────────────────────────────────────────────────

const ROADBLOCK_TYPE_OPTIONS = ["Integration Limitation","API Limitation","Automation Limitation","Data Mapping Mismatch","Auth Complexity","Timing Conflict","Cost Ceiling","User Behavior Gap","Scope Creep Block"];

function CaseFileEditView({ cf, onSave, onCancel, isSaving, apiError }) {
  const [data, setData] = useState(()=>caseFileToFormState(cf));
  const [caseName, setCaseName] = useState(cf.name||"");
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 900);
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  const enteredBy = cf.logged_by_name||"";

  const setAudit    = k => v => setData(d=>({...d, audit:    {...d.audit,    [k]:v}}));
  const setIntake   = k => v => setData(d=>({...d, intake:   {...d.intake,   [k]:v}}));
  const setBuild    = k => v => setData(d=>({...d, build:    {...d.build,    [k]:v}}));
  const setDelta    = k => v => setData(d=>({...d, delta:    {...d.delta,    [k]:v}}));
  const setRsn      = k => v => setData(d=>({...d, reasoning:{...d.reasoning,[k]:v}}));
  const setOutcome  = k => v => setData(d=>({...d, outcome:  {...d.outcome,  [k]:v}}));

  const addBuild = () => setData(d=>({...d, audit:{...d.audit, builds:[...(d.audit.builds||[]), {tool:"",structure:"",failureReasons:[],whatBreaks:"",workaroundsTheyUse:"",howLongBroken:"",whoReported:"",integrationsInPlace:[],impactOnTeam:"",urgency:"Medium"}]}}));
  const remBuild = i => setData(d=>({...d,audit:{...d.audit,builds:d.audit.builds.filter((_,idx)=>idx!==i)}}));

  const addRb = () => setData(d=>({...d, delta:{...d.delta, roadblocks:[...(d.delta.roadblocks||[]), {type:"",severity:"",tools:[],description:"",workaroundFound:null,workaround:"",timeCost:"",futureWarning:""}]}}));
  const remRb = i => setData(d=>({...d,delta:{...d.delta,roadblocks:d.delta.roadblocks.filter((_,idx)=>idx!==i)}}));

  const addSc = () => setData(d=>({...d, delta:{...d.delta, scopeCreep:[...(d.delta.scopeCreep||[]), {area:"",reason:"",impact:"",communicated:null}]}}));
  const remSc = i => setData(d=>({...d,delta:{...d.delta,scopeCreep:(d.delta.scopeCreep||[]).filter((_,idx)=>idx!==i)}}));

  const addPu = () => setData(d=>({...d, projectUpdates:[...(d.projectUpdates||[]), {content:"",attachments:[],createdAt:new Date().toISOString()}]}));
  const remPu = i => setData(d=>({...d, projectUpdates:(d.projectUpdates||[]).filter((_,idx)=>idx!==i)}));

  const { audit, intake, build, delta, reasoning, outcome, projectUpdates } = data;

  const SaveBar = () => (
    <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:28 }}>
      <button onClick={onCancel} style={{ padding:"11px 24px", background:"#fff", border:"1.5px solid #E5E7EB", borderRadius:10, color:"#374151", fontSize:13, fontWeight:600, fontFamily:F, cursor:"pointer" }}>Cancel</button>
      <button onClick={()=>onSave(data,enteredBy,caseName)} disabled={isSaving} style={{ padding:"11px 28px", background:isSaving?"#6EE7B7":"#059669", border:"none", borderRadius:10, color:"#fff", fontSize:13, fontWeight:700, fontFamily:F, cursor:isSaving?"not-allowed":"pointer", boxShadow:"0 2px 10px rgba(5,150,105,0.35)" }}>
        {isSaving?"Saving…":"Save changes ✓"}
      </button>
    </div>
  );

  return (
    <div style={{ display:"flex", gap:24, alignItems:"flex-start" }}>
    <div style={{ flex:1, minWidth:0, maxWidth:780, padding:"28px 32px 100px" }}>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:28, flexWrap:"wrap", gap:14 }}>
        <div>
          <button onClick={onCancel} style={{ fontSize:13, color:"#9CA3AF", fontFamily:F, background:"none", border:"none", cursor:"pointer", marginBottom:10, padding:0 }}>← Back to view</button>
          <h1 style={{ margin:"0 0 4px", fontSize:24, fontFamily:"'Fraunces', serif" }}>Edit case file</h1>
          <p style={{ margin:0, fontSize:13, color:"#6B7280", fontFamily:F }}>Logged by <strong style={{ color:"#374151" }}>{enteredBy||"—"}</strong></p>
        </div>
        <div style={{ display:"flex", gap:8, paddingTop:28 }}>
          <button onClick={onCancel} style={{ padding:"9px 18px", background:"#fff", border:"1.5px solid #E5E7EB", borderRadius:9, color:"#374151", fontSize:13, fontWeight:600, fontFamily:F, cursor:"pointer" }}>Cancel</button>
          <button onClick={()=>onSave(data,enteredBy,caseName)} disabled={isSaving} style={{ padding:"9px 18px", background:"#059669", border:"none", borderRadius:9, color:"#fff", fontSize:13, fontWeight:700, fontFamily:F, cursor:isSaving?"not-allowed":"pointer" }}>
            {isSaving?"Saving…":"Save changes"}
          </button>
        </div>
      </div>

      {apiError && (
        <div style={{ padding:"14px 18px", background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:10, marginBottom:20, fontSize:13, color:"#DC2626", fontFamily:F, whiteSpace:"pre-wrap" }}>
          <strong>Save failed:</strong> {apiError}
        </div>
      )}

      {/* Case name */}
      <div style={{ marginBottom:20, background:"#fff", border:"1px solid #F0F0F0", borderRadius:12, padding:"16px 18px" }}>
        <ERow label="Case name"><EInput value={caseName} onChange={setCaseName} placeholder="e.g. Acme CRM Migration"/></ERow>
      </div>

      {/* ── Audit ──────────────────────────────────────────────────────────── */}
      <Section title="Current State Audit" emoji="🔍" color={STEP_COLORS.audit}>
        <ERow label="Has existing setup">
          <EToggle value={audit.hasExisting} options={["Yes, they have something","No — starting from scratch"]} onChange={setAudit("hasExisting")}/>
        </ERow>
        {audit.hasExisting==="No — starting from scratch" && (
          <div style={{ padding:"18px 20px", textAlign:"center", background:"#ECFDF5", border:"1px solid #6EE7B7", borderRadius:10 }}>
            <span style={{ fontSize:24 }}>🌱</span>
            <p style={{ margin:"8px 0 0", fontSize:13, color:"#065F46", fontFamily:F, fontWeight:600 }}>Greenfield build — no existing setup to audit.</p>
          </div>
        )}
        {audit.hasExisting==="Yes, they have something" && (<>
          <ERow label="Overall assessment" fullWidth><ETextarea value={audit.overallAssessment} onChange={setAudit("overallAssessment")} placeholder="High-level summary..."/></ERow>
          <ERow label="Tried to fix before"><EToggle value={audit.triedToFix} options={["Yes","No"]} onChange={setAudit("triedToFix")}/></ERow>
          {audit.triedToFix==="Yes" && (
            <ERow label="Previous fixes" fullWidth><ETextarea value={audit.previousFixes} onChange={setAudit("previousFixes")} placeholder="What fixes were attempted..."/></ERow>
          )}
          <ERow label="Pattern summary" fullWidth><ETextarea value={audit.patternSummary} onChange={setAudit("patternSummary")} placeholder="Recurring issues..."/></ERow>
          {(audit.builds||[]).length>0 && (
            <div style={{ marginTop:14 }}>
              <p style={{ fontSize:12, fontWeight:700, color:"#9CA3AF", fontFamily:F, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>Builds ({audit.builds.length})</p>
              {audit.builds.map((b,i)=>(
                <EditBuildCard key={i} build={b} index={i}
                  onChange={v=>setData(d=>{const builds=[...d.audit.builds];builds[i]=v;return {...d,audit:{...d.audit,builds}};})}
                  onRemove={()=>remBuild(i)}/>
              ))}
            </div>
          )}
          <button type="button" onClick={addBuild} style={{ marginTop:10, padding:"8px 16px", background:"transparent", border:"1.5px dashed #FED7AA", borderRadius:9, color:"#EA580C", fontSize:12, fontWeight:600, fontFamily:F, cursor:"pointer" }}>+ Add build</button>
        </>)}
      </Section>

      {/* ── Intake ─────────────────────────────────────────────────────────── */}
      <Section title="Scenario Intake" emoji="📋" color={STEP_COLORS.intake}>

        {/* Raw scenario prompt */}
        <div style={{ background:"#fff", border:"1px solid #EDE9FE", borderTop:"3px solid #7C3AED", borderRadius:10, padding:"18px 18px 16px", marginBottom:14 }}>
          <p style={{ margin:"0 0 2px", fontSize:14, fontWeight:700, color:"#111827", fontFamily:F }}>Raw scenario prompt</p>
          <p style={{ margin:"0 0 12px", fontSize:12, color:"#9CA3AF", fontFamily:F }}>Paste exactly as the user described — don't clean it up</p>
          <ETextarea value={intake.rawPrompt} onChange={setIntake("rawPrompt")} placeholder="e.g. We're a 6-person marketing agency managing 12 clients. We use Slack and HubSpot but nothing talks to each other…" rows={4}/>
        </div>

        {/* Team basics */}
        <div style={{ background:"#fff", border:"1px solid #EDE9FE", borderTop:"3px solid #7C3AED", borderRadius:10, padding:"18px 18px 16px", marginBottom:14 }}>
          <p style={{ margin:"0 0 14px", fontSize:14, fontWeight:700, color:"#111827", fontFamily:F }}>Team basics</p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <div>
              <span style={{ fontSize:12, fontWeight:600, color:"#9CA3AF", fontFamily:F, textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:6 }}>Team size</span>
              <EInput value={intake.teamSize} onChange={setIntake("teamSize")} placeholder="e.g. 6"/>
            </div>
            <div>
              <span style={{ fontSize:12, fontWeight:600, color:"#9CA3AF", fontFamily:F, textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:6 }}>Primary workflow type</span>
              <ESelect value={intake.workflowType} onChange={setIntake("workflowType")} options={WORKFLOW_TYPES.map(w=>w.name)}/>
              {intake.workflowType && (() => { const wt = WORKFLOW_TYPES.find(w=>w.name===intake.workflowType); return wt ? <p style={{ margin:"4px 0 0", fontSize:12, color:"#9CA3AF", fontFamily:F, lineHeight:1.4 }}>{wt.desc}</p> : null; })()}
            </div>
          </div>
        </div>

        {/* Industry */}
        <div style={{ background:"#fff", border:"1px solid #EDE9FE", borderTop:"3px solid #7C3AED", borderRadius:10, padding:"18px 18px 16px", marginBottom:14 }}>
          <p style={{ margin:"0 0 2px", fontSize:14, fontWeight:700, color:"#111827", fontFamily:F }}>Industry</p>
          <p style={{ margin:"0 0 12px", fontSize:12, color:"#9CA3AF", fontFamily:F }}>Expand a category — multiple allowed</p>
          <IndustryPicker selected={intake.industries||[]} onChange={setIntake("industries")}/>
        </div>

        {/* Process frameworks */}
        <div style={{ background:"#fff", border:"1px solid #EDE9FE", borderTop:"3px solid #7C3AED", borderRadius:10, padding:"18px 18px 16px", marginBottom:14 }}>
          <p style={{ margin:"0 0 2px", fontSize:14, fontWeight:700, color:"#111827", fontFamily:F }}>Process frameworks</p>
          <p style={{ margin:"0 0 12px", fontSize:12, color:"#9CA3AF", fontFamily:F }}>Select every framework they reference or need support with</p>
          <FrameworkPicker selected={intake.processFrameworks||[]} onChange={setIntake("processFrameworks")}/>
        </div>

        {/* Tools & pain points */}
        <div style={{ background:"#fff", border:"1px solid #EDE9FE", borderTop:"3px solid #7C3AED", borderRadius:10, padding:"18px 18px 16px", marginBottom:14 }}>
          <p style={{ margin:"0 0 14px", fontSize:14, fontWeight:700, color:"#111827", fontFamily:F }}>Tools & pain points</p>
          <span style={{ fontSize:12, fontWeight:600, color:"#9CA3AF", fontFamily:F, textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:8 }}>Tools currently in use <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0 }}>— select all</span></span>
          <ChipGroup options={TOOLS} selected={intake.tools||[]} onChange={setIntake("tools")} color={BLUE}/>
          <div style={{ height:1, background:"#F3F4F6", margin:"16px 0 14px" }}/>
          <span style={{ fontSize:12, fontWeight:600, color:"#9CA3AF", fontFamily:F, textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:8 }}>Core pain points</span>
          <ChipGroup options={PAIN_POINTS} selected={intake.painPoints||[]} onChange={setIntake("painPoints")} color="#7C3AED"/>
          <div style={{ height:1, background:"#F3F4F6", margin:"16px 0 14px" }}/>
          <span style={{ fontSize:12, fontWeight:600, color:"#9CA3AF", fontFamily:F, textTransform:"uppercase", letterSpacing:"0.06em", display:"block", marginBottom:8 }}>What have they already tried that didn't work? <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0 }}>— optional</span></span>
          <ETextarea value={intake.priorAttempts} onChange={setIntake("priorAttempts")} placeholder="Previous tools, failed automations…" rows={2}/>
        </div>

      </Section>

      {/* ── Build ──────────────────────────────────────────────────────────── */}
      <Section title="Build Documentation" emoji="🏗️" color={STEP_COLORS.build}>
        {(build.workflows||[]).map((wf,wi)=>{
          const updWf = v => setBuild("workflows")((build.workflows||[]).map((w,idx)=>idx===wi?v:w));
          const updList = (li,v) => updWf({...wf,lists:(wf.lists||[]).map((l,idx)=>idx===li?v:l)});
          const addList = () => updWf({...wf,lists:[...(wf.lists||[]),{name:"",statuses:"",customFields:"",automations:[]}]});
          const remList = li => updWf({...wf,lists:(wf.lists||[]).filter((_,idx)=>idx!==li)});
          const pipeline = wf.pipeline||[];
          const validPhases = pipeline.filter(p=>p.trim());
          return (
            <div key={wi} style={{ border:"1px solid #BAE6FD", borderRadius:12, padding:"14px 16px", marginBottom:14, background:"#F0F9FF" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ width:24, height:24, borderRadius:6, background:"#0284C7", color:"#fff", fontSize:12, fontWeight:700, fontFamily:F, display:"inline-flex", alignItems:"center", justifyContent:"center" }}>{wi+1}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:"#0C4A6E", fontFamily:F }}>{wf.name||`Workflow ${wi+1}`}</span>
                </div>
                <button type="button" onClick={()=>setBuild("workflows")((build.workflows||[]).filter((_,idx)=>idx!==wi))} style={{ fontSize:12, color:"#EF4444", background:"none", border:"none", cursor:"pointer", fontFamily:F }}>Remove</button>
              </div>
              <ERow label="Workflow name"><EInput value={wf.name} onChange={v=>updWf({...wf,name:v})} placeholder="e.g. Sales Space Pipeline"/></ERow>
              <ERow label="Notes" fullWidth><ETextarea value={wf.notes} onChange={v=>updWf({...wf,notes:v})} placeholder="Context, dependencies…" rows={2}/></ERow>
              {/* Pipeline phases */}
              <div style={{ margin:"12px 0 4px", fontSize:11, fontWeight:700, color:"#0284C7", fontFamily:F, textTransform:"uppercase", letterSpacing:"0.06em" }}>Pipeline phases ({pipeline.length})</div>
              <div style={{ marginBottom:10 }}>
                {pipeline.map((phase,pi)=>(
                  <div key={pi} style={{ display:"flex", gap:6, alignItems:"center", marginBottom:6 }}>
                    <span style={{ fontSize:11, fontWeight:700, color:"#9CA3AF", fontFamily:F, minWidth:22, textAlign:"right" }}>{pi+1}.</span>
                    <div style={{ flex:1 }}><EInput value={phase} onChange={v=>updWf({...wf,pipeline:pipeline.map((p,idx)=>idx===pi?v:p)})} placeholder={`Phase ${pi+1} name…`}/></div>
                    <button type="button" onClick={()=>{const n=[...pipeline];[n[pi],n[pi-1]]=[n[pi-1],n[pi]];updWf({...wf,pipeline:n});}} disabled={pi===0} style={{ fontSize:13, color:pi===0?"#D1D5DB":"#6B7280", background:"none", border:"none", cursor:pi===0?"default":"pointer", padding:"4px 2px" }} title="Move up">▲</button>
                    <button type="button" onClick={()=>{const n=[...pipeline];[n[pi],n[pi+1]]=[n[pi+1],n[pi]];updWf({...wf,pipeline:n});}} disabled={pi===pipeline.length-1} style={{ fontSize:13, color:pi===pipeline.length-1?"#D1D5DB":"#6B7280", background:"none", border:"none", cursor:pi===pipeline.length-1?"default":"pointer", padding:"4px 2px" }} title="Move down">▼</button>
                    <button type="button" onClick={()=>updWf({...wf,pipeline:pipeline.filter((_,idx)=>idx!==pi)})} style={{ fontSize:16, color:"#EF4444", background:"none", border:"none", cursor:"pointer", padding:"4px 2px", lineHeight:1 }}>×</button>
                  </div>
                ))}
                {pipeline.length===0 && <p style={{ margin:"0 0 6px", fontSize:12, color:"#9CA3AF", fontFamily:F }}>No pipeline phases yet.</p>}
                <button type="button" onClick={()=>updWf({...wf,pipeline:[...pipeline,""]})} style={{ fontSize:12, color:"#0284C7", background:"none", border:"1px dashed #BAE6FD", borderRadius:7, padding:"5px 12px", cursor:"pointer", fontFamily:F }}>+ Add phase</button>
              </div>
              <div style={{ margin:"12px 0 8px", fontSize:11, fontWeight:700, color:"#0284C7", fontFamily:F, textTransform:"uppercase", letterSpacing:"0.06em" }}>Lists ({(wf.lists||[]).length})</div>
              {(wf.lists||[]).map((l,li)=>{
                const lautos = l.automations||[];
                const updAuto = (ai,v) => updList(li,{...l,automations:lautos.map((a,idx)=>idx===ai?v:a)});
                const addAuto = () => updList(li,{...l,automations:[...lautos,{platform:"clickup",pipelinePhase:"",triggers:[{type:"",detail:""}],actions:[{type:"",detail:""}],instructions:""}]});
                const remAuto = ai => updList(li,{...l,automations:lautos.filter((_,idx)=>idx!==ai)});
                const moveAuto = (ai, dir) => {
                  const j = ai + dir;
                  if (j < 0 || j >= lautos.length) return;
                  const next = [...lautos];
                  [next[ai], next[j]] = [next[j], next[ai]];
                  updList(li,{...l,automations:next});
                };
                return (
                  <div key={li} style={{ border:"1px solid #0284C730", borderLeft:"3px solid #0284C7", borderRadius:9, padding:"12px 14px", marginBottom:8, background:"#fff" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
                      <span style={{ fontSize:12, fontWeight:700, color:"#0284C7", fontFamily:F }}>List {li+1}</span>
                      {(wf.lists||[]).length>1 && <button type="button" onClick={()=>remList(li)} style={{ fontSize:12, color:"#EF4444", background:"none", border:"none", cursor:"pointer", fontFamily:F }}>Remove</button>}
                    </div>
                    <ERow label="List name"><EInput value={l.name} onChange={v=>updList(li,{...l,name:v})} placeholder="e.g. Active Leads"/></ERow>
                    <ERow label="Status flow"><EInput value={l.statuses} onChange={v=>updList(li,{...l,statuses:v})} placeholder="New → In Progress → Done"/></ERow>
                    <ERow label="Custom fields" fullWidth><ETextarea value={l.customFields} onChange={v=>updList(li,{...l,customFields:v})} placeholder={"Client Name — Text\nPriority — Dropdown"} rows={3}/></ERow>
                    <div style={{ margin:"12px 0 6px", fontSize:11, fontWeight:700, color:"#0284C7", fontFamily:F, textTransform:"uppercase", letterSpacing:"0.06em" }}>Automations ({lautos.length})</div>
                    {lautos.map((auto,ai)=>(
                      <div key={ai} style={{ border:"1px solid #E5E7EB", borderLeft:"3px solid #0284C780", borderRadius:8, padding:"12px 14px", marginBottom:8, background:"#F9FAFB" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <span style={{ fontSize:11, fontWeight:700, color:"#0284C7", fontFamily:F, textTransform:"uppercase", letterSpacing:"0.06em" }}>Automation {ai+1}</span>
                            {auto.pipelinePhase && <span style={{ fontSize:10, fontWeight:700, color:"#0284C7", background:"#E0F2FE", border:"1px solid #BAE6FD", borderRadius:6, padding:"2px 8px", fontFamily:F }}>{auto.pipelinePhase}</span>}
                          </div>
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <button type="button" onClick={()=>moveAuto(ai,-1)} disabled={ai===0} style={{ fontSize:13, color:ai===0?"#D1D5DB":"#6B7280", background:"none", border:"none", cursor:ai===0?"default":"pointer", padding:"2px 4px", lineHeight:1 }} title="Move up">▲</button>
                            <button type="button" onClick={()=>moveAuto(ai,1)} disabled={ai===lautos.length-1} style={{ fontSize:13, color:ai===lautos.length-1?"#D1D5DB":"#6B7280", background:"none", border:"none", cursor:ai===lautos.length-1?"default":"pointer", padding:"2px 4px", lineHeight:1 }} title="Move down">▼</button>
                            <button type="button" onClick={()=>remAuto(ai)} style={{ fontSize:12, color:"#EF4444", background:"none", border:"none", cursor:"pointer", fontFamily:F, marginLeft:4 }}>Remove</button>
                          </div>
                        </div>
                        {/* Pipeline phase */}
                        {validPhases.length > 0 && (
                          <div style={{ marginBottom:10 }}>
                            <div style={{ fontSize:11, fontWeight:600, color:"#6B7280", fontFamily:F, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:6 }}>Pipeline phase <span style={{ fontWeight:400, textTransform:"none", letterSpacing:0 }}>(optional)</span></div>
                            <ESelect value={auto.pipelinePhase||""} onChange={v=>updAuto(ai,{...auto,pipelinePhase:v})} options={validPhases}/>
                          </div>
                        )}
                        {/* Platform toggle */}
                        <div style={{ display:"flex", gap:0, marginBottom:12, border:"1.5px solid #E5E7EB", borderRadius:9, overflow:"hidden", width:"fit-content" }}>
                          {["clickup","third_party"].map(p=>{
                            const active=(auto.platform||"clickup")===p;
                            return (
                              <button key={p} type="button" onClick={()=>updAuto(ai,{...auto,platform:p})}
                                style={{ padding:"6px 16px", fontSize:12, fontWeight:600, fontFamily:F, border:"none", cursor:"pointer", background:active?"#0284C7":"#fff", color:active?"#fff":"#6B7280" }}>
                                {p==="clickup"?"ClickUp":"3rd Party"}
                              </button>
                            );
                          })}
                        </div>
                        {/* 3rd party platform picker */}
                        {(auto.platform||"clickup")==="third_party" && (
                          <div style={{ marginBottom:10 }}>
                            <div style={{ fontSize:11, fontWeight:600, color:"#6B7280", fontFamily:F, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:6 }}>Platform</div>
                            <ESelect value={auto.third_party_platform||""} onChange={v=>updAuto(ai,{...auto,third_party_platform:v})} options={THIRD_PARTY_PLATFORMS}/>
                          </div>
                        )}
                        {/* Triggers */}
                        <div style={{ marginBottom:10 }}>
                          <div style={{ fontSize:11, fontWeight:600, color:"#6B7280", fontFamily:F, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:6 }}>Triggers</div>
                          {(auto.triggers||[]).map((t,ti)=>(
                            <div key={ti} style={{ display:"flex", gap:8, alignItems:"flex-start", marginBottom:6 }}>
                              <div style={{ flex:"0 0 180px" }}><ESelect value={t.type} onChange={v=>updAuto(ai,{...auto,triggers:auto.triggers.map((tr,idx)=>idx===ti?{...tr,type:v}:tr)})} options={CLICKUP_TRIGGERS}/></div>
                              <div style={{ flex:1 }}><EInput value={t.detail} onChange={v=>updAuto(ai,{...auto,triggers:auto.triggers.map((tr,idx)=>idx===ti?{...tr,detail:v}:tr)})} placeholder="e.g. to Done…"/></div>
                              {auto.triggers.length>1 && <button type="button" onClick={()=>updAuto(ai,{...auto,triggers:auto.triggers.filter((_,idx)=>idx!==ti)})} style={{ fontSize:16, color:"#EF4444", background:"none", border:"none", cursor:"pointer", padding:"6px 4px", fontFamily:F }}>×</button>}
                            </div>
                          ))}
                          <button type="button" onClick={()=>updAuto(ai,{...auto,triggers:[...auto.triggers,{type:"",detail:""}]})} style={{ fontSize:12, color:"#0284C7", background:"none", border:"1px dashed #BAE6FD", borderRadius:6, padding:"4px 10px", cursor:"pointer", fontFamily:F }}>+ trigger</button>
                        </div>
                        {/* Actions — ClickUp only */}
                        {(auto.platform||"clickup")==="clickup" && (
                          <div style={{ marginBottom:10 }}>
                            <div style={{ fontSize:11, fontWeight:600, color:"#6B7280", fontFamily:F, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:6 }}>Actions</div>
                            {(auto.actions||[]).map((a,ai2)=>(
                              <div key={ai2} style={{ display:"flex", gap:8, alignItems:"flex-start", marginBottom:6 }}>
                                <div style={{ flex:"0 0 180px" }}><ESelect value={a.type} onChange={v=>updAuto(ai,{...auto,actions:auto.actions.map((ac,idx)=>idx===ai2?{...ac,type:v}:ac)})} options={CLICKUP_ACTIONS}/></div>
                                <div style={{ flex:1 }}><EInput value={a.detail} onChange={v=>updAuto(ai,{...auto,actions:auto.actions.map((ac,idx)=>idx===ai2?{...ac,detail:v}:ac)})} placeholder="e.g. to team lead…"/></div>
                                {auto.actions.length>1 && <button type="button" onClick={()=>updAuto(ai,{...auto,actions:auto.actions.filter((_,idx)=>idx!==ai2)})} style={{ fontSize:16, color:"#EF4444", background:"none", border:"none", cursor:"pointer", padding:"6px 4px", fontFamily:F }}>×</button>}
                              </div>
                            ))}
                            <button type="button" onClick={()=>updAuto(ai,{...auto,actions:[...auto.actions,{type:"",detail:""}]})} style={{ fontSize:12, color:"#0284C7", background:"none", border:"1px dashed #BAE6FD", borderRadius:6, padding:"4px 10px", cursor:"pointer", fontFamily:F }}>+ action</button>
                          </div>
                        )}
                        {/* Instructions */}
                        <div style={{ marginBottom:4 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                              <span style={{ fontSize:11, fontWeight:700, color:"#6B7280", fontFamily:F, textTransform:"uppercase", letterSpacing:"0.06em" }}>
                                {(auto.platform||"clickup")==="clickup" ? "Agent / Automation Instructions" : "Actions / Instructions"}
                              </span>
                              {auto.use_agent && <span style={{ fontSize:10, fontWeight:700, color:"#7C3AED", background:"#F5F3FF", border:"1px solid #DDD6FE", borderRadius:6, padding:"2px 7px", fontFamily:F, letterSpacing:"0.04em" }}>AGENT ON</span>}
                            </div>
                            <span style={{ fontSize:11, color:"#9CA3AF", fontFamily:F }}>optional</span>
                          </div>
                          <textarea
                            value={auto.instructions}
                            onChange={e=>updAuto(ai,{...auto, instructions:e.target.value, use_agent:e.target.value.trim().length>0})}
                            rows={5}
                            placeholder={(auto.platform||"clickup")==="clickup"
                              ? "# Agent / automation instructions\n# Describe the logic for this automation\n\nIF task.status == 'Done':\n  notify(assignee)\n  move_to_list('Completed')"
                              : "# 3rd party automation actions\n# e.g. Make scenario steps, Zapier actions\n\nStep 1: Watch for new ClickUp task\nStep 2: Create record in HubSpot\nStep 3: Send Slack notification"}
                            style={{
                              width:"100%", boxSizing:"border-box",
                              fontFamily:"'Fira Code','Cascadia Code','Consolas',monospace",
                              fontSize:13, color:"#CDD6F4", background:"#1E1E2E",
                              border:"1px solid #313244", borderRadius:8,
                              padding:"12px 14px", outline:"none", resize:"vertical", lineHeight:1.7,
                              caretColor:"#CDD6F4",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={addAuto} style={{ width:"100%", padding:"7px 0", background:"transparent", border:"1.5px dashed #0284C750", borderRadius:8, color:"#0284C7", fontSize:12, fontWeight:600, fontFamily:F, cursor:"pointer", marginTop:4 }}>+ Add automation</button>
                  </div>
                );
              })}
              <button type="button" onClick={addList} style={{ width:"100%", padding:"8px 0", background:"transparent", border:"1.5px dashed #BAE6FD", borderRadius:8, color:"#0284C7", fontSize:12, fontWeight:600, fontFamily:F, cursor:"pointer" }}>+ Add list</button>
            </div>
          );
        })}
        <button type="button" onClick={()=>setBuild("workflows")([...(build.workflows||[]),{name:"",notes:"",pipeline:[],lists:[{name:"",statuses:"",customFields:"",automations:[]}]}])} style={{ width:"100%", padding:"10px 0", background:"transparent", border:"1.5px dashed #BAE6FD", borderRadius:10, color:"#0284C7", fontSize:13, fontWeight:600, fontFamily:F, cursor:"pointer", marginBottom:10 }}>+ Add workflow</button>
        <ERow label="Build notes" fullWidth><ETextarea value={build.buildNotes} onChange={setBuild("buildNotes")} placeholder="General notes across all workflows..." rows={3}/></ERow>
      </Section>

      {/* ── Delta ──────────────────────────────────────────────────────────── */}
      <Section title="Intent vs Reality" emoji="⚖️" color={STEP_COLORS.delta}>
        <ERow label="User intent " fullWidth><ETextarea value={delta.userIntent} onChange={setDelta("userIntent")} placeholder="What the user wanted..." rows={3}/></ERow>
        <ERow label="Success criteria " fullWidth><ETextarea value={delta.successCriteria} onChange={setDelta("successCriteria")} placeholder="What success looks like..." rows={2}/></ERow>
        <ERow label="What was built " fullWidth><ETextarea value={delta.actualBuild} onChange={setDelta("actualBuild")} placeholder="What was actually delivered..." rows={3}/></ERow>
        <ERow label="Diverged"><EToggle value={delta.diverged} options={["Yes","No"]} onChange={setDelta("diverged")}/></ERow>
        <ERow label="Divergence reason " fullWidth><ETextarea value={delta.divergenceReason} onChange={setDelta("divergenceReason")} placeholder="Why did it diverge?" rows={2}/></ERow>
        <ERow label="Compromises " fullWidth><ETextarea value={delta.compromises} onChange={setDelta("compromises")} placeholder="What was compromised?" rows={2}/></ERow>
        {(delta.roadblocks||[]).length>0 && (
          <div style={{ marginTop:14 }}>
            <p style={{ fontSize:12, fontWeight:700, color:"#9CA3AF", fontFamily:F, textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:10 }}>Roadblocks ({delta.roadblocks.length})</p>
            {delta.roadblocks.map((r,i)=>(
              <EditRBCard key={i} rb={r} index={i} onChange={v=>setData(d=>{const rbs=[...d.delta.roadblocks];rbs[i]=v;return {...d,delta:{...d.delta,roadblocks:rbs}};})} onRemove={()=>remRb(i)}/>
            ))}
          </div>
        )}
        <button type="button" onClick={addRb} style={{ marginTop:10, padding:"8px 16px", background:"transparent", border:"1.5px dashed #FECACA", borderRadius:9, color:"#DC2626", fontSize:12, fontWeight:600, fontFamily:F, cursor:"pointer" }}>+ Add roadblock</button>
      </Section>

      {/* ── Reasoning ──────────────────────────────────────────────────────── */}
      <Section title="Decision Reasoning" emoji="🧠" color={STEP_COLORS.reasoning}>
        <ERow label="Why this structure" fullWidth><ETextarea value={reasoning.whyStructure} onChange={setRsn("whyStructure")} placeholder="Why did you build it this way?" rows={3}/></ERow>
        <ERow label="Alternatives" fullWidth><ETextarea value={reasoning.alternatives} onChange={setRsn("alternatives")} placeholder="What else was considered?" rows={2}/></ERow>
        <ERow label="Why rejected" fullWidth><ETextarea value={reasoning.whyRejected} onChange={setRsn("whyRejected")} placeholder="Why were alternatives rejected?" rows={2}/></ERow>
        <ERow label="Assumptions" fullWidth><ETextarea value={reasoning.assumptions} onChange={setRsn("assumptions")} placeholder="What assumptions were made?" rows={2}/></ERow>
        <ERow label="When NOT to use" fullWidth><ETextarea value={reasoning.whenOpposite} onChange={setRsn("whenOpposite")} placeholder="When would this approach be wrong?" rows={2}/></ERow>
        <ERow label="Lessons learned" fullWidth><ETextarea value={reasoning.lessons} onChange={setRsn("lessons")} placeholder="Key takeaways..." rows={2}/></ERow>
        <ERow label="Complexity"><EComplexity value={reasoning.complexity} onChange={setRsn("complexity")}/></ERow>
      </Section>

      {/* ── Outcome ────────────────────────────────────────────────────────── */}
      <Section title="Outcome Capture" emoji="✅" color={STEP_COLORS.outcome}>
        <ERow label="Did they build it"><EToggle value={outcome.built} options={["Yes","Partially","No"]} onChange={setOutcome("built")}/></ERow>
        <ERow label="Block reason" fullWidth><ETextarea value={outcome.blockReason} onChange={setOutcome("blockReason")} placeholder="What blocked the build?" rows={2}/></ERow>
        <ERow label="What changed" fullWidth><ETextarea value={outcome.changes} onChange={setOutcome("changes")} placeholder="What changed from the original plan?" rows={2}/></ERow>
        <ERow label="What worked" fullWidth><ETextarea value={outcome.whatWorked} onChange={setOutcome("whatWorked")} placeholder="What went well?" rows={2}/></ERow>
        <ERow label="What failed" fullWidth><ETextarea value={outcome.whatFailed} onChange={setOutcome("whatFailed")} placeholder="What didn't work?" rows={2}/></ERow>
        <ERow label="Satisfaction"><ESatisfaction value={outcome.satisfaction} onChange={setOutcome("satisfaction")}/></ERow>
        <ERow label="Would recommend"><EToggle value={outcome.recommend} options={["Yes","Maybe","No"]} onChange={setOutcome("recommend")}/></ERow>
        <ERow label="Revisit when" fullWidth><ETextarea value={outcome.revisitWhen} onChange={setOutcome("revisitWhen")} placeholder="When should this be revisited?" rows={2}/></ERow>
      </Section>

      <SaveBar/>
    </div>

    {/* ── Right sidebar ─────────────────────────────────────────────────── */}
    {w >= 1300 && (
      <div style={{ width:480, flexShrink:0, position:"sticky", top:24, paddingTop:28, paddingBottom:24, maxHeight:"calc(100vh - 48px)", overflowY:"auto" }}>

        {/* Project Updates */}
        <div style={{ background:"#fff", border:"1px solid #F0F0F0", borderRadius:14, padding:"16px 16px 12px", marginBottom:16, boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div>
              <p style={{ margin:0, fontSize:13, fontWeight:700, color:"#111827", fontFamily:F }}>Project Updates</p>
              <p style={{ margin:"2px 0 0", fontSize:11, color:"#9CA3AF", fontFamily:F }}>Timestamped notes & attachments</p>
            </div>
            <button type="button" onClick={addPu} style={{ fontSize:12, fontWeight:600, color:"#0284C7", background:"#E0F2FE", border:"1px solid #BAE6FD", borderRadius:8, padding:"6px 10px", cursor:"pointer", fontFamily:F, flexShrink:0 }}>+ Add</button>
          </div>
          {(projectUpdates||[]).length === 0
            ? <p style={{ fontSize:12, color:"#D1D5DB", fontFamily:F, textAlign:"center", padding:"12px 0", margin:0 }}>No updates yet</p>
            : (projectUpdates||[]).map((pu,i)=>(
                <EditProjectUpdateCard key={i} item={pu}
                  onChange={v=>setData(d=>{const items=[...(d.projectUpdates||[])];items[i]=v;return {...d,projectUpdates:items};})}
                  onRemove={()=>remPu(i)}/>
              ))
          }
        </div>

        {/* Scope Creep */}
        <div style={{ background:"#fff", border:"1px solid #F0F0F0", borderRadius:14, padding:"16px 16px 12px", boxShadow:"0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div>
              <p style={{ margin:0, fontSize:13, fontWeight:700, color:"#111827", fontFamily:F }}>Scope Creep</p>
              <p style={{ margin:"2px 0 0", fontSize:11, color:"#9CA3AF", fontFamily:F }}>Unplanned additions to the build</p>
            </div>
            <button type="button" onClick={addSc} style={{ fontSize:12, fontWeight:600, color:"#D97706", background:"#FEF3C7", border:"1px solid #FDE68A", borderRadius:8, padding:"6px 10px", cursor:"pointer", fontFamily:F, flexShrink:0 }}>+ Add</button>
          </div>
          {(delta.scopeCreep||[]).length === 0
            ? <p style={{ fontSize:12, color:"#D1D5DB", fontFamily:F, textAlign:"center", padding:"12px 0", margin:0 }}>No scope creep logged</p>
            : (delta.scopeCreep||[]).map((sc,i)=>(
                <EditScopeCreepCard key={i} item={sc} index={i}
                  onChange={v=>setData(d=>{const items=[...(d.delta.scopeCreep||[])];items[i]=v;return {...d,delta:{...d.delta,scopeCreep:items}};})}
                  onRemove={()=>remSc(i)}/>
              ))
          }
        </div>

      </div>
    )}
  </div>
  );
}

function ShareModal({ cf, onClose }) {
  const shareMutation = useShareCaseFile(cf.id);
  const [copied, setCopied] = useState(false);

  const shareUrl = cf.share_token
    ? `${window.location.origin}/brief/${cf.share_token}`
    : null;

  const handleToggle = () => {
    shareMutation.mutate();
    setCopied(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: 16,
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: 16, padding: "28px 32px",
        maxWidth: 480, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontFamily: "'Fraunces', serif" }}>Share client brief</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#9CA3AF", lineHeight: 1 }}>×</button>
        </div>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: "#6B7280", fontFamily: F, lineHeight: 1.6 }}>
          Generate a read-only link you can send to your client for sign-off. The link shows the workspace blueprint without any internal notes or account details.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <span style={{ fontSize: 13, fontFamily: F, color: "#374151", fontWeight: 600 }}>Sharing</span>
          <button
            onClick={handleToggle}
            disabled={shareMutation.isPending}
            style={{
              width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
              background: cf.share_enabled ? BLUE : "#D1D5DB",
              position: "relative", transition: "background 0.2s",
              flexShrink: 0,
            }}
          >
            <span style={{
              position: "absolute", top: 3, left: cf.share_enabled ? 22 : 3,
              width: 18, height: 18, borderRadius: "50%", background: "#fff",
              transition: "left 0.2s", display: "block",
            }} />
          </button>
          <span style={{ fontSize: 13, fontFamily: F, color: cf.share_enabled ? "#059669" : "#9CA3AF" }}>
            {cf.share_enabled ? "Active" : "Off"}
          </span>
        </div>
        {cf.share_enabled && shareUrl && (
          <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
            <input
              readOnly
              value={shareUrl}
              style={{
                flex: 1, fontFamily: F, fontSize: 12, color: "#374151",
                border: "1.5px solid #E5E7EB", borderRadius: 8, padding: "9px 12px",
                background: "#F9FAFB", outline: "none",
              }}
            />
            <button
              onClick={handleCopy}
              style={{
                padding: "9px 16px", borderRadius: 8, border: "none",
                background: copied ? "#059669" : BLUE,
                color: "#fff", fontSize: 13, fontWeight: 600,
                fontFamily: F, cursor: "pointer", whiteSpace: "nowrap",
                transition: "background 0.2s",
              }}
            >
              {copied ? "Copied!" : "Copy link"}
            </button>
          </div>
        )}
        {!cf.share_enabled && (
          <div style={{ padding: "12px 14px", background: "#F9FAFB", borderRadius: 8, border: "1px solid #E5E7EB" }}>
            <p style={{ margin: 0, fontSize: 13, color: "#9CA3AF", fontFamily: F }}>
              Enable sharing above to generate a link.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CaseFileDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const justCreated = location.state?.justCreated;

  const [isEditing, setIsEditing] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 900);
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);

  const { data: cf, isLoading, isError } = useCaseFile(id);
  const deleteMutation = useDeleteCaseFile();
  const updateMutation = useUpdateCaseFile(id);

  const handleDelete = async () => {
    if (!window.confirm("Delete this case file? This cannot be undone.")) return;
    await deleteMutation.mutateAsync(id);
    navigate("/case-files");
  };

  const handleEditSubmit = async (formData, enteredBy, caseName) => {
    setApiError(null);
    try {
      const payload = formStateToCaseFilePayload(formData, enteredBy, caseName || "");
      await updateMutation.mutateAsync(payload);
      setIsEditing(false);
    } catch (err) {
      const data = err.response?.data;
      setApiError(data ? JSON.stringify(data, null, 2) : "Save failed.");
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "#9CA3AF", fontFamily: F }}>
        Loading case file…
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ padding: 60, textAlign: "center" }}>
        <p style={{ color: "#EF4444", fontFamily: F, marginBottom: 16 }}>Failed to load case file.</p>
        <Link to="/case-files" style={{ color: BLUE, fontFamily: F }}>← Back to case files</Link>
      </div>
    );
  }

  if (isEditing) {
    return (
      <CaseFileEditView
        cf={cf}
        onSave={handleEditSubmit}
        onCancel={() => setIsEditing(false)}
        isSaving={updateMutation.isPending}
        apiError={apiError}
      />
    );
  }

  const { audit, intake, build, delta, reasoning, outcome, project_updates, } = cf;

  return (
    <>
    <style>{`
      .fp-print-only { display: none; }
      @media print {
        body * { visibility: hidden !important; }
        #fp-print-root, #fp-print-root * { visibility: visible !important; }
        #fp-print-root {
          position: absolute !important;
          top: 0 !important; left: 0 !important;
          width: 100% !important;
          padding: 24px 32px !important;
          margin: 0 !important;
          box-sizing: border-box !important;
        }
        .fp-no-print { display: none !important; }
        .fp-print-only { display: block !important; }
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @page { margin: 16mm 14mm; size: A4; }
        .fp-meta-chips { margin-bottom: 12px !important; }
        #fp-print-root { padding-bottom: 24px !important; }
      }
    `}</style>
    <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
    <div id="fp-print-root" style={{ flex: 1, minWidth: 0, maxWidth: 780, padding: "28px 32px 80px" }}>

      {/* Success banner */}
      {justCreated && (
        <div className="fp-no-print" style={{ padding: "12px 16px", background: "#ECFDF5", border: "1px solid #6EE7B7", borderRadius: 10, marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>✅</span>
          <span style={{ fontSize: 14, color: "#065F46", fontFamily: F, fontWeight: 600 }}>
            Case file saved successfully. It's now part of the knowledge base.
          </span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 14 }}>
        <div>
          <Link to="/case-files" className="fp-no-print" style={{ fontSize: 13, color: "#9CA3AF", fontFamily: F, textDecoration: "none", display: "flex", alignItems: "center", gap: 4, marginBottom: 10 }}>
            ← Case files
          </Link>
          <h1 style={{ margin: "0 0 6px", fontSize: 24, fontFamily: "'Fraunces', serif" }}>
            {cf.name || cf.workflow_type || "Untitled workflow"}
          </h1>
          {cf.name && cf.workflow_type && (
            <p style={{ margin: "0 0 6px", fontSize: 14, color: "#6B7280", fontFamily: F }}>{cf.workflow_type}</p>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 13, color: "#6B7280", fontFamily: F }}>
            <span>Logged by <strong style={{ color: "#374151" }}>{cf.logged_by_name || "—"}</strong></span>
            <span>·</span>
            <span>{formatDate(cf.created_at)}</span>
            {cf.satisfaction_score && (
              <>
                <span>·</span>
                <span>{cf.satisfaction_score}/5 satisfaction</span>
              </>
            )}
            {cf.roadblock_count > 0 && (
              <>
                <span>·</span>
                <span style={{ color: "#EA580C" }}>{cf.roadblock_count} roadblock{cf.roadblock_count !== 1 ? "s" : ""}</span>
              </>
            )}
          </div>
        </div>
        <div className="fp-no-print" style={{ display: "flex", gap: 8 }}>
          <button onClick={() => {
            const name = (cf.name || cf.workflow_type || "Case_File").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
            const date = new Date().toISOString().slice(0, 10);
            const prev = document.title;
            document.title = `${name}_${date}_Flowpath`;
            window.onafterprint = () => { document.title = prev; window.onafterprint = null; };
            window.print();
          }} style={{ padding: "9px 18px", background: "#fff", border: "1.5px solid #E5E7EB", borderRadius: 9, color: "#374151", fontSize: 13, fontWeight: 600, fontFamily: F, cursor: "pointer" }}>
            Export PDF
          </button>
          <button
            onClick={() => setShowShare(true)}
            style={{ padding: "9px 18px", background: "#fff", border: `1.5px solid ${cf.share_enabled ? BLUE : "#E5E7EB"}`, borderRadius: 9, color: cf.share_enabled ? BLUE : "#374151", fontSize: 13, fontWeight: 600, fontFamily: F, cursor: "pointer" }}
          >
            {cf.share_enabled ? "🔗 Shared" : "Share"}
          </button>
          <button onClick={() => setIsEditing(true)} style={{ padding: "9px 18px", background: BLUE, border: "none", borderRadius: 9, color: "#fff", fontSize: 13, fontWeight: 600, fontFamily: F, cursor: "pointer" }}>
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            style={{ padding: "9px 18px", background: "#fff", border: "1.5px solid #FECACA", borderRadius: 9, color: "#EF4444", fontSize: 13, fontWeight: 600, fontFamily: F, cursor: "pointer" }}
          >
            {deleteMutation.isPending ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>

      {/* Meta chips */}
      <div className="fp-meta-chips" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
        {cf.industries?.map(i => (
          <span key={i} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 12, background: "#EFF6FF", border: "1px solid #BFDBFE", color: BLUE, fontFamily: F, fontWeight: 500 }}>{i}</span>
        ))}
        {cf.tools?.slice(0, 6).map(t => (
          <span key={t} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 12, background: "#F3F4F6", border: "1px solid #E5E7EB", color: "#6B7280", fontFamily: F }}>{t}</span>
        ))}
        {cf.process_frameworks?.slice(0, 4).map(f => (
          <span key={f} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 12, background: "#F5F3FF", border: "1px solid #DDD6FE", color: "#7C3AED", fontFamily: F }}>{f}</span>
        ))}
      </div>

      {/* ── Print-only: Project Updates + Scope Creep (top of PDF) ──────── */}
      <div className="fp-print-only">
        {project_updates?.length > 0 && (
          <Section title="Project Updates" emoji="📝" color="#0284C7">
            {project_updates.map((pu, i) => {
              const dateLabel = pu.created_at
                ? (() => { const [y,m,d] = pu.created_at.slice(0,10).split("-"); return new Date(+y,+m-1,+d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); })()
                : "—";
              return (
                <div key={pu.id || i} style={{ border: "1.5px solid #BAE6FD", borderRadius: 10, marginBottom: 10, overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#F0F9FF", borderBottom: "1px solid #BAE6FD" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#0284C7", fontFamily: F }}>{dateLabel}</span>
                    {pu.attachments?.length > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: "#0284C7", background: "#E0F2FE", border: "1px solid #BAE6FD", borderRadius: 8, padding: "2px 8px", fontFamily: F }}>📎 {pu.attachments.length}</span>}
                  </div>
                  <div style={{ padding: "12px 14px" }}>
                    {pu.content && <p style={{ margin: 0, fontSize: 13, color: "#374151", fontFamily: F, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{pu.content}</p>}
                    {pu.attachments?.length > 0 && (
                      <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {pu.attachments.map((att, ai) => att.url && (
                          <span key={ai} style={{ fontSize: 12, color: "#0284C7", background: "#E0F2FE", border: "1px solid #BAE6FD", borderRadius: 8, padding: "3px 10px", fontFamily: F, fontWeight: 500 }}>
                            {att.name || att.url}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </Section>
        )}
        {delta?.scope_creep?.length > 0 && (
          <Section title="Scope Creep" emoji="📎" color="#D97706">
            {delta.scope_creep.map((sc, i) => (
              <div key={i} style={{ border: "1px solid #FDE68A", borderLeft: "3px solid #D97706", borderRadius: 10, padding: "12px 14px", marginBottom: 8, background: "#FFFBEB" }}>
                <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#92400E", fontFamily: F }}>{sc.area || `Item ${i + 1}`}</p>
                {sc.reason && <Row label="Why added" value={sc.reason} fullWidth />}
                {sc.impact && <Row label="Impact" value={sc.impact} fullWidth />}
                {sc.communicated != null && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em" }}>Communicated</span>
                    <span style={{ fontSize: 12, fontWeight: 700, fontFamily: F,
                      color: sc.communicated === true ? "#059669" : sc.communicated === false ? "#DC2626" : "#D97706",
                      background: sc.communicated === true ? "#ECFDF5" : sc.communicated === false ? "#FEF2F2" : "#FEF3C7",
                      border: `1px solid ${sc.communicated === true ? "#A7F3D0" : sc.communicated === false ? "#FECACA" : "#FDE68A"}`,
                      borderRadius: 8, padding: "2px 10px" }}>
                      {sc.communicated === true ? "Yes" : sc.communicated === false ? "No" : "Partially"}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </Section>
        )}
      </div>

      {/* ── Layer 1: Audit ──────────────────────────────────────────────── */}
      {audit && (
        <Section title="Current State Audit" emoji="🔍" color={STEP_COLORS.audit}>
          <Row label="Has existing setup" value={audit.has_existing === true ? "Yes" : audit.has_existing === false ? "No — greenfield" : "—"} />
          <Row label="Overall assessment" value={audit.overall_assessment} fullWidth />
          <Row label="Tried to fix before" value={audit.tried_to_fix === true ? "Yes" : audit.tried_to_fix === false ? "No" : null} />
          <Row label="Previous fixes" value={audit.previous_fixes} fullWidth />
          {audit.builds?.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                Builds audited ({audit.builds.length})
              </p>
              {audit.builds.map((b, i) => <CurrentBuildCard key={b.id} build={b} index={i} />)}
            </div>
          )}
          {audit.pattern_summary && (
            <div style={{ marginTop: 14, padding: "12px 14px", background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 8 }}>
              <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#EA580C", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em" }}>Pattern summary</p>
              <p style={{ margin: 0, fontSize: 13, color: "#92400E", fontFamily: F, lineHeight: 1.6 }}>{audit.pattern_summary}</p>
            </div>
          )}
        </Section>
      )}

      {/* ── Layer 2: Intake ─────────────────────────────────────────────── */}
      {intake && (
        <Section title="Scenario Intake" emoji="📋" color={STEP_COLORS.intake}>
          {intake.raw_prompt && (
            <div style={{ padding: "12px 14px", background: "#FAFAFA", border: "1px solid #F0F0F0", borderRadius: 8, marginBottom: 14 }}>
              <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em" }}>Raw prompt</p>
              <p style={{ margin: 0, fontSize: 14, color: "#374151", fontFamily: F, lineHeight: 1.7, fontStyle: "italic" }}>"{intake.raw_prompt}"</p>
            </div>
          )}
          <Row label="Team size" value={intake.team_size} />
          <Row label="Workflow type" value={intake.workflow_type} />
          {intake.industries?.length > 0 && (
            <div style={{ padding: "10px 0", borderBottom: "1px solid #F9FAFB" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Industries</span>
              <TagList items={intake.industries} color={BLUE} />
            </div>
          )}
          {intake.process_frameworks?.length > 0 && (
            <div style={{ padding: "10px 0", borderBottom: "1px solid #F9FAFB" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Frameworks</span>
              <TagList items={intake.process_frameworks} color="#7C3AED" />
            </div>
          )}
          {intake.tools?.length > 0 && (
            <div style={{ padding: "10px 0", borderBottom: "1px solid #F9FAFB" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Tools in use</span>
              <TagList items={intake.tools} color="#374151" />
            </div>
          )}
          {intake.pain_points?.length > 0 && (
            <div style={{ padding: "10px 0", borderBottom: "1px solid #F9FAFB" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Pain points</span>
              <TagList items={intake.pain_points} color="#DC2626" />
            </div>
          )}
          <Row label="Prior attempts" value={intake.prior_attempts} fullWidth />
        </Section>
      )}

      {/* ── Layer 3: Build ──────────────────────────────────────────────── */}
      {build && (
        <Section title="Build Documentation" emoji="🏗️" color={STEP_COLORS.build}>
          {build.workflows?.length > 0 ? build.workflows.map((wf, wi) => (
            <div key={wi} style={{ border: "1px solid #BAE6FD", borderRadius: 12, padding: "14px 16px", marginBottom: 14, background: "#F0F9FF" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ width: 24, height: 24, borderRadius: 6, background: "#0284C7", color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: F, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{wi + 1}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#0C4A6E", fontFamily: F }}>{wf.name || `Workflow ${wi + 1}`}</span>
              </div>
              {wf.notes && <p style={{ margin: "0 0 12px", fontSize: 13, color: "#374151", fontFamily: F, lineHeight: 1.6, fontStyle: "italic" }}>{wf.notes}</p>}
              {wf.lists?.length > 0 && wf.lists.map((l, li) => (
                <div key={li} style={{ border: "1px solid #0284C730", borderLeft: "3px solid #0284C7", borderRadius: 9, padding: "12px 14px", marginBottom: 8, background: "#fff" }}>
                  <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: "#0284C7", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em" }}>List {li + 1}{l.name ? ` — ${l.name}` : ""}</p>
                  <Row label="Status flow" value={l.statuses} />
                  {l.custom_fields && (
                    <div style={{ padding: "8px 0", borderBottom: "1px solid #F9FAFB" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 5 }}>Custom fields</span>
                      <pre style={{ margin: 0, fontSize: 12, color: "#374151", fontFamily: "monospace", background: "#F9FAFB", padding: "8px 10px", borderRadius: 7, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{l.custom_fields}</pre>
                    </div>
                  )}
                  {Array.isArray(l.automations) && l.automations.length > 0 && (
                    <div style={{ padding: "8px 0" }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Automations</span>
                      {l.automations.map((auto, ai) => (
                        <div key={ai} style={{ border: "1px solid #E5E7EB", borderLeft: "3px solid #0284C780", borderRadius: 8, padding: "12px 14px", marginBottom: 8, background: "#F9FAFB" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#0284C7", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em" }}>Automation {ai + 1}</p>
                            <span style={{ fontSize: 11, fontWeight: 600, color: (auto.platform||"clickup")==="clickup" ? "#0284C7" : "#7C3AED", background: (auto.platform||"clickup")==="clickup" ? "#EFF6FF" : "#F5F3FF", border: `1px solid ${(auto.platform||"clickup")==="clickup" ? "#BAE6FD" : "#DDD6FE"}`, borderRadius: 6, padding: "2px 8px", fontFamily: F }}>
                              {(auto.platform||"clickup")==="clickup" ? "ClickUp" : (auto.third_party_platform || "3rd Party")}
                            </span>
                          </div>
                          {auto.triggers?.length > 0 && (
                            <div style={{ marginBottom: 8 }}>
                              <span style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.05em" }}>Triggers</span>
                              {auto.triggers.map((t, ti) => t.type && (
                                <div key={ti} style={{ display: "flex", gap: 8, alignItems: "baseline", marginTop: 4 }}>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: "#0284C7", fontFamily: F, background: "#EFF6FF", border: "1px solid #BAE6FD", borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap" }}>{t.type}</span>
                                  {t.detail && <span style={{ fontSize: 12, color: "#374151", fontFamily: F }}>{t.detail}</span>}
                                </div>
                              ))}
                            </div>
                          )}
                          {(auto.platform||"clickup")==="clickup" && auto.actions?.length > 0 && (
                            <div style={{ marginBottom: auto.instructions ? 8 : 0 }}>
                              <span style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.05em" }}>Actions</span>
                              {auto.actions.map((a, ai2) => a.type && (
                                <div key={ai2} style={{ display: "flex", gap: 8, alignItems: "baseline", marginTop: 4 }}>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: "#059669", fontFamily: F, background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap" }}>{a.type}</span>
                                  {a.detail && <span style={{ fontSize: 12, color: "#374151", fontFamily: F }}>{a.detail}</span>}
                                </div>
                              ))}
                            </div>
                          )}
                          {auto.instructions && (
                            <div style={{ marginTop: 8 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                <span style={{ fontSize: 11, fontWeight: 600, color: "#6B7280", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                  {(auto.platform||"clickup")==="clickup" ? "Instructions" : "Actions / Instructions"}
                                </span>
                                {auto.use_agent && <span style={{ fontSize: 10, fontWeight: 700, color: "#7C3AED", background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 6, padding: "2px 7px", fontFamily: F, letterSpacing: "0.04em" }}>AGENT ON</span>}
                              </div>
                              <pre style={{ margin: 0, fontSize: 12, fontFamily: "monospace", background: "#1E1E2E", color: "#E2E8F0", padding: "10px 12px", borderRadius: 7, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{auto.instructions}</pre>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )) : (
            <p style={{ fontSize: 13, color: "#9CA3AF", fontFamily: F, fontStyle: "italic" }}>No workflows documented.</p>
          )}
          <Row label="Build notes" value={build.build_notes} fullWidth />
        </Section>
      )}

      {/* ── Layer 4: Delta ──────────────────────────────────────────────── */}
      {delta && (
        <Section title="Intent vs Reality" emoji="⚖️" color={STEP_COLORS.delta}>
          <Row label="User intent " value={delta.user_intent} fullWidth />
          <Row label="Success criteria " value={delta.success_criteria} fullWidth />
          <Row label="What was built " value={delta.actual_build} fullWidth />
          <Row label="Diverged" value={delta.diverged === true ? "Yes" : delta.diverged === false ? "No" : null} />
          <Row label="Divergence reason " value={delta.divergence_reason} fullWidth />
          <Row label="Compromises " value={delta.compromises} fullWidth />
          {delta.roadblocks?.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                Roadblocks ({delta.roadblocks.length})
              </p>
              {delta.roadblocks.map((r, i) => <RoadblockCard key={r.id} rb={r} index={i} />)}
            </div>
          )}
        </Section>
      )}

      {/* ── Layer 5: Reasoning ─────────────────────────────────────────── */}
      {reasoning && (
        <Section title="Decision Reasoning" emoji="🧠" color={STEP_COLORS.reasoning}>
          <Row label="Why this structure" value={reasoning.why_structure} fullWidth />
          <Row label="Alternatives considered" value={reasoning.alternatives} fullWidth />
          <Row label="Why rejected" value={reasoning.why_rejected} fullWidth />
          <Row label="Assumptions made" value={reasoning.assumptions} fullWidth />
          <Row label="When NOT to use" value={reasoning.when_opposite} fullWidth />
          <Row label="Lessons learned" value={reasoning.lessons} fullWidth />
          {reasoning.complexity && (
            <div style={{ padding: "10px 0" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Complexity</span>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <div key={n} style={{ width: 28, height: 28, borderRadius: 6, border: `2px solid ${reasoning.complexity >= n ? BLUE : "#E5E7EB"}`, background: reasoning.complexity >= n ? "#EFF6FF" : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: reasoning.complexity >= n ? BLUE : "#D1D5DB", fontSize: 12 }}>◆</span>
                  </div>
                ))}
                <span style={{ fontSize: 13, color: "#6B7280", fontFamily: F }}>
                  {["", "Very simple", "Simple", "Moderate", "Complex", "Very complex"][reasoning.complexity]}
                </span>
              </div>
            </div>
          )}
        </Section>
      )}

      {/* ── Layer 6: Outcome ───────────────────────────────────────────── */}
      {outcome && (
        <Section title="Outcome Capture" emoji="✅" color={STEP_COLORS.outcome}>
          <Row label="Did they build it" value={outcome.built ? outcome.built.charAt(0).toUpperCase() + outcome.built.slice(1) : null} />
          <Row label="Block reason" value={outcome.block_reason} fullWidth />
          <Row label="What changed" value={outcome.changes} fullWidth />
          <Row label="What worked" value={outcome.what_worked} fullWidth />
          <Row label="What failed" value={outcome.what_failed} fullWidth />
          <Row label="Revisit when" value={outcome.revisit_when} fullWidth />
          {outcome.satisfaction && (
            <div style={{ padding: "10px 0", borderBottom: "1px solid #F9FAFB" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 8 }}>Satisfaction</span>
              <SatisfactionStars score={outcome.satisfaction} />
            </div>
          )}
          <Row label="Would recommend" value={outcome.recommend ? outcome.recommend.charAt(0).toUpperCase() + outcome.recommend.slice(1) : null} />
        </Section>
      )}

    </div>

    {/* ── Right sidebar ─────────────────────────────────────────────────── */}
    {w >= 1300 && (
      <div className="fp-no-print" style={{ width: 480, flexShrink: 0, position: "sticky", top: 24, paddingTop: 28, paddingBottom: 24, maxHeight: "calc(100vh - 48px)", overflowY: "auto" }}>

        {/* Project Updates */}
        <div style={{ background: "#fff", border: "1px solid #F0F0F0", borderRadius: 14, padding: "16px 16px 12px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#111827", fontFamily: F }}>Project Updates</p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#9CA3AF", fontFamily: F }}>Timestamped notes & attachments</p>
          </div>
          {!project_updates?.length
            ? <p style={{ fontSize: 12, color: "#D1D5DB", fontFamily: F, textAlign: "center", padding: "12px 0", margin: 0 }}>No updates logged</p>
            : project_updates.map((pu, i) => {
                const dateLabel = pu.created_at
                  ? (() => { const [y,m,d] = pu.created_at.slice(0,10).split("-"); return new Date(+y,+m-1,+d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}); })()
                  : "—";
                return (
                  <div key={pu.id || i} style={{ border: "1.5px solid #BAE6FD", borderRadius: 10, marginBottom: 8, overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#F0F9FF", borderBottom: "1px solid #BAE6FD" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#0284C7", fontFamily: F }}>{dateLabel}</span>
                      {pu.attachments?.length > 0 && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#0284C7", background: "#E0F2FE", border: "1px solid #BAE6FD", borderRadius: 8, padding: "2px 8px", fontFamily: F }}>📎 {pu.attachments.length}</span>
                      )}
                    </div>
                    <div style={{ padding: "12px 14px", background: "#fff" }}>
                      {pu.content && <p style={{ margin: 0, fontSize: 13, color: "#374151", fontFamily: F, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{pu.content}</p>}
                      {pu.attachments?.length > 0 && (
                        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {pu.attachments.map((att, ai) => att.url && (
                            <a key={ai} href={att.url} target="_blank" rel="noopener noreferrer"
                              style={{ fontSize: 12, color: "#0284C7", background: "#E0F2FE", border: "1px solid #BAE6FD", borderRadius: 8, padding: "4px 12px", fontFamily: F, fontWeight: 500, textDecoration: "none" }}>
                              {att.name || att.url}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
          }
        </div>

        {/* Scope Creep */}
        <div style={{ background: "#fff", border: "1px solid #F0F0F0", borderRadius: 14, padding: "16px 16px 12px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <div style={{ marginBottom: 12 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#111827", fontFamily: F }}>Scope Creep</p>
            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#9CA3AF", fontFamily: F }}>Unplanned additions to the build</p>
          </div>
          {!delta?.scope_creep?.length
            ? <p style={{ fontSize: 12, color: "#D1D5DB", fontFamily: F, textAlign: "center", padding: "12px 0", margin: 0 }}>No scope creep logged</p>
            : delta.scope_creep.map((sc, i) => (
                <div key={i} style={{ border: "1px solid #FDE68A", borderLeft: "3px solid #D97706", borderRadius: 10, padding: "12px 14px", marginBottom: 8, background: "#FFFBEB" }}>
                  <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#92400E", fontFamily: F }}>{sc.area || `Item ${i + 1}`}</p>
                  {sc.reason && <Row label="Why added" value={sc.reason} fullWidth />}
                  {sc.impact && <Row label="Impact" value={sc.impact} fullWidth />}
                  {sc.communicated != null && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 6 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", fontFamily: F, textTransform: "uppercase", letterSpacing: "0.06em" }}>Communicated</span>
                      <span style={{ fontSize: 12, fontWeight: 700, fontFamily: F,
                        color: sc.communicated === true ? "#059669" : sc.communicated === false ? "#DC2626" : "#D97706",
                        background: sc.communicated === true ? "#ECFDF5" : sc.communicated === false ? "#FEF2F2" : "#FEF3C7",
                        border: `1px solid ${sc.communicated === true ? "#A7F3D0" : sc.communicated === false ? "#FECACA" : "#FDE68A"}`,
                        borderRadius: 8, padding: "2px 10px" }}>
                        {sc.communicated === true ? "Yes" : sc.communicated === false ? "No" : "Partially"}
                      </span>
                    </div>
                  )}
                </div>
              ))
          }
        </div>

      </div>
    )}
  </div>
    {showShare && <ShareModal cf={cf} onClose={() => setShowShare(false)} />}
  </>
  );
}
