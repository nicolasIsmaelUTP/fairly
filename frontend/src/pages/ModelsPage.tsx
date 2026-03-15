import { useEffect, useState } from "react"
import {
  fetchModels,
  createModel,
  deleteModel,
  type Model,
} from "@/lib/api"
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
import { BrainCircuit, Plus, Trash2 } from "lucide-react"

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: "", endpoint: "", apiKey: "" })

  const load = () => fetchModels().then(setModels).catch(console.error)
  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    const metadata = JSON.stringify({
      endpoint: form.endpoint,
      api_key: form.apiKey,
    })
    await createModel({ name: form.name, source: "custom", metadata_json: metadata })
    setForm({ name: "", endpoint: "", apiKey: "" })
    setOpen(false)
    load()
  }

  const handleDelete = async (id: number) => {
    await deleteModel(id)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Models</h2>
          <p className="text-muted-foreground">Manage your VLM connections.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="h-4 w-4 mr-2" />Connect Model
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Connect Custom Model</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Model Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="My GPT-Vision"
                />
              </div>
              <div>
                <Label>Endpoint URL</Label>
                <Input
                  value={form.endpoint}
                  onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
                  placeholder="https://api.example.com/v1/chat/completions"
                />
              </div>
              <div>
                <Label>API Key</Label>
                <Input
                  type="password"
                  value={form.apiKey}
                  onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                  placeholder="sk-..."
                />
              </div>
              <Button onClick={handleCreate} className="w-full">
                Save Model
              </Button>
            </div>
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
                  onClick={() => handleDelete(m.model_id)}
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
