import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  fetchModels,
  fetchDatasets,
  fetchDomains,
  fetchDimensions,
  fetchPrompts,
  createEvaluation,
  type Model,
  type Dataset,
  type Domain,
  type Dimension,
  type Prompt,
} from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AlertTriangle, FlaskConical } from "lucide-react"

export default function BenchmarkPage() {
  const navigate = useNavigate()

  // Catalog data
  const [models, setModels] = useState<Model[]>([])
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [domains, setDomains] = useState<Domain[]>([])
  const [dimensions, setDimensions] = useState<Dimension[]>([])

  // User selections
  const [modelId, setModelId] = useState<number | null>(null)
  const [datasetId, setDatasetId] = useState<number | null>(null)
  const [domainId, setDomainId] = useState<number | null>(null)
  const [activeDims, setActiveDims] = useState<Set<number>>(new Set())
  const [numImages, setNumImages] = useState(50)
  const [resolution, setResolution] = useState("low")

  // Dynamic prompts
  const [prompts, setPrompts] = useState<Prompt[]>([])

  useEffect(() => {
    fetchModels().then(setModels).catch(console.error)
    fetchDatasets().then(setDatasets).catch(console.error)
    fetchDomains().then(setDomains).catch(console.error)
    fetchDimensions().then(setDimensions).catch(console.error)
  }, [])

  // Reactively filter prompts when domain or dimensions change
  useEffect(() => {
    if (!domainId || activeDims.size === 0) {
      setPrompts([])
      return
    }
    fetchPrompts(domainId).then((all) => {
      setPrompts(all.filter((p) => activeDims.has(p.dimension_id)))
    })
  }, [domainId, activeDims])

  const toggleDim = (id: number) => {
    setActiveDims((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleRun = async () => {
    if (!modelId || !datasetId || !domainId || activeDims.size === 0) return

    const ev = await createEvaluation({
      model_id: modelId,
      dataset_id: datasetId,
      domain_id: domainId,
      dimension_ids: Array.from(activeDims),
      num_images: numImages,
      images_resolution: resolution,
    })
    navigate(`/evaluations/${ev.evaluation_id}`)
  }

  const canRun = modelId && datasetId && domainId && activeDims.size > 0

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold">Benchmark Constructor</h2>
        <p className="text-muted-foreground">
          Configure and launch a bias evaluation.
        </p>
      </div>

      {/* Step 1: Select entities */}
      <Card>
        <CardHeader><CardTitle className="text-base">1. Select Entities</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Model</Label>
            <Select onValueChange={(v) => { if (v !== null) setModelId(Number(v)) }}>
              <SelectTrigger><SelectValue placeholder="Choose a model" /></SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.model_id} value={String(m.model_id)}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Dataset</Label>
            <Select onValueChange={(v) => { if (v !== null) setDatasetId(Number(v)) }}>
              <SelectTrigger><SelectValue placeholder="Choose a dataset" /></SelectTrigger>
              <SelectContent>
                {datasets.map((d) => (
                  <SelectItem key={d.dataset_id} value={String(d.dataset_id)}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Domain */}
      <Card>
        <CardHeader><CardTitle className="text-base">2. Use Case (Domain)</CardTitle></CardHeader>
        <CardContent>
          <Select onValueChange={(v) => { if (v !== null) setDomainId(Number(v)) }}>
            <SelectTrigger><SelectValue placeholder="Choose a domain" /></SelectTrigger>
            <SelectContent>
              {domains.map((d) => (
                <SelectItem key={d.domain_id} value={String(d.domain_id)}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Step 3: Dimensions */}
      <Card>
        <CardHeader><CardTitle className="text-base">3. Bias Dimensions</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {dimensions.map((dim) => (
            <div key={dim.dimension_id} className="flex items-center justify-between">
              <Label>{dim.name}</Label>
              <Switch
                checked={activeDims.has(dim.dimension_id)}
                onCheckedChange={() => toggleDim(dim.dimension_id)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Step 4: Sampling */}
      <Card>
        <CardHeader><CardTitle className="text-base">4. Sampling & Cost</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Number of Images</Label>
            <Select value={String(numImages)} onValueChange={(v) => { if (v !== null) setNumImages(Number(v)) }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 (Quick test)</SelectItem>
                <SelectItem value="50">50 (Recommended)</SelectItem>
                <SelectItem value="200">200</SelectItem>
                <SelectItem value="1000">1,000</SelectItem>
                <SelectItem value="10000">10,000 (Full)</SelectItem>
              </SelectContent>
            </Select>
            {numImages >= 1000 && (
              <div className="flex items-center gap-2 mt-2 text-orange-600 text-xs">
                <AlertTriangle className="h-4 w-4" />
                Warning: Large sample sizes consume many tokens and may take a long time.
              </div>
            )}
          </div>
          <div>
            <Label>Image Resolution</Label>
            <Select value={resolution} onValueChange={(v) => { if (v !== null) setResolution(v) }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low (recommended)</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
            {resolution === "high" && (
              <div className="flex items-center gap-2 mt-2 text-orange-600 text-xs">
                <AlertTriangle className="h-4 w-4" />
                High resolution increases API costs significantly.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dynamic prompts preview */}
      {prompts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Prompt Templates ({prompts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {prompts.map((p) => (
              <div key={p.prompt_id} className="text-sm p-2 rounded bg-muted">
                {p.text}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Separator />

      <Button
        size="lg"
        className="w-full"
        disabled={!canRun}
        onClick={handleRun}
      >
        <FlaskConical className="h-4 w-4 mr-2" />
        Run Benchmark
      </Button>
    </div>
  )
}
