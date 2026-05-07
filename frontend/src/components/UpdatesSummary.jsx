const F = "'Plus Jakarta Sans', sans-serif";

const DEFAULT_HEADING = { margin: "16px 0 6px", fontSize: 15, fontWeight: 700, color: "#1F2937", fontFamily: F };
const DEFAULT_BODY = { margin: "3px 0", fontSize: 13, color: "#374151", fontFamily: F, lineHeight: 1.7 };

export function parseUpdatesSummary(text) {
  if (!text) return null;
  const trimmed = text.trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const obj = JSON.parse(trimmed);
    if (obj && typeof obj === "object" && Array.isArray(obj.top_updates)) {
      return obj;
    }
  } catch {
    // not JSON; caller should fall back
  }
  return null;
}

function StructuredSummary({ data, headingStyle, bodyStyle }) {
  const hStyle = headingStyle || DEFAULT_HEADING;
  const bStyle = bodyStyle || DEFAULT_BODY;
  const reasonStyle = {
    margin: "2px 0 6px 14px",
    fontSize: 12,
    color: "#6B7280",
    fontFamily: F,
    fontStyle: "italic",
    lineHeight: 1.5,
  };

  const top = (data.top_updates || []).slice(0, 5);

  return (
    <>
      {data.progress_overview && (
        <>
          <p style={hStyle}>Progress Overview</p>
          <p style={bStyle}>{data.progress_overview}</p>
        </>
      )}

      {top.length > 0 && (
        <>
          <p style={hStyle}>Key Updates</p>
          {top.map((u, i) => (
            <div key={i} style={{ margin: "8px 0" }}>
              <p style={{ ...bStyle, fontWeight: 700, color: "#1F2937" }}>
                {u.date}{u.time_label ? ` (${u.time_label})` : ""}
              </p>
              <p style={bStyle}>- {u.content}</p>
              {u.importance_reason && (
                <p style={reasonStyle}>Why this stands out: {u.importance_reason}</p>
              )}
            </div>
          ))}
        </>
      )}

      {data.scope_changes && (
        <>
          <p style={hStyle}>Scope Changes</p>
          <p style={bStyle}>{data.scope_changes}</p>
        </>
      )}

      {data.action_items && (
        <>
          <p style={hStyle}>Action Items &amp; Concerns</p>
          <p style={bStyle}>{data.action_items}</p>
        </>
      )}
    </>
  );
}

function MarkdownSummary({ text, headingStyle, bodyStyle }) {
  const hStyle = headingStyle || DEFAULT_HEADING;
  const bStyle = bodyStyle || DEFAULT_BODY;
  if (!text) return null;
  const lines = text.split("\n");
  const out = [];
  let inKeyUpdates = false;
  let bulletCount = 0;
  let suppress = false;

  lines.forEach((line, li) => {
    const trimmed = line.trim();
    if (trimmed === "") {
      if (!suppress) out.push(<div key={li} style={{ height: 8 }} />);
      return;
    }

    const boldOnlyMatch = trimmed.match(/^\*\*(.+?)\*\*$/);
    const isDateHeader = /^\*\*\d{1,2}\/\d{1,2}\/\d{2,4}\*\*/.test(trimmed);

    if (boldOnlyMatch && !isDateHeader) {
      inKeyUpdates = /key updates/i.test(boldOnlyMatch[1]);
      bulletCount = 0;
      suppress = false;
      out.push(<p key={li} style={hStyle}>{boldOnlyMatch[1]}</p>);
      return;
    }

    if (inKeyUpdates && suppress) return;

    if (inKeyUpdates && trimmed.startsWith("- ")) {
      bulletCount++;
      if (bulletCount > 5) {
        suppress = true;
        return;
      }
    }

    if (boldOnlyMatch) {
      out.push(<p key={li} style={hStyle}>{boldOnlyMatch[1]}</p>);
      return;
    }

    const parts = trimmed.split(/(\*\*.*?\*\*)/g);
    const rendered = parts.map((part, pi) => {
      const m = part.match(/^\*\*(.*?)\*\*$/);
      if (m) return <strong key={pi}>{m[1]}</strong>;
      return <span key={pi}>{part}</span>;
    });
    out.push(<p key={li} style={bStyle}>{rendered}</p>);
  });
  return out;
}

export function UpdatesSummary({ text, headingStyle, bodyStyle }) {
  const structured = parseUpdatesSummary(text);
  if (structured) {
    return <StructuredSummary data={structured} headingStyle={headingStyle} bodyStyle={bodyStyle} />;
  }
  return <MarkdownSummary text={text} headingStyle={headingStyle} bodyStyle={bodyStyle} />;
}
