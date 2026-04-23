import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "../../hooks/useTheme";
import {
  usePlatforms, usePlatformKnowledge, useCommunityInsights,
  useTrainingCaseFiles,
} from "../../hooks/useIngest";
import IngestForm from "../ingest/IngestForm";
import PageActionButton from "../../components/ui/PageActionButton";

const F = "'Plus Jakarta Sans', sans-serif";

function SelectFilter({ value, onChange, options, placeholder, theme }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        padding: "7px 12px", border: `1.5px solid ${theme.borderInput}`, borderRadius: 8,
        fontFamily: F, fontSize: 13, color: theme.text, background: theme.inputBg,
        cursor: "pointer", minWidth: 140,
      }}
    >
      <option value="">{placeholder}</option>
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function Badge({ label, color, bg }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 9px", borderRadius: 99,
      fontSize: 11, fontWeight: 600, background: bg, color, marginRight: 4, marginBottom: 4,
    }}>
      {label}
    </span>
  );
}

function TabBar({ tabs, active, onChange, theme }) {
  return (
    <div style={{ display: "flex", gap: 2, marginBottom: 24, borderBottom: `1px solid ${theme.border}`, paddingBottom: 0 }}>
      {tabs.map(tab => {
        const isActive = tab.id === active;
        const suffix = tab.loading ? "…" : Number.isFinite(tab.count) ? ` (${tab.count})` : "";
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              padding: "9px 18px", fontFamily: F, fontSize: 13,
              fontWeight: isActive ? 700 : 500,
              color: isActive ? theme.blue : theme.textSec,
              background: "none", border: "none",
              borderBottom: isActive ? `2px solid ${theme.blue}` : "2px solid transparent",
              marginBottom: -1, cursor: "pointer", transition: "all 0.15s", borderRadius: 0,
            }}
          >
            {tab.label}{suffix}
          </button>
        );
      })}
    </div>
  );
}

const KNOWLEDGE_TYPE_OPTIONS = [
  { value: "capability", label: "Capability" },
  { value: "limitation", label: "Limitation" },
  { value: "pricing_constraint", label: "Pricing Constraint" },
  { value: "api_detail", label: "API Detail" },
  { value: "integration_spec", label: "Integration Spec" },
  { value: "feature", label: "Feature" },
];

const CATEGORY_OPTIONS = [
  { value: "automations", label: "Automations" },
  { value: "integrations", label: "Integrations" },
  { value: "permissions", label: "Permissions" },
  { value: "hierarchy", label: "Hierarchy / Structure" },
  { value: "reporting", label: "Reporting / Dashboards" },
  { value: "views", label: "Views" },
  { value: "custom_fields", label: "Custom Fields" },
  { value: "templates", label: "Templates" },
  { value: "api", label: "API" },
  { value: "pricing", label: "Pricing / Plans" },
  { value: "other", label: "Other" },
];

const INSIGHT_TYPE_OPTIONS = [
  { value: "methodology", label: "Methodology" },
  { value: "workaround", label: "Workaround" },
  { value: "complaint", label: "Complaint / Pain Point" },
  { value: "best_practice", label: "Best Practice" },
  { value: "feature_request", label: "Feature Request" },
  { value: "gotcha", label: "Gotcha / Pitfall" },
];

