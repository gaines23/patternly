import PageHeader from "../../components/ui/PageHeader";
import IngestForm from "./IngestForm";

export default function IngestPage() {
  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <PageHeader
        title="Ingest Source"
        subtitle="Add platform knowledge, community insights, or case files from any source"
      />
      <IngestForm />
    </div>
  );
}
