/** Datasets page — connect data, preview CSV, map columns to dimensions. */

import { useEffect, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { datasetsApi } from "@/features/datasets/api"
import { promptsApi } from "@/features/benchmark/api"
import type { Dataset, ColumnMapping, Dimension, CsvPreview } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Database,
  Upload,
  FolderOpen,
  Image as ImageIcon,
  ScanSearch,
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function DatasetList() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [sourceType, setSourceType] = useState<"local" | "s3">("s3")
  const [folderPath, setFolderPath] = useState("")
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)

  // Active dataset
  const { data: datasets = [] } = useQuery({
    queryKey: ["datasets"],
    queryFn: datasetsApi.list,
  })
  const [activeId, setActiveId] = useState<number | null>(null)
  const activeDataset = datasets.find((d) => d.dataset_id === activeId) ?? null

  // Auto-select last dataset on mount
  useEffect(() => {
    if (datasets.length > 0 && activeId === null) {
      const ds = datasets[datasets.length - 1]
      setActiveId(ds.dataset_id)
      setFolderPath(ds.imgs_route)
      setSourceType(ds.imgs_route.startsWith("s3://") ? "s3" : "local")
    }
  }, [datasets, activeId])

  // CSV preview for active dataset
  const { data: preview } = useQuery<CsvPreview>({
    queryKey: ["csv-preview", activeId],
    queryFn: () => datasetsApi.csvPreview(activeId!),
    enabled: !!activeId,
    retry: false,
  })

  // Column mappings for active dataset
  const { data: existingCols = [] } = useQuery({
    queryKey: ["columns", activeId],
    queryFn: () => datasetsApi.listColumns(activeId!),
    enabled: !!activeId,
  })

  // Dimensions
  const { data: dimensions = [] } = useQuery<Dimension[]>({
    queryKey: ["dimensions"],
    queryFn: promptsApi.dimensions,
  })

  // ── Connect / Reconnect ──────────────────────────────────────────────────
  const connectMutation = useMutation({
    mutationFn: async () => {
      let csvPath = ""
      if (csvFile) {
        const result = await datasetsApi.uploadCsv(csvFile)
        csvPath = result.path!
      }
      if (activeDataset) {
        const updates: Record<string, unknown> = { imgs_route: folderPath }
        if (csvPath) updates.csv_route = csvPath
        return datasetsApi.update(activeDataset.dataset_id, updates)
      }
      return datasetsApi.create({
        name:
          csvFile?.name?.replace(/\.(csv|tsv)$/i, "") ||
          folderPath.split("/").pop() ||
          "Dataset",
        imgs_route: folderPath,
        csv_route: csvPath,
      })
    },
    onSuccess: (ds) => {
      setActiveId(ds.dataset_id)
      setCsvFile(null)
      queryClient.invalidateQueries({ queryKey: ["datasets"] })
      queryClient.invalidateQueries({ queryKey: ["csv-preview", ds.dataset_id] })
    },
  })

  // ── Dimension mapping helpers ────────────────────────────────────────────
  const handleDimensionMapping = async (
    dimensionId: number,
    columnName: string,
  ) => {
    if (!activeId) return
    const existing = existingCols.find(
      (c: ColumnMapping) => c.dimension_id === dimensionId,
    )
    if (existing) {
      await datasetsApi.deleteColumn(activeId, existing.column_id)
    }
    if (columnName) {
      await datasetsApi.createColumn(activeId, {
        name: columnName,
        dimension_id: dimensionId,
      })
    }
    queryClient.invalidateQueries({ queryKey: ["columns", activeId] })
  }

  const handleImageColumnMapping = async (columnName: string) => {
    if (!activeId) return
    await datasetsApi.update(activeId, { image_column: columnName })
    queryClient.invalidateQueries({ queryKey: ["datasets"] })
  }

  // ── File handlers ────────────────────────────────────────────────────────
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (
      file &&
      (file.name.endsWith(".csv") || file.name.endsWith(".tsv"))
    ) {
      setCsvFile(file)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setCsvFile(file)
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Datasets</h2>
        <p className="text-muted-foreground">
          Connect your data and validate metadata before evaluation
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* ── Left: Data Connection ─────────────────────────────────────── */}
        <div className="border border-dashed border-border rounded-lg p-6 space-y-5">
          <h3 className="text-base font-semibold">Data Connection</h3>

          {/* Source toggle */}
          <div className="flex bg-muted rounded-lg p-0.5">
            <button
              className={cn(
                "flex-1 py-1.5 text-sm font-medium rounded-md transition-colors",
                sourceType === "local"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground",
              )}
              onClick={() => setSourceType("local")}
            >
              Local Folder
            </button>
            <button
              className={cn(
                "flex-1 py-1.5 text-sm font-medium rounded-md transition-colors",
                sourceType === "s3"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground",
              )}
              onClick={() => setSourceType("s3")}
            >
              AWS S3
            </button>
          </div>

          {/* Path input */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              {sourceType === "s3" ? "S3 Path" : "Folder Path"}
            </Label>
            <Input
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              placeholder={
                sourceType === "s3" ? "s3://fairly-data/" : "/data/images/"
              }
            />
          </div>

          {/* CSV drop zone */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              CSV File
            </Label>
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors hover:border-primary/50",
                dragOver ? "border-primary bg-primary/5" : "border-border",
              )}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
              {csvFile ? (
                <p className="text-sm font-medium">{csvFile.name}</p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Drag &amp; drop or click
                  </p>
                  <p className="text-xs text-muted-foreground/60">.csv, .tsv</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          </div>

          {/* Connect button */}
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => connectMutation.mutate()}
            disabled={connectMutation.isPending || (!folderPath && !csvFile)}
          >
            {connectMutation.isPending ? (
              "Connecting…"
            ) : (
              <>
                <Database className="h-4 w-4 mr-2" />
                {activeDataset ? "Reconnect" : "Connect Dataset"}
              </>
            )}
          </Button>
        </div>

        {/* ── Right: Preview ────────────────────────────────────────────── */}
        {!activeDataset || !preview ? (
          <div className="border border-dashed border-border rounded-lg flex flex-col items-center justify-center py-20 text-muted-foreground">
            <FolderOpen className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">Connect a dataset to see the preview</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Data Preview Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-semibold">Data Preview</h3>
                <span className="text-xs text-muted-foreground">
                  {preview.total_rows} rows &middot; {preview.total_columns}{" "}
                  columns
                </span>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {preview.headers.map((h) => (
                        <TableHead key={h} className="text-xs font-mono">
                          {h}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.rows.map((row, i) => (
                      <TableRow key={i}>
                        {preview.headers.map((h) => (
                          <TableCell key={h} className="text-xs">
                            {String(row[h] ?? "")}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Smart Mapping */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ScanSearch className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">Smart Mapping</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Click each attribute to map it to a column in your data
              </p>
              <div className="flex flex-wrap gap-2">
                {/* Image Path mapping */}
                <MappingPill
                  label="Image Path"
                  headers={preview.headers}
                  value={activeDataset.image_column || ""}
                  onChange={handleImageColumnMapping}
                />
                {/* Dimension mappings */}
                {dimensions.map((dim) => {
                  const mapping = existingCols.find(
                    (c: ColumnMapping) => c.dimension_id === dim.dimension_id,
                  )
                  return (
                    <MappingPill
                      key={dim.dimension_id}
                      label={dim.name}
                      headers={preview.headers}
                      value={mapping?.name || ""}
                      onChange={(col) =>
                        handleDimensionMapping(dim.dimension_id, col)
                      }
                    />
                  )
                })}
              </div>
            </div>

            {/* Image Preview */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold">Image Preview</h3>
              </div>
              <div className="flex gap-3 flex-wrap">
                {Array.from({
                  length: Math.min(6, preview.total_rows),
                }).map((_, i) => (
                  <div
                    key={i}
                    className="w-20 h-20 bg-muted rounded-lg border flex items-center justify-center"
                  >
                    <ImageIcon className="h-6 w-6 text-muted-foreground/30" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Mapping Pill ──────────────────────────────────────────────────────────── */

function MappingPill({
  label,
  headers,
  value,
  onChange,
}: {
  label: string
  headers: string[]
  value: string
  onChange: (column: string) => void
}) {
  return (
    <Select value={value || undefined} onValueChange={(v) => { if (v) onChange(v) }}>
      <SelectTrigger
        className={cn(
          "h-8 rounded-full text-xs min-w-[100px]",
          value
            ? "bg-primary/10 border-primary/30 text-primary"
            : "border-border",
        )}
      >
        <span className="truncate">{label}</span>
      </SelectTrigger>
      <SelectContent>
        {headers.map((h) => (
          <SelectItem key={h} value={h}>
            {h}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
