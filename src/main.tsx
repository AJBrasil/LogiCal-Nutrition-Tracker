import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import App from "./app/App";
import { isReady, startSync } from "./app/services/serverSync";
import "./styles/index.css";
function Bootstrap() {
  const [ready, setReady] = useState(isReady);
  useEffect(() => {
    const update = () => setReady(isReady());
    window.addEventListener("logical-state", update);
    startSync();
    return () => window.removeEventListener("logical-state", update);
  }, []);
  return ready ? (
    <App />
  ) : (
    <main className="p-6">
      Connecting to your LogiCal server… Check Tailscale if this persists.
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Bootstrap />);
