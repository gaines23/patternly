import { useEffect, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
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
        <p style={{ margin: "4px 0 0", fontSize: 11, opacity: 0.85, fontFamily: F, lineHeight: 1.4 }}>
          {wf.notes.length > 90 ? wf.notes.slice(0, 90) + "…" : wf.notes}
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
  const { list, li } = data;
  return (
    <div style={{
      background: "#E0F2FE", border: "1.5px solid #BAE6FD",
      borderLeft: "3px solid #0284C7", borderRadius: 9,
      padding: "10px 14px", minWidth: 180, maxWidth: 260,
    }}>
      <Handle type="target" position={Position.Top} style={{ background: "#0284C7" }} />
      <Handle type="source" position={Position.Bottom} style={{ background: "#0284C7" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#0284C7", fontFamily: F }}>
          List {li + 1}{list.name ? ` — ${list.name}` : ""}
        </p>
        {list.space && (
          <span style={{
            fontSize: 10, fontWeight: 600, color: "#0284C7",
            background: "#BAE6FD", borderRadius: 4, padding: "1px 6px", fontFamily: F,
          }}>{list.space}</span>
        )}
      </div>
      {list.statuses && (
        <p style={{ margin: "4px 0 0", fontSize: 11, color: "#374151", fontFamily: F, lineHeight: 1.4 }}>
          {list.statuses.length > 70 ? list.statuses.slice(0, 70) + "…" : list.statuses}
        </p>
      )}
    </div>
  );
}

function AutomationNode({ data }) {
  const { auto, ai } = data;
  const isThirdParty = (auto.platform || "clickup") === "third_party";
  const accent = isThirdParty ? "#7C3AED" : "#0284C7";
  const bg = isThirdParty ? "#F5F3FF" : "#F0F9FF";
  const border = isThirdParty ? "#DDD6FE" : "#BAE6FD";
  const chipBg = isThirdParty ? "#EDE9FE" : "#EFF6FF";
  const chipBorder = isThirdParty ? "#C4B5FD" : "#BAE6FD";
  return (
    <div style={{
      background: bg, border: `1.5px solid ${border}`,
      borderLeft: `3px solid ${accent}80`,
      borderRadius: 8, padding: "10px 14px", minWidth: 170, maxWidth: 240,
    }}>
      <Handle type="target" position={Position.Top} style={{ background: accent }} />
      <Handle type="source" position={Position.Bottom} style={{ background: accent }} />
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: accent, fontFamily: F }}>
          Auto {ai + 1}
        </p>
        <span style={{
          fontSize: 10, fontWeight: 600, color: accent, background: chipBg,
          border: `1px solid ${chipBorder}`, borderRadius: 4, padding: "1px 6px", fontFamily: F,
        }}>
          {isThirdParty ? (auto.third_party_platform || "3rd Party") : "ClickUp"}
        </span>
      </div>
      {auto.pipeline_phase && (
        <p style={{ margin: 0, fontSize: 10, color: "#6B7280", fontFamily: F }}>
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
      borderRadius: 8, padding: "8px 12px", minWidth: 130, maxWidth: 200,
    }}>
      <Handle type="target" position={Position.Top} style={{ background: "#0284C7" }} />
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
          {t.detail.length > 60 ? t.detail.slice(0, 60) + "…" : t.detail}
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
      borderRadius: 8, padding: "8px 12px", minWidth: 130, maxWidth: 200,
    }}>
      <Handle type="target" position={Position.Top} style={{ background: "#059669" }} />
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
          {a.detail.length > 60 ? a.detail.slice(0, 60) + "…" : a.detail}
        </p>
      )}
    </div>
  );
}

