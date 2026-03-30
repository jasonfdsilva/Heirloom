import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import "./index.css";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Garden } from "./pages/Garden";
import { Login } from "./pages/Login";
import { Plants } from "./pages/Plants";
import { PlantingDetail } from "./pages/PlantingDetail";
import { QuickLog } from "./pages/QuickLog";
import { Schedule } from "./pages/Schedule";
import { Settings } from "./pages/Settings";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5 } },
});

const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "garden", element: <Garden /> },
      { path: "plants", element: <Plants /> },
      { path: "plantings/:plantingId", element: <PlantingDetail /> },
      { path: "schedule", element: <Schedule /> },
      { path: "log", element: <QuickLog /> },
      { path: "settings", element: <Settings /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
);
