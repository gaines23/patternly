import { useParams, useNavigate } from "react-router-dom";
import { useProject, useUpdateProject } from "@hooks/useProjects";
import { formToProjectPayload, projectToFormState, briefToSuggestedAutomations } from "../../utils/transforms";
import ProjectForm from "@components/ProjectForm";
import { useState } from "react";
import { useTheme } from "../../hooks/useTheme";
import { useBriefByProject } from "../../hooks/useWorkflows";

export default function EditCaseFilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { data: caseFile, isLoading, isError } = useProject(id);
  const updateMutation = useUpdateProject(id);
  const { data: linkedBrief } = useBriefByProject(id);
  const [apiError, setApiError] = useState(null);

  const handleSubmit = async (formData, enteredBy, caseName) => {
    setApiError(null);
    try {
      const payload = formToProjectPayload(formData, enteredBy, caseName || "");
      await updateMutation.mutateAsync(payload);
      navigate(`/projects/${id}`, { state: { justUpdated: true } });
    } catch {
      setApiError("Something went wrong while saving. Please try again — if the issue continues, check your connection or contact support.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: 48, textAlign: "center", fontFamily: "'Plus Jakarta Sans', sans-serif", color: theme.textMuted, fontSize: 14 }}>
        Loading project...
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ padding: 48, textAlign: "center", fontFamily: "'Plus Jakarta Sans', sans-serif", color: "#EF4444", fontSize: 14 }}>
        Failed to load project.
      </div>
    );
  }

  const initialData = projectToFormState(caseFile);
  const suggestedAutomations = linkedBrief ? briefToSuggestedAutomations(linkedBrief) : [];

  return (
    <div>
      <div style={{
        margin: "24px 32px 0",
        padding: "12px 16px",
        background: theme.surfaceAlt,
        border: `1px solid ${theme.border}`,
        borderRadius: 10,
        fontSize: 13,
        color: theme.textMuted,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        Editing existing project. The scenario prompt is hidden — update the audit, build, and outcome layers as needed.
      </div>
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
        }}>
          <strong>Heads up —</strong> {apiError}
        </div>
      )}
      <ProjectForm
        initialData={initialData}
        initialName={caseFile.name || ""}
        initialEnteredBy={caseFile.logged_by_name || ""}
        onSubmit={handleSubmit}
        isSaving={updateMutation.isPending}
        isEditing
        hideRawPrompt
        onCancel={() => navigate(`/projects/${id}`)}
        suggestedAutomations={suggestedAutomations}
      />
    </div>
  );
}
