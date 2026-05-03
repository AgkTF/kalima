import { useState } from "react";
import { trpc } from "./trpc";

interface Capture {
  id: number;
  rawText: string;
  item: string;
  locator: string | null;
  sourceHint: string | null;
  createdAt: string;
}

function formatCapture(capture: Capture): string {
  const parts = [capture.item];
  if (capture.locator) parts.push(capture.locator);
  return parts.join(" · ");
}

export function App() {
  const [rawText, setRawText] = useState("");

  const utils = trpc.useUtils();
  const captures = trpc.capture.list.useQuery();
  const createCapture = trpc.capture.create.useMutation({
    onSuccess: () => {
      utils.capture.list.invalidate();
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rawText.trim() || createCapture.isPending) return;

    await createCapture.mutateAsync({ rawText: rawText.trim() });
    setRawText("");
  }

  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        padding: "2rem",
        maxWidth: 600,
        margin: "0 auto",
      }}
    >
      <h1>Kalima</h1>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem" }}
      >
        <input
          type="text"
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Capture a word or phrase…"
          disabled={createCapture.isPending}
          style={{
            flex: 1,
            padding: "0.5rem 0.75rem",
            fontSize: "1rem",
            borderRadius: 4,
            border: "1px solid #ccc",
          }}
          // biome-ignore lint/a11y/noAutofocus: capture input is the primary action, autofocus is intentional
          autoFocus
        />
        <button
          type="submit"
          disabled={createCapture.isPending || !rawText.trim()}
          style={{
            padding: "0.5rem 1rem",
            fontSize: "1rem",
            borderRadius: 4,
            border: "1px solid #ccc",
            cursor: "pointer",
          }}
        >
          {createCapture.isPending ? "…" : "Capture"}
        </button>
      </form>

      {createCapture.error && (
        <p style={{ color: "red" }}>{createCapture.error.message}</p>
      )}

      {captures.data && captures.data.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {captures.data.map((capture) => (
            <li
              key={capture.id}
              style={{ padding: "0.5rem 0", borderTop: "1px solid #eee" }}
            >
              <span style={{ fontSize: "1.1rem" }}>
                {formatCapture(capture)}
              </span>
              {capture.sourceHint && (
                <span
                  style={{
                    marginLeft: "0.5rem",
                    fontSize: "0.85rem",
                    color: "#888",
                  }}
                >
                  ({capture.sourceHint})
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
