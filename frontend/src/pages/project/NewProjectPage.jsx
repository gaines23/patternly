import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCreateProject } from "@hooks/useProjects";
import { formToProjectPayload, briefToFormState, briefToSuggestedAutomations } from "../../utils/transforms";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { useGeneratedBrief, useMarkBriefConverted } from "../../hooks/useWorkflows";

import ProjectForm from "@components/ProjectForm";

export default function NewCaseFilePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { theme } = useTheme();
  const createMutation = useCreateProject();
  const markConverted = useMarkBriefConverted();

  const briefId = location.state?.briefId || null;
  const { data: sourceBrief, isLoading: briefLoading } = useGeneratedBrief(briefId);

  const [apiError, setApiError] = useState(null);

  const handleSubmit = async (formData, enteredBy, caseName) => {
    setApiError(null);
    try {
      const payload = formToProjectPayload(
        formData,
        enteredBy || user?.full_name || user?.email || "",
        caseName || "",
      );
      const result = await createMutation.mutateAsync(payload);

      // Link the generated brief to the new project
      if (briefId) {
        markConverted.mutate({ briefId, caseFileId: result.id });
      }

      navigate(`/projects/${result.id}`, {
        state: { justCreated: true },
      });
    } catch (err) {
      const data = err.response?.data;
      const msg = data
        ? JSON.stringify(data, null, 2)
        : "Failed to save. Please check your connection and try again.";
      setApiError(msg);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Wait for brief to load before rendering the form so initialData is stable
  if (briefId && briefLoading) {
    return (
      <div style={{ padding: 48, textAlign: "center", fontFamily: "'Plus Jakarta Sans', sans-serif", color: theme.textMuted, fontSize: 14 }}>
        Loading recommendation...
      </div>
    );
  }

  const initialData = sourceBrief ? briefToFormState(sourceBrief) : undefined;
  const suggestedAutomations = sourceBrief ? briefToSuggestedAutomations(sourceBrief) : [];

  const initialName = sourceBrief
    ? [
        sourceBrief.parsed_scenario?.client_name,
        sourceBrief.parsed_scenario?.workflow_type,
      ].filter(Boolean).join(" — ")
    : "";

  return (
    <div>
      {briefId && sourceBrief && (
        <div style={{
          margin: "24px 32px 0",
          padding: "12px 16px",
          background: "#EFF6FF",
          border: "1px solid #BFDBFE",
          borderRadius: 10,
          fontSize: 13,
          color: "#1D4ED8",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}>
          Pre-filled from your AI recommendation. Fill in the audit, delta, and outcome layers to complete the project.
        </div>
      )}
      {apiError && (
        <div style={{
          margin: "16px 32px 0",
          padding: "14px 18px",
          background: theme.surface,
          border: "1px solid #FECACA",
          borderRadius: 10,
          fontSize: 13,
          color: "#DC2626",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          whiteSpace: "pre-wrap",
        }}>
          <strong>Save failed:</strong> {apiError}
        </div>
      )}
      <ProjectForm
        onSubmit={handleSubmit}
        isSaving={createMutation.isPending}
        initialEnteredBy={user?.full_name || user?.email || ""}
        initialData={initialData}
        initialName={initialName}
        hideRawPrompt={!!briefId}
        suggestedAutomations={suggestedAutomations}
      />
    </div>
  );
}
