/** Models Hub — custom model connection with test, metadata editing, featherless catalog. */

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { modelsApi } from "@/features/models/api"
import { settingsApi } from "@/features/settings/api"
import { modelSchema, type ModelFormValues } from "@/lib/schemas"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Link2, Trash2, Play, Info, Check, Loader2, Pencil, Zap, X } from "lucide-react"
import { useState } from "react"
import type { Model } from "@/types"

function parseMetadata(model: Model) {
  try {
    return JSON.parse(model.metadata_json)
  } catch {
    return {}
  }
}

/* ── Metadata Edit Dialog ───────────────────────────────────────────────── */

function MetadataEditDialog({ model }: { model: Model }) {
  const [open, setOpen] = useState(false)
  const meta = parseMetadata(model)
  const queryClient = useQueryClient()

  const [org, setOrg] = useState(meta.org ?? "")
  const [params, setParams] = useState(meta.params ?? "")
  const [description, setDescription] = useState(meta.description ?? "")
  const [tags, setTags] = useState(meta.tags?.join(", ") ?? "")

  const mutation = useMutation({
    mutationFn: () => {
      const updated = {
        ...meta,
        org: org || undefined,
        params: params || undefined,
        description: description || undefined,
        tags: tags ? tags.split(",").map((t: string) => t.trim()).filter(Boolean) : undefined,
      }
      return modelsApi.update(model.model_id, JSON.stringify(updated))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["models"] })
      setOpen(false)
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <button className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-muted transition-colors">
          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      }/>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Model Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div>
            <Label>Organization</Label>
            <Input placeholder="e.g. Google, Meta" value={org} onChange={(e) => setOrg(e.target.value)} />
          </div>
          <div>
            <Label>Parameters</Label>
            <Input placeholder="e.g. 7B, 13B" value={params} onChange={(e) => setParams(e.target.value)} />
          </div>
          <div>
            <Label>Description</Label>
            <Input placeholder="Brief description of the model" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <Label>Tags (comma separated)</Label>
            <Input placeholder="vision, chat, instruction-tuned" value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>
          <Button onClick={() => mutation.mutate()} className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save Details"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ── Main Component ─────────────────────────────────────────────────────── */

export default function ModelList() {
  const [open, setOpen] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; response: string } | null>(null)
  const [testError, setTestError] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data: models = [] } = useQuery({
    queryKey: ["models"],
    queryFn: modelsApi.list,
  })

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: settingsApi.get,
  })

  const hasFeatherlessKey = !!settings?.has_featherless_key

  const customModels = models.filter((m) => m.source === "custom")
  const featherlessModels = models.filter((m) => m.source === "featherless")

  const createMutation = useMutation({
    mutationFn: (values: ModelFormValues) => {
      const metadata_json = JSON.stringify({
        endpoint: values.endpoint,
        api_key: values.apiKey,
        model_id: values.modelId,
      })
      return modelsApi.create({
        name: values.name,
        source: "custom",
        metadata_json,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["models"] })
      setOpen(false)
      setTestResult(null)
      setTestError(null)
      reset()
    },
  })

  const testMutation = useMutation({
    mutationFn: ({ endpoint, apiKey, modelId }: { endpoint: string; apiKey: string; modelId: string }) =>
      modelsApi.testConnection(endpoint, apiKey, modelId),
    onSuccess: (data) => { setTestResult(data); setTestError(null) },
    onError: (err: any) => {
      setTestError(err?.response?.data?.detail ?? err.message ?? "Connection failed")
      setTestResult(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: modelsApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["models"] }),
  })

  const {
    register, handleSubmit, watch, reset, formState: { errors },
  } = useForm<ModelFormValues>({
    resolver: zodResolver(modelSchema),
    defaultValues: { name: "", modelId: "", endpoint: "", apiKey: "" },
  })

  const watchEndpoint = watch("endpoint")
  const watchApiKey = watch("apiKey")
  const watchModelId = watch("modelId")

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Models Hub</h2>
          <p className="text-muted-foreground">Explore and evaluate open-source VLMs</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { reset(); setTestResult(null); setTestError(null) } }}>
          <DialogTrigger render={<Button variant="outline" />}>
            <Link2 className="h-4 w-4 mr-2" />Connect Custom Model
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connect a Model</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit((v) => createMutation.mutate(v))} className="space-y-4 pt-2">
              <div>
                <Label>Model Name</Label>
                <Input placeholder="My GPT-Vision" {...register("name")} />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <Label>Model ID</Label>
                <Input placeholder="e.g. gpt-4o, llava-hf/llava-v1.6-mistral-7b-hf" {...register("modelId")} />
                <p className="text-xs text-muted-foreground mt-1">The model identifier sent in the <code className="text-[10px] bg-muted px-1 rounded">model</code> field of each API request.</p>
                {errors.modelId && <p className="text-xs text-destructive mt-1">{errors.modelId.message}</p>}
              </div>
              <div>
                <Label>Endpoint URL</Label>
                <Input placeholder="https://api.example.com/v1/chat/completions" {...register("endpoint")} />
                <div className="flex items-start gap-1.5 mt-1.5">
                  <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    Must be OpenAI API compatible. Use <code className="text-[10px] bg-muted px-1 rounded">/v1/responses</code> for GPT-5+ or <code className="text-[10px] bg-muted px-1 rounded">/v1/chat/completions</code> for vLLM, Ollama, LM Studio, Featherless, etc.
                  </p>
                </div>
                {errors.endpoint && <p className="text-xs text-destructive mt-1">{errors.endpoint.message}</p>}
              </div>
              <div>
                <Label>API Key</Label>
                <Input type="password" placeholder="sk-..." {...register("apiKey")} />
                {errors.apiKey && <p className="text-xs text-destructive mt-1">{errors.apiKey.message}</p>}
              </div>

              {/* Test Connection */}
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={!watchEndpoint || !watchApiKey || !watchModelId || testMutation.isPending}
                  onClick={() => testMutation.mutate({ endpoint: watchEndpoint, apiKey: watchApiKey, modelId: watchModelId })}
                >
                  {testMutation.isPending ? (
                    <><Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />Testing…</>
                  ) : (
                    <><Zap className="h-3.5 w-3.5 mr-2" />Test Connection</>
                  )}
                </Button>
                {testResult && (
                  <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm">
                    <div className="flex items-center gap-1.5 text-green-700 font-medium mb-1">
                      <Check className="h-3.5 w-3.5" /> Connection successful
                    </div>
                    <p className="text-xs text-green-600 italic">"{testResult.response}"</p>
                  </div>
                )}
                {testError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm">
                    <div className="flex items-center gap-1.5 text-red-700 font-medium mb-1">
                      <X className="h-3.5 w-3.5" /> Connection failed
                    </div>
                    <p className="text-xs text-red-600">{testError}</p>
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Saving…" : "Save Model"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* API key warning */}
      {!hasFeatherlessKey && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm">
          <Info className="h-5 w-5 text-blue-600 shrink-0" />
          <p>
            Add your <span className="font-semibold">Featherless.ai API Key</span> in Settings to enable benchmark execution.
          </p>
        </div>
      )}

      {/* Custom models section */}
      {customModels.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-3">Your Models</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {customModels.map((m) => {
              const meta = parseMetadata(m)
              const tags: string[] = meta.tags ?? []
              return (
                <Card key={m.model_id} className="flex flex-col">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base font-semibold">{m.name}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {meta.org ? `${meta.org} · ` : "Custom · "}
                          {meta.params ? `${meta.params} params` : "endpoint"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <MetadataEditDialog model={m} />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => deleteMutation.mutate(m.model_id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col gap-3">
                    {meta.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {meta.description}
                      </p>
                    )}
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {tags.map((tag: string) => (
                          <Badge key={tag} variant="outline" className="text-[10px] font-normal">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="mt-auto">
                      <Button
                        className="w-full bg-gradient-to-r from-[#7503A6] to-[#5B8DEF] text-white"
                        onClick={() => navigate("/benchmark")}
                      >
                        <Play className="h-4 w-4 mr-2" /> Run Benchmark
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>
      )}

      {/* Featherless models section */}
      {featherlessModels.length > 0 && (
        <section>
          <h3 className="text-lg font-semibold mb-3">Featherless Catalog</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featherlessModels.map((m) => {
              const meta = parseMetadata(m)
              const tags: string[] = meta.tags ?? []

              return (
                <Card key={m.model_id} className="flex flex-col">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">
                      {m.name.split("/").pop()}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {meta.org ?? "—"} · {meta.params ?? "—"} params
                    </p>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col gap-3">
                    {meta.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {meta.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((tag: string) => (
                        <Badge key={tag} variant="outline" className="text-[10px] font-normal">
                          {tag}
                        </Badge>
                      ))}
                      {meta.is_gated && (
                        <Badge variant="outline" className="text-[10px] font-normal text-amber-600 border-amber-300">
                          gated
                        </Badge>
                      )}
                    </div>
                    <div className="mt-auto">
                      <Button
                        className="w-full bg-gradient-to-r from-[#7503A6] to-[#5B8DEF] text-white"
                        disabled={!hasFeatherlessKey}
                        onClick={() => navigate("/benchmark")}
                      >
                        <Play className="h-4 w-4 mr-2" /> Run Benchmark
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
