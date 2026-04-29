import { useState, useEffect } from "react";
import { trpc } from "./trpc";

export function App() {
  const [status, setStatus] = useState<{ name: string; status: string } | null>(null);

  useEffect(() => {
    trpc.app.status.query().then(setStatus);
  }, []);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <h1>Kalima</h1>
      {status ? (
        <p>
          {status.name}: <strong>{status.status}</strong>
        </p>
      ) : (
        <p>Loading…</p>
      )}
    </div>
  );
}