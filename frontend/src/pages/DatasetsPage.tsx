import { useEffect, useState } from "react"
import {
  fetchDatasets,
  createDataset,
  deleteDataset,
  type Dataset,
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
import { Database, Plus, Trash2 } from "lucide-react"

export default function DatasetsPage() {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: "", imgs_route: "", csv_route: "" })

  const load = () => fetchDatasets().then(setDatasets).catch(console.error)
  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    await createDataset(form)
    setForm({ name: "", imgs_route: "", csv_route: "" })
    setOpen(false)
    load()
  }

  const handleDelete = async (id: number) => {
    await deleteDataset(id)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Datasets</h2>
          <p className="text-muted-foreground">
            Configure your image sources and CSV metadata.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="h-4 w-4 mr-2" />Add Dataset
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Dataset</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="FHIIBE Sample"
                />
              </div>
              <div>
                <Label>Images Path (local or S3)</Label>
                <Input
                  value={form.imgs_route}
                  onChange={(e) => setForm({ ...form, imgs_route: e.target.value })}
                  placeholder="s3://fairly-data/ or C:/images/"
                />
              </div>
              <div>
                <Label>CSV Metadata Path</Label>
                <Input
                  value={form.csv_route}
                  onChange={(e) => setForm({ ...form, csv_route: e.target.value })}
                  placeholder="C:/data/metadata.csv"
                />
              </div>
              <Button onClick={handleCreate} className="w-full">
                Save Dataset
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {datasets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Database className="mx-auto h-10 w-10 mb-4 opacity-50" />
            <p>No datasets configured yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {datasets.map((ds) => (
            <Card key={ds.dataset_id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{ds.name}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(ds.dataset_id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-1">
                <p>Images: {ds.imgs_route || "—"}</p>
                <p>CSV: {ds.csv_route || "—"}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