function StandaloneAutoNode({ data }) {
  const { auto, ai } = data;
  return (
    <div style={{
      background: "#FFFBEB", border: "1.5px solid #FDE68A",
      borderLeft: "3px solid #D9770680",
      borderRadius: 8, padding: "10px 14px", minWidth: 170, maxWidth: 240,
    }}>
      <Handle type="target" position={Position.Top} style={{ background: "#D97706" }} />
      <Handle type="source" position={Position.Bottom} style={{ background: "#D97706" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#D97706", fontFamily: F }}>
          Auto {ai + 1}
        </p>
        <span style={{
          fontSize: 10, fontWeight: 600, color: "#D97706",
          background: "#FEF3C7", border: "1px solid #FDE68A",
          borderRadius: 4, padding: "1px 6px", fontFamily: F,
        }}>Standalone</span>
      </div>
      {auto.pipeline_phase && (
        <p style={{ margin: 0, fontSize: 10, color: "#6B7280", fontFamily: F }}>
          Phase: {auto.pipeline_phase}
        </p>
      )}
    </div>
  );
}

function InstructionNode({ data }) {
  return (
    <div style={{
      background: "#F5F3FF", border: "1.5px solid #DDD6FE",
      borderRadius: 8, padding: "8px 12px", minWidth: 130, maxWidth: 200,
    }}>
      <Handle type="target" position={Position.Top} style={{ background: "#7C3AED" }} />
      <p style={{
        margin: "0 0 3px", fontSize: 9, fontWeight: 700, color: "#6B7280",
        fontFamily: F, textTransform: "uppercase", letterSpacing: "0.05em",
      }}>Instructions</p>
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

// ── Graph builder + dagre layout ────────────────────────────────────────────

function buildGraph(wf) {
  const rawNodes = [];
  const edges = [];

  rawNodes.push({ id: "wf", type: "workflowNode", data: { wf }, width: 260, height: 80 });

  (wf.lists || []).forEach((list, li) => {
    const listId = `list-${li}`;
    rawNodes.push({ id: listId, type: "listNode", data: { list, li }, width: 230, height: 70 });
    edges.push({
      id: `e-wf-${listId}`, source: "wf", target: listId,
      type: "smoothstep", style: { stroke: "#0284C7", strokeWidth: 1.5 },
    });

    const autos = list.automations || [];
    const pipelineAutos = autos.map((a, ai) => ({ a, ai })).filter(({ a }) => (a.automation_mode || "pipeline") !== "standalone");
    const standaloneAutos = autos.map((a, ai) => ({ a, ai })).filter(({ a }) => a.automation_mode === "standalone");

    autos.forEach((auto, ai) => {
      const isStandalone = auto.automation_mode === "standalone";
      rawNodes.push({ id: `auto-${li}-${ai}`, type: isStandalone ? "standaloneAutoNode" : "autoNode", data: { auto, ai }, width: 210, height: 75 });
    });

    // Pipeline autos: chain list → A0 → A1 → A2
    pipelineAutos.forEach(({ a, ai }, pipelineIdx) => {
      const autoId = `auto-${li}-${ai}`;
      const sourceId = pipelineIdx === 0 ? listId : `auto-${li}-${pipelineAutos[pipelineIdx - 1].ai}`;
      edges.push({
        id: `e-${sourceId}-${autoId}`, source: sourceId, target: autoId,
        type: "smoothstep", style: { stroke: "#0284C780", strokeWidth: 1.5 },
      });
    });

    // Standalone autos: branch directly from list with a dashed edge
    standaloneAutos.forEach(({ a, ai }) => {
      const autoId = `auto-${li}-${ai}`;
      edges.push({
        id: `e-${listId}-sa-${ai}`, source: listId, target: autoId,
        type: "smoothstep", style: { stroke: "#D9770680", strokeWidth: 1.5, strokeDasharray: "5 4" },
      });
    });

    autos.forEach((auto, ai) => {
      const autoId = `auto-${li}-${ai}`;
      const isThirdParty = (auto.platform || "clickup") === "third_party";

      // Add trigger nodes, connected from the automation
      const validTriggerIds = [];
      (auto.triggers || []).forEach((t, ti) => {
        if (!t.type) return;
        const tId = `trigger-${li}-${ai}-${ti}`;
        validTriggerIds.push(tId);
        rawNodes.push({ id: tId, type: "triggerNode", data: { t, ti }, width: 170, height: 70 });
        edges.push({
          id: `e-${autoId}-${tId}`, source: autoId, target: tId,
          type: "smoothstep", style: { stroke: "#BAE6FD", strokeWidth: 1.5 },
        });
      });

      // Actions connect to their paired trigger by index (extras go to the last trigger).
      // If there are no triggers, actions connect to the automation node itself.
      const validActions = (!isThirdParty ? (auto.actions || []).filter(a => a.type) : []);
      validActions.forEach((a, ai2) => {
        const aId = `action-${li}-${ai}-${ai2}`;
        const pairedTrigIdx = Math.min(ai2, validTriggerIds.length - 1);
        const sourceId = validTriggerIds.length > 0 ? validTriggerIds[pairedTrigIdx] : autoId;
        rawNodes.push({ id: aId, type: "actionNode", data: { a, ai: ai2 }, width: 170, height: 70 });
        edges.push({
          id: `e-${sourceId}-${aId}`, source: sourceId, target: aId,
          type: "smoothstep", style: { stroke: "#A7F3D0", strokeWidth: 1.5 },
        });
      });

      // If there are instructions, show them as a node connected from the last trigger
      const hasInstructions = auto.instructions?.trim();
      if (hasInstructions) {
        const instrId = `instr-${li}-${ai}`;
        const instrText = auto.instructions.length > 70 ? auto.instructions.slice(0, 70) + "…" : auto.instructions;
        const sourceId = validTriggerIds.length > 0 ? validTriggerIds[validTriggerIds.length - 1] : autoId;
        rawNodes.push({ id: instrId, type: "instructionNode", data: { text: instrText }, width: 170, height: 75 });
        edges.push({
          id: `e-${sourceId}-${instrId}`, source: sourceId, target: instrId,
          type: "smoothstep", style: { stroke: "#DDD6FE", strokeWidth: 1.5 },
        });
      }
    });
  });

  // dagre layout
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", ranksep: 55, nodesep: 22 });
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

  useEffect(() => {
    const { nodes: n, edges: e } = buildGraph(workflow);
    setNodes(n);
    setEdges(e);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflow]);

  const panel = (
    <div style={{
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
          { color: "#0284C7", label: "List" },
          { color: "#0284C780", label: "Pipeline auto" },
          { color: "#D9770680", label: "Standalone auto", dashed: true },
          { color: "#BAE6FD", label: "Trigger" },
          { color: "#A7F3D0", label: "Action" },
          { color: "#DDD6FE", label: "Instructions" },
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
