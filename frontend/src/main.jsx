import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { Toaster } from "react-hot-toast";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3000,
        style: {
          borderRadius: "10px",
          fontFamily: "Inter, sans-serif",
          fontSize: "14px",
        },
        success: {
          style: {
            background: "#1d9e75",
            color: "#fff",
          },
        },
        error: {
          style: {
            background: "#e24b4a",
            color: "#fff",
          },
        },
      }}
    />
  </React.StrictMode>
);