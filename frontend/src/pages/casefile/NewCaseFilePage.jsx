import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateCaseFile } from "../../hooks/useCaseFiles";
import { formStateToCaseFilePayload } from "../../utils/transforms";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";

import CaseFileForm from "../../components/CaseFileForm";

export default function NewCaseFilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const createMutation = useCreateCaseFile();

  const [apiError, setApiError] = useState(null);

  const handleSubmit = async (formData, enteredBy, caseName) => {
    setApiError(null);
    try {
      const payload = formStateToCaseFilePayload(
        formData,
        enteredBy || user?.full_name || user?.email || "",
        caseName || "",
      );
      const result = await createMutation.mutateAsync(payload);
      navigate(`/case-files/${result.id}`, {
        state: { justCreated: true },
      });
    } catch (err) {
      const data = err.response?.data;
      const msg = data
        ? JSON.stringify(data, null, 2)
        : "Failed to save. Please check your connection and try again.";
      setApiError(msg);
      // Scroll to top to show error
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div>
      {apiError && (
        <div style={{
          margin: "0 32px",
          marginTop: 24,
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
      <CaseFileForm
        onSubmit={handleSubmit}
        isSaving={createMutation.isPending}
        initialEnteredBy={user?.full_name || user?.email || ""}
      />
    </div>
  );
}
