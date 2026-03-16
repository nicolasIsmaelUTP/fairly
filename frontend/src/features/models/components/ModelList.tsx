/** Model list + "Connect Model" dialog using react-hook-form + zod. */

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { modelsApi } from "@/features/models/api"
import { modelSchema, type ModelFormValues } from "@/lib/schemas"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BrainCircuit, Plus, Trash2 } from "lucide-react"
import { useState } from "react"

export default function ModelList() {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: models = [] } = useQuery({
    queryKey: ["models"],
    queryFn: modelsApi.list,
  })

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
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ModelFormValues>({
    resolver: zodResolver(modelSchema),
    defaultValues: { name: "", source: "custom", endpoint: "", apiKey: "" },
  })

  const source = watch("source")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Models</h2>
          <p className="text-muted-foreground">Manage your VLM connections.</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset() }}>
          <DialogTrigger render={<Button />}>
            <Plus className="h-4 w-4 mr-2" />Connect Model
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
                  <Input
                    placeholder="https://api.example.com/v1/chat/completions"
                    {...register("endpoint")}
                  />
                  {errors.endpoint && (
                    <p className="text-xs text-destructive mt-1">{errors.endpoint.message}</p>
                  )}
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

      {models.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <BrainCircuit className="mx-auto h-10 w-10 mb-4 opacity-50" />
            <p>No models connected yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {models.map((m) => (
            <Card key={m.model_id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{m.name}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate(m.model_id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Source: {m.source}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
