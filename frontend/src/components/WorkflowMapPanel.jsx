import { useEffect, useMemo, useRef, useCallback, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";

const F = "'Plus Jakarta Sans', sans-serif";

// ── Custom node types ────────────────────────────────────────────────────────

function WorkflowNode({ data }) {
  const { wf } = data;
  return (
    <div style={{
      background: "#0284C7", border: "2px solid #0369A1", borderRadius: 10,
      padding: "10px 14px", minWidth: 220, maxWidth: 320, color: "#fff",
    }}>
      <Handle type="source" position={Position.Bottom} style={{ background: "#0369A1" }} />
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, fontFamily: F }}>
        {wf.name || "Workflow"}
      </p>
      {wf.notes && (
        <p style={{ margin: "4px 0 0", fontSize: 11, opacity: 0.85, fontFamily: F, lineHeight: 1.4, whiteSpace: "pre-wrap" }}>
          {wf.notes}
        </p>
      )}
      {wf.pipeline?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
          {wf.pipeline.map((p, i) => (
            <span key={i} style={{
              fontSize: 10, padding: "1px 6px",
              background: "rgba(255,255,255,0.2)", borderRadius: 4, fontFamily: F,
            }}>{p}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function ListNode({ data }) {
  const { list } = data;
  const statusChips = list.statuses
    ? list.statuses.split(/→|,/).map(s => s.trim()).filter(Boolean)
    : [];
  return (
    <div style={{
      background: "#E0F2FE", border: "1.5px solid #BAE6FD",
      borderLeft: "4px solid #0284C7", borderRadius: 9,
      padding: "10px 14px", minWidth: 200, maxWidth: 280,
    }}>
      <Handle type="target" position={Position.Top}    style={{ background: "#0284C7" }} />
      <Handle type="source" position={Position.Bottom} style={{ background: "#0284C7" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5, flexWrap: "wrap" }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#0369A1", fontFamily: F }}>
          {list.name || "Unnamed List"}
        </p>
        {list.space && (
          <span style={{
            fontSize: 10, fontWeight: 600, color: "#0284C7",
            background: "#BAE6FD", borderRadius: 4, padding: "1px 6px", fontFamily: F,
          }}>{list.space}</span>
        )}
      </div>
      {statusChips.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 3, alignItems: "center" }}>
          {statusChips.map((s, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <span style={{
                fontSize: 10, fontWeight: 600, color: "#0369A1",
                background: "#fff", border: "1px solid #BAE6FD",
                borderRadius: 4, padding: "1px 6px", fontFamily: F,
              }}>{s}</span>
              {i < statusChips.length - 1 && (
                <span style={{ fontSize: 9, color: "#93C5FD" }}>›</span>
              )}
            </span>
          ))}
        </div>
      )}
      {list.custom_fields && (
        <p style={{ margin: "5px 0 0", fontSize: 10, color: "#6B7280", fontFamily: F }}>
          + custom fields
        </p>
      )}
    </div>
  );
}

function AutomationNode({ data }) {
  const { auto, ai } = data;
  const isThirdParty  = (auto.platform || "clickup") === "third_party";
  const accent        = isThirdParty ? "#7C3AED" : "#0284C7";
  const bg            = isThirdParty ? "#F5F3FF" : "#F0F9FF";
  const border        = isThirdParty ? "#DDD6FE" : "#BAE6FD";
  const chipBg        = isThirdParty ? "#EDE9FE" : "#EFF6FF";
  const chipBorder    = isThirdParty ? "#C4B5FD" : "#BAE6FD";
  const platformLabel = isThirdParty ? (auto.third_party_platform || "3rd Party") : "ClickUp";
  return (
    <div style={{
      background: bg, border: `1.5px solid ${border}`,
      borderLeft: `4px solid ${accent}`,
      borderRadius: 8, padding: "10px 14px", minWidth: 190, maxWidth: 260,
    }}>
      <Handle type="target" position={Position.Top}    style={{ background: accent }} />
      <Handle type="source" position={Position.Bottom} style={{ background: accent }} />
      <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: accent, fontFamily: F, textAlign: "center" }}>
        Automation {ai + 1}
      </p>
      <div style={{ width: "100%", height: 1, background: `${accent}30`, marginBottom: 6 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
        <span style={{
          fontSize: 10, fontWeight: 700, color: accent, background: chipBg,
          border: `1px solid ${chipBorder}`, borderRadius: 4, padding: "1px 6px", fontFamily: F,
        }}>{platformLabel}</span>
        <span style={{
          fontSize: 10, fontWeight: 600, color: "#6B7280", background: "#F3F4F6",
          border: "1px solid #E5E7EB", borderRadius: 4, padding: "1px 6px", fontFamily: F,
        }}>Pipeline</span>
      </div>
      {auto.pipeline_phase && (
        <p style={{ margin: "4px 0 0", fontSize: 10, color: "#6B7280", fontFamily: F }}>
          Phase: {auto.pipeline_phase}
        </p>
      )}
    </div>
  );
}

function StandaloneAutoNode({ data }) {
  const { auto, ai } = data;
  const isThirdParty  = (auto.platform || "clickup") === "third_party";
  const platformLabel = isThirdParty ? (auto.third_party_platform || "3rd Party") : "ClickUp";
  return (
    <div style={{
      background: "#FFFBEB", border: "1.5px solid #FDE68A",
      borderLeft: "4px solid #D97706",
      borderRadius: 8, padding: "10px 14px", minWidth: 190, maxWidth: 260,
    }}>
      <Handle type="target" position={Position.Top}    style={{ background: "#D97706" }} />
      <Handle type="source" position={Position.Bottom} style={{ background: "#D97706" }} />
      <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: "#D97706", fontFamily: F, textAlign: "center" }}>
        Automation {ai + 1}
      </p>
      <div style={{ width: "100%", height: 1, background: "#D9770630", marginBottom: 6 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
        <span style={{
          fontSize: 10, fontWeight: 700, color: "#D97706",
          background: "#FEF3C7", border: "1px solid #FDE68A",
          borderRadius: 4, padding: "1px 6px", fontFamily: F,
        }}>{platformLabel}</span>
        <span style={{
          fontSize: 10, fontWeight: 600, color: "#92400E",
          background: "#FEF9C3", border: "1px solid #FDE68A",
          borderRadius: 4, padding: "1px 6px", fontFamily: F,
        }}>Standalone</span>
      </div>
      {auto.pipeline_phase && (
        <p style={{ margin: "4px 0 0", fontSize: 10, color: "#6B7280", fontFamily: F }}>
          Phase: {auto.pipeline_phase}
        </p>
      )}
    </div>
  );
}

function TriggerNode({ data }) {
  const { t } = data;
  return (
    <div style={{
      background: "#EFF6FF", border: "1.5px solid #BAE6FD",
      borderRadius: 8, padding: "8px 12px", minWidth: 150, maxWidth: 210,
    }}>
      <Handle type="target" position={Position.Top}    style={{ background: "#0284C7" }} />
      <Handle type="source" position={Position.Bottom} style={{ background: "#0284C7" }} />
      <p style={{
        margin: "0 0 3px", fontSize: 9, fontWeight: 700, color: "#6B7280",
        fontFamily: F, textTransform: "uppercase", letterSpacing: "0.05em",
      }}>Trigger</p>
      <span style={{
        fontSize: 11, fontWeight: 600, color: "#0284C7",
        background: "#EFF6FF", border: "1px solid #BAE6FD",
        borderRadius: 4, padding: "1px 6px", fontFamily: F,
      }}>{t.type}</span>
      {t.detail && (
        <p style={{ margin: "4px 0 0", fontSize: 10, color: "#374151", fontFamily: F, lineHeight: 1.4 }}>
          {t.detail.length > 80 ? t.detail.slice(0, 80) + "…" : t.detail}
        </p>
      )}
    </div>
  );
}

function ActionNode({ data }) {
  const { a } = data;
  return (
    <div style={{
      background: "#ECFDF5", border: "1.5px solid #A7F3D0",
      borderRadius: 8, padding: "8px 12px", minWidth: 150, maxWidth: 210,
    }}>
      <Handle type="target" position={Position.Top}    style={{ background: "#059669" }} />
      <Handle type="source" position={Position.Bottom} style={{ background: "#059669" }} />
      <p style={{
        margin: "0 0 3px", fontSize: 9, fontWeight: 700, color: "#6B7280",
        fontFamily: F, textTransform: "uppercase", letterSpacing: "0.05em",
      }}>Action</p>
      <span style={{
        fontSize: 11, fontWeight: 600, color: "#059669",
        background: "#ECFDF5", border: "1px solid #A7F3D0",
        borderRadius: 4, padding: "1px 6px", fontFamily: F,
      }}>{a.type}</span>
      {a.detail && (
        <p style={{ margin: "4px 0 0", fontSize: 10, color: "#374151", fontFamily: F, lineHeight: 1.4 }}>
          {a.detail.length > 80 ? a.detail.slice(0, 80) + "…" : a.detail}
        </p>
      )}
    </div>
  );
}

function InstructionNode({ data }) {
  return (
    <div style={{
      background: "#F5F3FF", border: "1.5px solid #DDD6FE",
      borderRadius: 8, padding: "8px 12px", minWidth: 150, maxWidth: 210,
    }}>
      <Handle type="target" position={Position.Top}    style={{ background: "#7C3AED" }} />
      <Handle type="source" position={Position.Bottom} style={{ background: "#7C3AED" }} />
      <p style={{
        margin: "0 0 3px", fontSize: 9, fontWeight: 700, color: "#6B7280",
        fontFamily: F, textTransform: "uppercase", letterSpacing: "0.05em",
      }}>Description</p>
      <p style={{ margin: 0, fontSize: 10, color: "#7C3AED", fontFamily: "monospace", lineHeight: 1.4 }}>
        {data.text}
      </p>
    </div>
  );
}

const NODE_TYPES = {
  workflowNode: WorkflowNode,
  listNode: ListNode,
  autoNode: AutomationNode,
  standaloneAutoNode: StandaloneAutoNode,
  triggerNode: TriggerNode,
  actionNode: ActionNode,
  instructionNode: InstructionNode,
};

// ── Graph builder ────────────────────────────────────────────────────────────
//
// Vertical order per automation group (creation order = top-to-bottom):
//   Auto node
//     ↓ WHEN
//   [Trigger 1]  [Trigger 2]  …  (same rank, side by side)
//     ↓ THEN
//   [Action 1]   [Action 2]  …  (same rank, side by side)
//   [Instructions]
//     ↓ automates
//   Auto node (next)
//
// "Exit nodes" from one group become the sources into the next auto so dagre
// keeps everything in the right vertical order.

function buildGraph(wf) {
  const rawNodes = [];
  const edges    = [];

  const edgeLabel = (text, color) => ({
    label: text,
    labelStyle: { fontSize: 9, fontFamily: F, fontWeight: 700, fill: color, textTransform: "uppercase", letterSpacing: "0.04em" },
    labelBgStyle: { fill: "#fff", fillOpacity: 0.85 },
    labelBgPadding: [2, 4],
    labelBgBorderRadius: 3,
  });

  const wfNotesLines = wf.notes ? Math.ceil(wf.notes.length / 36) : 0;
  const wfHeight = 52 + wfNotesLines * 15 + (wf.pipeline?.length > 0 ? 26 : 0);
  rawNodes.push({ id: "wf", type: "workflowNode", data: { wf }, width: 280, height: wfHeight });

  (wf.lists || []).forEach((list, li) => {
    const listId      = `list-${li}`;
    const statusCount = list.statuses ? list.statuses.split(/→|,/).filter(Boolean).length : 0;
    const listHeight  = 70 + Math.max(0, statusCount - 2) * 22;
    rawNodes.push({ id: listId, type: "listNode", data: { list, li }, width: 250, height: listHeight });
    edges.push({
      id: `e-wf-${listId}`, source: "wf", target: listId,
      type: "smoothstep", style: { stroke: "#0284C7", strokeWidth: 1.5 },
    });

    const autos = list.automations || [];

    // The nodes whose bottom connects to the NEXT auto node.
    // Starts as the list node; updated after each auto's group is built.
    let prevExits = [listId];

    autos.forEach((auto, ai) => {
      const autoId       = `auto-${li}-${ai}`;
      const isStandalone = auto.automation_mode === "standalone";
      const isTP         = (auto.platform || "clickup") === "third_party";

      rawNodes.push({
        id: autoId,
        type: isStandalone ? "standaloneAutoNode" : "autoNode",
        data: { auto, ai },
        width: 230, height: 80,
      });

      // Connect from previous group's exits → this auto (label on the middle edge)
      prevExits.forEach((exitId, ei) => {
        edges.push({
          id: `e-${exitId}-${autoId}`,
          source: exitId, target: autoId,
          type: "smoothstep",
          style: isStandalone
            ? { stroke: "#D9770680", strokeWidth: 1.5, strokeDasharray: "5 4" }
            : { stroke: "#0284C780", strokeWidth: 1.5 },
          ...(ei === Math.floor(prevExits.length / 2) ? edgeLabel("automates", "#0284C7") : {}),
        });
      });

      // Triggers (below auto) ─────────────────────────────────────────────────
      const validTriggers = (auto.triggers || []).filter(t => t.type);
      const trigIds = [];
      validTriggers.forEach((t, ti) => {
        const tId = `trigger-${li}-${ai}-${ti}`;
        trigIds.push(tId);
        rawNodes.push({ id: tId, type: "triggerNode", data: { t, ti }, width: 190, height: 75 });
        edges.push({
          id: `e-${autoId}-${tId}`,
          source: autoId, target: tId,
          type: "smoothstep", style: { stroke: "#60A5FA", strokeWidth: 1.5 },
          ...(ti === Math.floor(validTriggers.length / 2) ? edgeLabel("when", "#3B82F6") : {}),
        });
      });

      // Sources for actions/instructions = triggers (if any) else the auto itself
      const actionSources = trigIds.length > 0 ? trigIds : [autoId];

      // Actions (below triggers) ──────────────────────────────────────────────
      const validActions = !isTP ? (auto.actions || []).filter(a => a.type) : [];
      const actionIds = [];
      validActions.forEach((a, ai2) => {
        const aId = `action-${li}-${ai}-${ai2}`;
        actionIds.push(aId);
        rawNodes.push({ id: aId, type: "actionNode", data: { a, ai: ai2 }, width: 190, height: 75 });
        actionSources.forEach((srcId, si) => {
          edges.push({
            id: `e-${srcId}-${aId}-s${si}`,
            source: srcId, target: aId,
            type: "smoothstep", style: { stroke: "#34D399", strokeWidth: 1.5 },
            ...(si === Math.floor(actionSources.length / 2) ? edgeLabel("then", "#059669") : {}),
          });
        });
      });

      // Description node (below actions/triggers) — shown whenever instructions exist;
      // displays map_description if set, otherwise falls back to first non-comment line of instructions
      let instrId = null;
      if (auto.instructions?.trim()) {
        instrId = `instr-${li}-${ai}`;
        const fallback = (auto.instructions.split("\n").map(l => l.trim()).find(l => l && !l.startsWith("#")) || auto.instructions).slice(0, 90);
        const rawText = auto.map_description?.trim() || fallback;
        const instrText = rawText.length > 90 ? rawText.slice(0, 90) + "…" : rawText;
        rawNodes.push({ id: instrId, type: "instructionNode", data: { text: instrText }, width: 190, height: 80 });
        // Connect from actions (if any) else from action sources (triggers/auto)
        const instrSources = actionIds.length > 0 ? actionIds : actionSources;
        instrSources.forEach((srcId, si) => {
          edges.push({
            id: `e-${srcId}-${instrId}-s${si}`,
            source: srcId, target: instrId,
            type: "smoothstep", style: { stroke: "#C4B5FD", strokeWidth: 1.5 },
            ...(si === Math.floor(instrSources.length / 2) ? edgeLabel("automation", "#7C3AED") : {}),
          });
        });
      }

      // Update exits for the next auto ────────────────────────────────────────
      // Priority: instructions → actions → triggers → auto
      if (instrId)              prevExits = [instrId];
      else if (actionIds.length) prevExits = actionIds;
      else if (trigIds.length)   prevExits = trigIds;
      else                       prevExits = [autoId];
    });
  });

  // dagre layout
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", ranksep: 55, nodesep: 28 });
  rawNodes.forEach(n => g.setNode(n.id, { width: n.width, height: n.height }));
  edges.forEach(e => g.setEdge(e.source, e.target));
  dagre.layout(g);

  const nodes = rawNodes.map(n => {
    const { x, y } = g.node(n.id);
    return { ...n, position: { x: x - n.width / 2, y: y - n.height / 2 } };
  });

  return { nodes, edges };
}

// ── Panel component ──────────────────────────────────────────────────────────

export function WorkflowMapPanel({ workflow, onClose, asModal = false }) {
  const { nodes: initNodes, edges: initEdges } = useMemo(
    () => buildGraph(workflow),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workflow.name, (workflow.lists || []).length],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initEdges);
  const panelRef = useRef(null);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    const { nodes: n, edges: e } = buildGraph(workflow);
    setNodes(n);
    setEdges(e);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflow]);

  const slug = (workflow.name || "workflow").replace(/[^a-z0-9]/gi, "_").toLowerCase();

  const handleExportPng = useCallback(() => {
    if (!panelRef.current) return;
    toPng(panelRef.current, { backgroundColor: "#ffffff", pixelRatio: 2, skipFonts: true })
      .then(dataUrl => {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `${slug}_map.png`;
        a.click();
      });
  }, [slug]);

  const handleExportPdf = useCallback(() => {
    if (!panelRef.current) return;
    toPng(panelRef.current, { backgroundColor: "#ffffff", pixelRatio: 2, skipFonts: true })
      .then(dataUrl => {
        const img = new Image();
        img.src = dataUrl;
        img.onload = () => {
          const imgW = img.naturalWidth;
          const imgH = img.naturalHeight;
          const pdf = new jsPDF({
            orientation: imgW > imgH ? "landscape" : "portrait",
            unit: "px", format: [imgW, imgH],
          });
          pdf.addImage(dataUrl, "PNG", 0, 0, imgW, imgH);
          pdf.save(`${slug}_map.pdf`);
        };
      });
  }, [slug]);

  const panel = (
    <div ref={panelRef} style={{
      display: "flex", flexDirection: "column",
      height: asModal ? "min(88vh, 620px)" : "calc(100vh - 80px)",
      width: asModal ? "min(92vw, 820px)" : undefined,
      background: "#fff",
      border: asModal ? "none" : "1px solid #BAE6FD",
      borderRadius: 14, overflow: "hidden",
      boxShadow: asModal ? "0 8px 40px rgba(0,0,0,0.22)" : "0 2px 10px rgba(2,132,199,0.08)",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "11px 16px", background: "#0284C710",
        borderBottom: "1px solid #BAE6FD", flexShrink: 0,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 700, color: "#0284C7",
          background: "#E0F2FE", border: "1px solid #BAE6FD",
          borderRadius: 6, padding: "2px 8px", fontFamily: F, letterSpacing: "0.04em",
        }}>MAP</span>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: "#111827", fontFamily: F }}>
          {workflow.name || "Workflow"}
        </span>
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setExportOpen(o => !o)}
            style={{
              background: "none", border: "1px solid #BAE6FD", cursor: "pointer",
              fontSize: 11, color: "#0284C7", padding: "3px 9px",
              lineHeight: 1.4, borderRadius: 5, fontFamily: F, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 4,
            }}
          >
            Export <span style={{ fontSize: 9 }}>▾</span>
          </button>
          {exportOpen && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 10 }} onClick={() => setExportOpen(false)} />
              <div style={{
                position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 11,
                background: "#fff", border: "1px solid #BAE6FD", borderRadius: 7,
                boxShadow: "0 4px 16px rgba(2,132,199,0.12)", overflow: "hidden", minWidth: 110,
              }}>
                {[
                  { label: "Export PNG", action: () => { handleExportPng(); setExportOpen(false); } },
                  { label: "Export PDF", action: () => { handleExportPdf(); setExportOpen(false); } },
                ].map(({ label, action }) => (
                  <button key={label} onClick={action} style={{
                    display: "block", width: "100%", textAlign: "left",
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 11, color: "#111827", fontFamily: F, fontWeight: 500,
                    padding: "7px 12px",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#F0F9FF"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}
                  >{label}</button>
                ))}
              </div>
            </>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 16, color: "#9CA3AF", padding: "2px 6px",
            lineHeight: 1, borderRadius: 4, fontFamily: F,
          }}
          title="Close map"
        >✕</button>
      </div>

      {/* Legend */}
      <div style={{
        display: "flex", gap: 12, padding: "7px 14px",
        borderBottom: "1px solid #F0F9FF", background: "#FAFAFA",
        flexShrink: 0, flexWrap: "wrap",
      }}>
        {[
          { color: "#0284C7",   label: "List" },
          { color: "#0284C780", label: "Pipeline auto" },
          { color: "#D9770680", label: "Standalone auto", dashed: true },
          { color: "#60A5FA",   label: "When (trigger)" },
          { color: "#34D399",   label: "Then (action)" },
          { color: "#DDD6FE",   label: "Description" },
        ].map(({ color, label, dashed }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            {dashed
              ? <div style={{ width: 14, height: 2, borderTop: `2px dashed ${color}`, flexShrink: 0 }} />
              : <div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
            }
            <span style={{ fontSize: 10, color: "#6B7280", fontFamily: F }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Canvas */}
      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={NODE_TYPES}
          fitView
          fitViewOptions={{ padding: 0.18 }}
          minZoom={0.2}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
        >
          <Background color="#E0F2FE" gap={18} size={1} />
          <Controls showInteractive={false} style={{ bottom: 12, left: 12 }} />
        </ReactFlow>
      </div>
    </div>
  );

  if (asModal) {
    return (
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        {panel}
      </div>
    );
  }

  return panel;
}
