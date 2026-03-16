/** Dataset list + "Add Dataset" dialog + Column Mapping UI. */

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { datasetsApi } from "@/features/datasets/api"
import { promptsApi } from "@/features/benchmark/api"
import { datasetSchema, type DatasetFormValues } from "@/lib/schemas"
import type { Dataset, ColumnMapping, Dimension } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
import { Separator } from "@/components/ui/separator"
import { Database, Plus, Trash2, Columns, Pencil } from "lucide-react"

export default function DatasetList() {
  const [addOpen, setAddOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: datasets = [] } = useQuery({
    queryKey: ["datasets"],
    queryFn: datasetsApi.list,
  })

  const createMutation = useMutation({
    mutationFn: (values: DatasetFormValues) => datasetsApi.create(values),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["datasets"] })
      setAddOpen(false)
      reset()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: datasetsApi.delete,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["datasets"] }),
  })

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DatasetFormValues>({
    resolver: zodResolver(datasetSchema),
    defaultValues: { name: "", imgs_route: "", csv_route: "" },
  })

  // Column-mapping state
  const [mappingDs, setMappingDs] = useState<Dataset | null>(null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Datasets</h2>
          <p className="text-muted-foreground">
            Configure your image sources and CSV metadata.
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={(v) => { setAddOpen(v); if (!v) reset() }}>
          <DialogTrigger render={<Button />}>
            <Plus className="h-4 w-4 mr-2" />Add Dataset
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Dataset</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit((v) => createMutation.mutate(v))} className="space-y-4 pt-2">
              <div>
                <Label>Name</Label>
                <Input placeholder="FHIIBE Sample" {...register("name")} />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <Label>Images Path (local or S3)</Label>
                <Input placeholder="s3://fairly-data/ or C:/images/" {...register("imgs_route")} />
                {errors.imgs_route && <p className="text-xs text-destructive mt-1">{errors.imgs_route.message}</p>}
              </div>
              <div>
                <Label>CSV Metadata Path</Label>
                <Input placeholder="C:/data/metadata.csv" {...register("csv_route")} />
                {errors.csv_route && <p className="text-xs text-destructive mt-1">{errors.csv_route.message}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Saving…" : "Save Dataset"}
              </Button>
            </form>
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
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setMappingDs(ds)}>
                    <Columns className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(ds.dataset_id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-1">
                <p>Images: {ds.imgs_route || "—"}</p>
                <p>CSV: {ds.csv_route || "—"}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Column Mapping Dialog */}
      <Dialog open={!!mappingDs} onOpenChange={(v) => { if (!v) setMappingDs(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              Column Mapping — {mappingDs?.name}
            </DialogTitle>
          </DialogHeader>
          {mappingDs && <ColumnMappingEditor dataset={mappingDs} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ── Column Mapping Editor ────────────────────────────────────────────────── */

function ColumnMappingEditor({ dataset }: { dataset: Dataset }) {
  const queryClient = useQueryClient()

  const { data: headers = [] } = useQuery({
    queryKey: ["csv-headers", dataset.dataset_id],
    queryFn: () => datasetsApi.csvHeaders(dataset.dataset_id),
  })

  const { data: existingCols = [] } = useQuery({
    queryKey: ["columns", dataset.dataset_id],
    queryFn: () => datasetsApi.listColumns(dataset.dataset_id),
  })

  const { data: dimensions = [] } = useQuery({
    queryKey: ["dimensions"],
    queryFn: promptsApi.dimensions,
  })

  const [selectedHeader, setSelectedHeader] = useState<string>("")
  const [selectedDim, setSelectedDim] = useState<number | null>(null)

  const addMapping = useMutation({
    mutationFn: () =>
      datasetsApi.createColumn(dataset.dataset_id, {
        name: selectedHeader,
        dimension_id: selectedDim!,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["columns", dataset.dataset_id] })
      setSelectedHeader("")
      setSelectedDim(null)
    },
  })

  const getDimName = (id: number) =>
    dimensions.find((d: Dimension) => d.dimension_id === id)?.name ?? `#${id}`

  return (
    <div className="space-y-4 pt-2">
      {/* Existing mappings */}
      {existingCols.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Current mappings</Label>
          <div className="flex flex-wrap gap-2">
            {existingCols.map((c: ColumnMapping) => (
              <Badge key={c.column_id} variant="outline">
                {c.name} → {getDimName(c.dimension_id)}
              </Badge>
            ))}
          </div>
          <Separator />
        </div>
      )}

      {/* Add new mapping */}
      {headers.length > 0 ? (
        <div className="space-y-3">
          <Label>CSV Column</Label>
          <Select value={selectedHeader} onValueChange={(v) => { if (v) setSelectedHeader(v) }}>
            <SelectTrigger><SelectValue placeholder="Select a column" /></SelectTrigger>
            <SelectContent>
              {headers.map((h: string) => (
                <SelectItem key={h} value={h}>{h}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Label>Bias Dimension</Label>
          <Select
            value={selectedDim ? String(selectedDim) : ""}
            onValueChange={(v) => { if (v) setSelectedDim(Number(v)) }}
          >
            <SelectTrigger><SelectValue placeholder="Select a dimension" /></SelectTrigger>
            <SelectContent>
              {dimensions.map((d: Dimension) => (
                <SelectItem key={d.dimension_id} value={String(d.dimension_id)}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            className="w-full"
            disabled={!selectedHeader || !selectedDim || addMapping.isPending}
            onClick={() => addMapping.mutate()}
          >
            {addMapping.isPending ? "Saving…" : "Add Mapping"}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Could not read CSV headers. Make sure the CSV path exists and is accessible.
        </p>
      )}
    </div>
  )
}
