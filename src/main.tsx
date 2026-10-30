import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import { registerSW } from "virtual:pwa-register";

let updateSW = (_reloadPage?: boolean) => {};
updateSW = registerSW({
  onNeedRefresh() {
    if (window.confirm("A new version of Little Frets is ready. Reload to update?"))
      void updateSW(true);
  },
});

const root = document.getElementById("root");
if (root)
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
