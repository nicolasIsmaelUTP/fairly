import { Routes, Route } from "react-router-dom"
import Layout from "./components/Layout"
import DashboardPage from "./pages/DashboardPage"
import ModelsPage from "./pages/ModelsPage"
import DatasetsPage from "./pages/DatasetsPage"
import BenchmarkPage from "./pages/BenchmarkPage"
import EvaluationPage from "./pages/EvaluationPage"
import SettingsPage from "./pages/SettingsPage"

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/models" element={<ModelsPage />} />
        <Route path="/datasets" element={<DatasetsPage />} />
        <Route path="/benchmark" element={<BenchmarkPage />} />
        <Route path="/evaluations/:id" element={<EvaluationPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}
