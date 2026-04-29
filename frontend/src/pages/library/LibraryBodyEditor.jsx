import { Input } from "@components/ui";
import { useTheme } from "../../hooks/useTheme";
import { F } from "./constants";

/**
 * Body editor that adapts to the item's `kind`. Each kind stores a free-form
 * JSON object so we can grow the schema per-kind without backend migrations.
 *
 * formula            → { expression, inputs, output }
 * automation         → { trigger, conditions, actions, notes }
 * custom_field_set   → { fields: [{ name, type, options }] }
 * template           → { summary, steps, links }
 * integration_recipe → { source, destination, mapping, notes }
 * snippet            → { content }
 */
export default function LibraryBodyEditor({ kind, value, onChange }) {
  const { theme } = useTheme();
  const v = value || {};
  const set = (patch) => onChange({ ...v, ...patch });

  if (kind === "formula") {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <Input
          as="textarea"
          label="Expression"
          placeholder="e.g. IF(DATEDIF(NOW(),{Due Date},'D')<0, 'Overdue', '')"
          value={v.expression || ""}
          onChange={e => set({ expression: e.target.value })}
          rows={4}
          inputStyle={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}
        />
        <Input
          label="Inputs"
          helper="What fields/columns does this formula reference?"
          placeholder="Due Date, Status"
          value={v.inputs || ""}
          onChange={e => set({ inputs: e.target.value })}
        />
        <Input
          label="Output"
          placeholder="Text label, number, boolean…"
          value={v.output || ""}
          onChange={e => set({ output: e.target.value })}
        />
      </div>
    );
  }

  if (kind === "automation") {
    // Read instructions from new `body.instructions` (or legacy `body.notes` if older).
    const instructions = v.instructions ?? v.notes ?? "";
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <Input
          label="Trigger"
          placeholder="When status changes to In Review"
          value={v.trigger || ""}
          onChange={e => set({ trigger: e.target.value })}
        />
        <Input
          as="textarea"
          label="Conditions"
          placeholder="Optional conditions; one per line"
          value={v.conditions || ""}
          onChange={e => set({ conditions: e.target.value })}
          rows={3}
        />
        <Input
          as="textarea"
          label="Actions"
          placeholder="Send Slack message to #design with a link to the task"
          value={v.actions || ""}
          onChange={e => set({ actions: e.target.value })}
          rows={3}
        />
        <Input
          as="textarea"
          label="Instructions"
          helper="Agent / automation instructions"
          placeholder="Describe the logic for this automation, step by step"
          value={instructions}
          onChange={e => set({ instructions: e.target.value, notes: undefined })}
          rows={6}
          inputStyle={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}
        />
      </div>
    );
  }

  if (kind === "custom_field_set") {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <Input
          as="textarea"
          label="Fields"
          helper="One per line. Format: Name | type | options"
          placeholder={`Priority | dropdown | Low, Medium, High\nLaunch Date | date\nOwner | user`}
          value={v.fields_text || ""}
          onChange={e => set({ fields_text: e.target.value })}
          rows={5}
        />
      </div>
    );
  }

  if (kind === "template") {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <Input
          as="textarea"
          label="Summary"
          placeholder="What does this template set up?"
          value={v.summary || ""}
          onChange={e => set({ summary: e.target.value })}
          rows={2}
        />
        <Input
          as="textarea"
          label="Steps"
          placeholder="One step per line"
          value={v.steps || ""}
          onChange={e => set({ steps: e.target.value })}
          rows={5}
        />
        <Input
          label="Links"
          helper="Optional URLs to the template, docs, or screenshots — comma-separated"
          placeholder="https://…"
          value={v.links || ""}
          onChange={e => set({ links: e.target.value })}
        />
      </div>
    );
  }

  if (kind === "integration_recipe") {
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input
            label="Source"
            placeholder="ClickUp"
            value={v.source || ""}
            onChange={e => set({ source: e.target.value })}
          />
          <Input
            label="Destination"
            placeholder="Slack"
            value={v.destination || ""}
            onChange={e => set({ destination: e.target.value })}
          />
        </div>
        <Input
          as="textarea"
          label="Mapping"
          placeholder="ClickUp `Status` → Slack `:status:` emoji"
          value={v.mapping || ""}
          onChange={e => set({ mapping: e.target.value })}
          rows={3}
        />
        <Input
          as="textarea"
          label="Notes"
          placeholder="Auth, rate limits, edge cases"
          value={v.notes || ""}
          onChange={e => set({ notes: e.target.value })}
          rows={2}
        />
      </div>
    );
  }

  // snippet (default)
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <Input
        as="textarea"
        label="Content"
        placeholder="Paste the snippet, JSON config, or text block here."
        value={v.content || ""}
        onChange={e => set({ content: e.target.value })}
        rows={8}
        inputStyle={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}
      />
    </div>
  );
}
