import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./styles/fonts.css";
import "./index.css";
import { registerSW } from "./pwa/registerSW";
import { initErrorTracking } from "./lib/errorTracking";

// Initialize error tracking early
initErrorTracking();

// Register service worker for PWA
registerSW();

createRoot(document.getElementById("root")!).render(<App />);
