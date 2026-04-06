import { useParams, useNavigate } from "react-router-dom";
import { useCaseFile, useUpdateCaseFile } from "../../hooks/useCaseFiles";
import { formStateToCaseFilePayload, caseFileToFormState, briefToSuggestedAutomations } from "../../utils/transforms";
import CaseFileForm from "../../components/CaseFileForm";
import { useState } from "react";
import { useTheme } from "../../hooks/useTheme";
import { useBriefByCaseFile } from "../../hooks/useWorkflows";

const F = "'Plus Jakarta Sans', sans-serif";

export default function EditCaseFilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { data: caseFile, isLoading, isError } = useCaseFile(id);
  const updateMutation = useUpdateCaseFile(id);
  const { data: linkedBrief } = useBriefByCaseFile(id);
  const [apiError, setApiError] = useState(null);

  const handleSubmit = async (formData, enteredBy, caseName) => {
    setApiError(null);
    try {
      const payload = formStateToCaseFilePayload(formData, enteredBy, caseName || "");
      await updateMutation.mutateAsync(payload);
      navigate(`/case-files/${id}`, { state: { justUpdated: true } });
    } catch (err) {
      const data = err.response?.data;
      setApiError(data ? JSON.stringify(data, null, 2) : "Save failed.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: theme.textFaint, fontFamily: F }}>
        Loading…
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: "#EF4444", fontFamily: F }}>
        Failed to load case file.
      </div>
    );
  }

  const initialData = caseFileToFormState(caseFile);
  const suggestedAutomations = linkedBrief ? briefToSuggestedAutomations(linkedBrief) : [];

  return (
    <div>
      {apiError && (
        <div style={{
          margin: "0 32px", marginTop: 24, padding: "14px 18px",
          background: theme.surface, border: "1px solid #FECACA", borderRadius: 10,
          fontSize: 13, color: "#DC2626", fontFamily: F, whiteSpace: "pre-wrap",
        }}>
          <strong>Save failed:</strong> {apiError}
        </div>
      )}
      <CaseFileForm
        initialData={initialData}
        initialName={caseFile.name || ""}
        initialEnteredBy={caseFile.logged_by_name || ""}
        onSubmit={handleSubmit}
        isSaving={updateMutation.isPending}
        isEditing
        onCancel={() => navigate(`/case-files/${id}`)}
        suggestedAutomations={suggestedAutomations}
      />
    </div>
  );
}