export default function PatternsPage() {
  const { theme } = useTheme();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("knowledge");
  const [knowledgeFilters, setKnowledgeFilters] = useState({ platform: "", category: "", knowledge_type: "" });
  const [insightFilters, setInsightFilters] = useState({ platform: "", type: "" });
  const [expandedId, setExpandedId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const platforms = usePlatforms();
  const knowledge = usePlatformKnowledge(knowledgeFilters);
  const insights = useCommunityInsights(insightFilters);
  const trainingCases = useTrainingCaseFiles();

  // Backend returns {count, results} for knowledge/insights, paginated for cases.
  const knowledgeItems = Array.isArray(knowledge.data?.results)
    ? knowledge.data.results
    : Array.isArray(knowledge.data)
    ? knowledge.data
    : [];
  const knowledgeCount = Number.isFinite(knowledge.data?.count)
    ? knowledge.data.count
    : knowledgeItems.length;

  const insightItems = Array.isArray(insights.data?.results)
    ? insights.data.results
    : Array.isArray(insights.data)
    ? insights.data
    : [];
  const insightCount = Number.isFinite(insights.data?.count)
    ? insights.data.count
    : insightItems.length;

  const caseItems = Array.isArray(trainingCases.data?.results)
    ? trainingCases.data.results
    : Array.isArray(trainingCases.data)
    ? trainingCases.data
    : [];
  const caseCount = Number.isFinite(trainingCases.data?.count)
    ? trainingCases.data.count
    : caseItems.length;

  const platformOptions = (platforms.data || []).map(p => ({ value: p.slug, label: p.name }));

  const handleIngestSuccess = () => {
    qc.invalidateQueries({ queryKey: ["platformKnowledge"] });
    qc.invalidateQueries({ queryKey: ["communityInsights"] });
    qc.invalidateQueries({ queryKey: ["trainingCaseFiles"] });
  };

  const tabs = [
    { id: "knowledge", label: "Platform Knowledge", count: knowledge.isSuccess ? knowledgeCount : null, loading: knowledge.isLoading },
    { id: "insights", label: "Community Insights", count: insights.isSuccess ? insightCount : null, loading: insights.isLoading },
    { id: "cases", label: "Training Cases", count: trainingCases.isSuccess ? caseCount : null, loading: trainingCases.isLoading },
  ];

  return (
    <div className="fp-page-wrap" style={{ padding: "32px 32px 80px", maxWidth: 860 }}>
      <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1 style={{ margin: "0 0 6px", fontSize: 26, fontFamily: "'Fraunces', serif" }}>Patterns</h1>
          <p style={{ margin: 0, fontSize: 14, color: theme.textMuted, fontFamily: F }}>
            Browse platform knowledge, community insights, and training case files from ingestion.
          </p>
        </div>
        <PageActionButton
          onClick={() => setShowAddForm(s => !s)}
          toggled={showAddForm}
        >
          Ingest source
        </PageActionButton>
      </div>

      {showAddForm && (
        <div style={{
          marginBottom: 24, padding: "22px 24px",
          background: theme.blueLight, border: `1.5px solid ${theme.blueBorder}`,
          borderRadius: 12,
        }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: theme.text, fontFamily: F }}>
            Add a new source
          </h2>
          <p style={{ margin: "0 0 18px", fontSize: 13, color: theme.textMuted, fontFamily: F }}>
            The AI will classify each piece as platform knowledge, community insight, or case file and route it to the right tab.
          </p>
          <IngestForm wrapInCard={true} onSuccess={handleIngestSuccess} />
        </div>
      )}

      <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} theme={theme} />

      {/* Platform Knowledge */}
      {activeTab === "knowledge" && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            <SelectFilter value={knowledgeFilters.platform} onChange={v => setKnowledgeFilters(f => ({ ...f, platform: v }))} options={platformOptions} placeholder="All platforms" theme={theme} />
            <SelectFilter value={knowledgeFilters.category} onChange={v => setKnowledgeFilters(f => ({ ...f, category: v }))} options={CATEGORY_OPTIONS} placeholder="All categories" theme={theme} />
            <SelectFilter value={knowledgeFilters.knowledge_type} onChange={v => setKnowledgeFilters(f => ({ ...f, knowledge_type: v }))} options={KNOWLEDGE_TYPE_OPTIONS} placeholder="All types" theme={theme} />
          </div>
          {knowledge.isLoading && <p style={{ fontSize: 13, color: theme.textFaint, fontFamily: F }}>Loading...</p>}
          {knowledge.isError && (
            <div style={{ padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 9, fontSize: 12, color: "#DC2626", fontFamily: F }}>
              Failed to load knowledge data: {knowledge.error?.response?.data?.detail || knowledge.error?.message || "Unknown error"}
            </div>
          )}
          {!knowledge.isLoading && !knowledge.isError && knowledgeItems.length === 0 && <p style={{ fontSize: 13, color: theme.textFaint, fontFamily: F }}>No records match the current filters.</p>}
          {knowledgeItems.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {knowledgeItems.map(item => {
                const isOpen = expandedId === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setExpandedId(isOpen ? null : item.id)}
                    style={{
                      border: `1px solid ${theme.borderSubtle}`, borderRadius: 10,
                      padding: "14px 16px", cursor: "pointer",
                      background: isOpen ? theme.blueLight : theme.surface,
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: theme.text, fontFamily: F }}>{item.title}</p>
                        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap" }}>
                          <Badge label={item.platform?.name || "—"} color={theme.blue} bg={theme.blueLight} />
                          {item.knowledge_type && <Badge label={item.knowledge_type.replace(/_/g, " ")} color="#7C3AED" bg="#F3E8FF" />}
                          {item.category && <Badge label={item.category.replace(/_/g, " ")} color="#D97706" bg="#FEF3C7" />}
                        </div>
                      </div>
                      {item.confidence_score != null && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: theme.textFaint, fontFamily: F, flexShrink: 0 }}>
                          {Math.round(item.confidence_score * 100)}%
                        </span>
                      )}
                    </div>
                    {isOpen && (
                      <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${theme.borderSubtle}` }}>
                        <p style={{ margin: 0, fontSize: 13, color: theme.textSec, fontFamily: F, whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{item.content}</p>
                        {item.source_url && (
                          <p style={{ margin: "12px 0 0", fontSize: 11, color: theme.textFaint, fontFamily: F }}>
                            Source: <a href={item.source_url} target="_blank" rel="noreferrer" style={{ color: theme.blue }}>{item.source_url}</a>
                          </p>
                        )}
                        {item.source_attribution && (
                          <p style={{ margin: "4px 0 0", fontSize: 11, color: theme.textFaint, fontFamily: F }}>Attribution: {item.source_attribution}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Community Insights */}
      {activeTab === "insights" && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            <SelectFilter value={insightFilters.platform} onChange={v => setInsightFilters(f => ({ ...f, platform: v }))} options={platformOptions} placeholder="All platforms" theme={theme} />
            <SelectFilter value={insightFilters.type} onChange={v => setInsightFilters(f => ({ ...f, type: v }))} options={INSIGHT_TYPE_OPTIONS} placeholder="All types" theme={theme} />
          </div>
          {insights.isLoading && <p style={{ fontSize: 13, color: theme.textFaint, fontFamily: F }}>Loading...</p>}
          {insights.isError && (
            <div style={{ padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 9, fontSize: 12, color: "#DC2626", fontFamily: F }}>
              Failed to load insights: {insights.error?.response?.data?.detail || insights.error?.message || "Unknown error"}
            </div>
          )}
          {!insights.isLoading && !insights.isError && insightItems.length === 0 && <p style={{ fontSize: 13, color: theme.textFaint, fontFamily: F }}>No insights match the current filters.</p>}
          {insightItems.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {insightItems.map(item => {
                const isOpen = expandedId === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setExpandedId(isOpen ? null : item.id)}
                    style={{
                      border: `1px solid ${theme.borderSubtle}`, borderRadius: 10,
                      padding: "14px 16px", cursor: "pointer",
                      background: isOpen ? theme.blueLight : theme.surface,
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: theme.text, fontFamily: F }}>{item.title}</p>
                        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap" }}>
                          {item.platforms?.map(p => (
                            <Badge key={p.slug} label={p.name} color={theme.blue} bg={theme.blueLight} />
                          ))}
                          {item.insight_type && <Badge label={item.insight_type.replace(/_/g, " ")} color="#059669" bg="#ECFDF5" />}
                        </div>
                      </div>
                      {item.confidence_score != null && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: theme.textFaint, fontFamily: F, flexShrink: 0 }}>
                          {Math.round(item.confidence_score * 100)}%
                        </span>
                      )}
                    </div>
                    {isOpen && (
                      <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${theme.borderSubtle}` }}>
                        <p style={{ margin: 0, fontSize: 13, color: theme.textSec, fontFamily: F, whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{item.content}</p>
                        {item.source_url && (
                          <p style={{ margin: "12px 0 0", fontSize: 11, color: theme.textFaint, fontFamily: F }}>
                            Source: <a href={item.source_url} target="_blank" rel="noreferrer" style={{ color: theme.blue }}>{item.source_url}</a>
                          </p>
                        )}
                        {item.source_attribution && (
                          <p style={{ margin: "4px 0 0", fontSize: 11, color: theme.textFaint, fontFamily: F }}>Attribution: {item.source_attribution}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Training Case Files */}
      {activeTab === "cases" && (
        <>
          {trainingCases.isLoading && <p style={{ fontSize: 13, color: theme.textFaint, fontFamily: F }}>Loading...</p>}
          {trainingCases.isError && (
            <div style={{ padding: "10px 14px", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 9, fontSize: 12, color: "#DC2626", fontFamily: F }}>
              Failed to load training cases: {trainingCases.error?.response?.data?.detail || trainingCases.error?.message || "Unknown error"}
            </div>
          )}
          {!trainingCases.isLoading && !trainingCases.isError && caseItems.length === 0 && <p style={{ fontSize: 13, color: theme.textFaint, fontFamily: F }}>No training case files yet.</p>}
          {caseItems.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {caseItems.map(cf => {
                const isOpen = expandedId === cf.id;
                return (
                  <div
                    key={cf.id}
                    onClick={() => setExpandedId(isOpen ? null : cf.id)}
                    style={{
                      border: `1px solid ${theme.borderSubtle}`, borderRadius: 10,
                      padding: "14px 16px", cursor: "pointer",
                      background: isOpen ? theme.blueLight : theme.surface,
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: theme.text, fontFamily: F }}>
                          {cf.name || cf.workflow_type || "Untitled"}
                        </p>
                        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap" }}>
                          {cf.primary_platform && <Badge label={cf.primary_platform.name} color={theme.blue} bg={theme.blueLight} />}
                          {cf.workflow_type && <Badge label={cf.workflow_type} color="#7C3AED" bg="#F3E8FF" />}
                          {cf.industries?.map(ind => (
                            <Badge key={ind} label={ind} color="#D97706" bg="#FEF3C7" />
                          ))}
                          <Badge
                            label={cf.built_outcome === "yes" ? "Built" : cf.built_outcome === "partially" ? "Partial" : cf.built_outcome || "—"}
                            color={cf.built_outcome === "yes" ? "#059669" : cf.built_outcome === "partially" ? "#D97706" : "#6B7280"}
                            bg={cf.built_outcome === "yes" ? "#ECFDF5" : cf.built_outcome === "partially" ? "#FEF3C7" : "#F3F4F6"}
                          />
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                        {cf.satisfaction_score != null && (
                          <span style={{ fontSize: 11, fontWeight: 600, color: theme.textFaint, fontFamily: F }}>
                            {cf.satisfaction_score}/5
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: theme.textFaint, fontFamily: F }}>
                          {cf.source_type === "ingested" ? "Ingested" : cf.source_type}
                        </span>
                      </div>
                    </div>
                    {isOpen && (
                      <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${theme.borderSubtle}` }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 20px", fontSize: 13, fontFamily: F, color: theme.textSec }}>
                          <span>Team size: {cf.team_size || "—"}</span>
                          <span>Roadblocks: {cf.roadblock_count ?? "—"}</span>
                          <span>Tools: {cf.tools?.join(", ") || "—"}</span>
                          <span>Created: {new Date(cf.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

    </div>
  );
}
