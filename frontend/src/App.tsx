import { useState } from "react"
import { Routes, Route } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { settingsApi } from "@/features/settings/api"
import Layout from "./components/Layout"
import OnboardingWizard from "@/features/settings/components/OnboardingWizard"
import DashboardPage from "./pages/DashboardPage"
import ModelsPage from "./pages/ModelsPage"
import DatasetsPage from "./pages/DatasetsPage"
import BenchmarkPage from "./pages/BenchmarkPage"
import EvaluationPage from "./pages/EvaluationPage"
import ResultsPage from "./pages/ResultsPage"
import SettingsPage from "./pages/SettingsPage"

export default function App() {
  const [onboardingDone, setOnboardingDone] = useState(false)

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: settingsApi.get,
  })

  /* Show onboarding wizard on first visit (no API keys configured yet). */
  const needsOnboarding =
    !onboardingDone &&
    !isLoading &&
    settings &&
    !settings.featherless_key &&
    !settings.aws_access_key

  if (needsOnboarding) {
    return <OnboardingWizard onComplete={() => setOnboardingDone(true)} />
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/models" element={<ModelsPage />} />
        <Route path="/datasets" element={<DatasetsPage />} />
        <Route path="/benchmark" element={<BenchmarkPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/evaluations/:id" element={<EvaluationPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}
