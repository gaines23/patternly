import { useParams, useNavigate } from "react-router-dom";
import { useCaseFile, useUpdateCaseFile } from "../../hooks/useCaseFiles";
import { formStateToCaseFilePayload, caseFileToFormState } from "../../utils/transforms";
import CaseFileForm from "../../components/CaseFileForm";
import { useState } from "react";

const F = "'Plus Jakarta Sans', sans-serif";

export default function EditCaseFilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: caseFile, isLoading, isError } = useCaseFile(id);
  const updateMutation = useUpdateCaseFile(id);
  const [apiError, setApiError] = useState(null);

  const handleSubmit = async (formData, enteredBy) => {
    setApiError(null);
    try {
      const payload = formStateToCaseFilePayload(formData, enteredBy);
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
      <div style={{ padding: 60, textAlign: "center", color: "#9CA3AF", fontFamily: F }}>
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

  return (
    <div>
      {apiError && (
        <div style={{
          margin: "0 32px", marginTop: 24, padding: "14px 18px",
          background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10,
          fontSize: 13, color: "#DC2626", fontFamily: F, whiteSpace: "pre-wrap",
        }}>
          <strong>Save failed:</strong> {apiError}
        </div>
      )}
      <CaseFileForm
        initialData={initialData}
        onSubmit={handleSubmit}
        isSaving={updateMutation.isPending}
      />
    </div>
  );
}
