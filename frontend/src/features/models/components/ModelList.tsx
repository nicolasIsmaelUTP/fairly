/** Models Hub — custom models section on top, featherless models below.
 *  Run Benchmark buttons disabled when featherless API key is missing.
 */

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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Link2, Plus, Trash2, Play, Info, AlertCircle } from "lucide-react"
import { useState } from "react"
import type { Model } from "@/types"

function parseMetadata(model: Model) {
  try {
    return JSON.parse(model.metadata_json)
  } catch {
    return {}
  }
}

export default function ModelList() {
  const [open, setOpen] = useState(false)
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
        endpoint: values.endpoint || "",
        api_key: values.apiKey,
      })
      return modelsApi.create({
        name: values.name,
        source: values.source,
        metadata_json,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["models"] })
      setOpen(false)
      reset()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: modelsApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["models"] }),
  })

  const {
    register, handleSubmit, setValue, watch, reset, formState: { errors },
  } = useForm<ModelFormValues>({
    resolver: zodResolver(modelSchema),
    defaultValues: { name: "", source: "custom", endpoint: "", apiKey: "" },
  })

  const source = watch("source")

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Models Hub</h2>
          <p className="text-muted-foreground">Explore and evaluate open-source VLMs</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
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
                <Label>Source</Label>
                <Select
                  value={source}
                  onValueChange={(v) => { if (v) setValue("source", v as "featherless" | "custom") }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="featherless">Featherless.ai</SelectItem>
                    <SelectItem value="custom">Custom Endpoint</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {source === "custom" && (
                <div>
                  <Label>Endpoint URL</Label>
                  <Input placeholder="https://api.example.com/v1/chat/completions" {...register("endpoint")} />
                  {errors.endpoint && <p className="text-xs text-destructive mt-1">{errors.endpoint.message}</p>}
                </div>
              )}
              <div>
                <Label>API Key</Label>
                <Input type="password" placeholder="sk-..." {...register("apiKey")} />
                {errors.apiKey && <p className="text-xs text-destructive mt-1">{errors.apiKey.message}</p>}
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
              return (
                <Card key={m.model_id} className="flex flex-col">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base font-semibold">{m.name}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">Custom endpoint</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => deleteMutation.mutate(m.model_id)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-end gap-3">
                    <Button
                      className="w-full bg-gradient-to-r from-[#7503A6] to-[#5B8DEF] text-white"
                      onClick={() => navigate("/benchmark")}
                    >
                      <Play className="h-4 w-4 mr-2" /> Run Benchmark
                    </Button>
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
