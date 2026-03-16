/** Datasets page — connect data, preview CSV, map columns to dimensions. */

import { useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router-dom"
import { datasetsApi } from "@/features/datasets/api"
import { settingsApi } from "@/features/settings/api"
import { promptsApi } from "@/features/benchmark/api"
import type { ColumnMapping, CsvPreview, Dimension } from "@/types"
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
  FileSpreadsheet,
  AlertTriangle,
  Settings,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function DatasetList() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Settings — check AWS keys
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: settingsApi.get,
  })
  const hasAwsKeys = settings?.has_aws_keys ?? false

  // Form state
  const [sourceType, setSourceType] = useState<"local" | "s3">("local")
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

  // Sync form from active dataset (including sourceType persistence)
  useEffect(() => {
    if (datasets.length > 0 && activeId === null) {
      const ds = datasets[datasets.length - 1]
      setActiveId(ds.dataset_id)
      setFolderPath(ds.imgs_route)
      setSourceType(ds.imgs_route.startsWith("s3://") ? "s3" : "local")
    }
  }, [datasets, activeId])

  // Keep sourceType in sync when activeDataset changes
  useEffect(() => {
    if (activeDataset) {
      setFolderPath(activeDataset.imgs_route)
      setSourceType(activeDataset.imgs_route.startsWith("s3://") ? "s3" : "local")
    }
  }, [activeDataset?.dataset_id]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── Mapped columns set (for highlighting + filtering) ────────────────────
  const mappedColumns = useMemo(() => {
    const set = new Set<string>()
    if (activeDataset?.image_column) set.add(activeDataset.image_column)
    existingCols.forEach((c: ColumnMapping) => set.add(c.name))
    return set
  }, [activeDataset?.image_column, existingCols])

  // Available (unmapped) headers
  const unmappedHeaders = useMemo(() => {
    return (preview?.headers ?? []).filter((h) => !mappedColumns.has(h))
  }, [preview?.headers, mappedColumns])

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

  // CSV already uploaded?
  const hasCsv = !!activeDataset?.csv_route

  // Image paths from preview rows
  const previewImagePaths = useMemo(() => {
    if (!preview || !activeDataset?.image_column) return []
    return preview.rows
      .map((row) => String(row[activeDataset.image_column] ?? ""))
      .filter(Boolean)
  }, [preview, activeDataset?.image_column])

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

      {/* ── Row 1: Connection + CSV Upload (compact) ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4">
        {/* Data Connection */}
        <div className="border border-dashed rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold">Data Connection</h3>

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

          {/* S3 without keys warning */}
          {sourceType === "s3" && !hasAwsKeys && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">AWS credentials not configured</p>
                <p className="mt-0.5">
                  Go to{" "}
                  <Link to="/settings" className="underline font-medium">
                    Settings
                  </Link>{" "}
                  to add your AWS access key and secret key.
                </p>
              </div>
            </div>
          )}

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
              disabled={sourceType === "s3" && !hasAwsKeys}
            />
          </div>

          {/* Connect button */}
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => connectMutation.mutate()}
            disabled={
              connectMutation.isPending ||
              (!folderPath && !csvFile) ||
              (sourceType === "s3" && !hasAwsKeys)
            }
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

        {/* CSV Upload — compact when already uploaded */}
        <div className="border border-dashed rounded-lg p-5 space-y-3">
          <h3 className="text-sm font-semibold">CSV Metadata</h3>

          {hasCsv && !csvFile ? (
            /* Compact: show file name + replace button */
            <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50 border">
              <FileSpreadsheet className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {activeDataset?.csv_route.split(/[\\/]/).pop()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {preview
                    ? `${preview.total_rows} rows · ${preview.total_columns} columns`
                    : "Connected"}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Replace
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          ) : (
            /* Drop zone */
            <>
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors hover:border-primary/50",
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
                <Upload className="mx-auto h-6 w-6 text-muted-foreground/40 mb-1.5" />
                {csvFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <p className="text-sm font-medium">{csvFile.name}</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setCsvFile(null)
                      }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Drag &amp; drop or click
                    </p>
                    <p className="text-xs text-muted-foreground/60">
                      .csv, .tsv
                    </p>
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
              {csvFile && (
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => connectMutation.mutate()}
                  disabled={connectMutation.isPending}
                >
                  {connectMutation.isPending ? "Uploading…" : "Upload CSV"}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── No dataset yet ────────────────────────────────────────────── */}
      {!activeDataset || !preview ? (
        <div className="border border-dashed rounded-lg flex flex-col items-center justify-center py-16 text-muted-foreground">
          <FolderOpen className="h-10 w-10 mb-3 opacity-25" />
          <p className="text-sm">Connect a dataset to see the preview</p>
        </div>
      ) : (
        <>
          {/* ── Data Preview Table (full width) ──────────────────────── */}
          <div className="border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between bg-muted/30">
              <h3 className="text-sm font-semibold">Data Preview</h3>
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
                      <TableHead
                        key={h}
                        className={cn(
                          "text-xs font-mono",
                          mappedColumns.has(h) &&
                            "bg-primary/8 text-primary font-semibold",
                        )}
                      >
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.rows.map((row, i) => (
                    <TableRow key={i}>
                      {preview.headers.map((h) => (
                        <TableCell
                          key={h}
                          className={cn(
                            "text-xs",
                            mappedColumns.has(h) && "bg-primary/5",
                          )}
                        >
                          {String(row[h] ?? "")}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* ── Smart Mapping + Image Preview side by side ────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4">
            {/* Smart Mapping */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ScanSearch className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Smart Mapping</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Map each attribute to a column in your data. Only unmapped
                columns are shown.
              </p>
              <div className="flex flex-wrap gap-2">
                {/* Image Path mapping */}
                <MappingPill
                  label="Image Path"
                  availableHeaders={unmappedHeaders}
                  currentValue={activeDataset.image_column || ""}
                  allHeaders={preview.headers}
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
                      availableHeaders={unmappedHeaders}
                      currentValue={mapping?.name || ""}
                      allHeaders={preview.headers}
                      onChange={(col) =>
                        handleDimensionMapping(dim.dimension_id, col)
                      }
                    />
                  )
                })}
              </div>
            </div>

            {/* Image Preview */}
            <div className="border rounded-lg p-4 space-y-3 min-w-[280px]">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Image Preview</h3>
              </div>
              <div className="flex gap-2 flex-wrap">
                {previewImagePaths.length > 0
                  ? previewImagePaths.map((imgPath, i) => (
                      <div
                        key={i}
                        className="w-20 h-20 rounded-lg border overflow-hidden bg-muted"
                      >
                        <img
                          src={`/api/datasets/${activeId}/image-proxy?key=${encodeURIComponent(imgPath)}`}
                          alt={`Preview ${i + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const el = e.currentTarget
                            el.style.display = "none"
                            el.parentElement!.classList.add(
                              "flex",
                              "items-center",
                              "justify-center",
                            )
                            const icon = document.createElement("div")
                            icon.innerHTML = "?"
                            icon.className =
                              "text-muted-foreground/30 text-lg"
                            el.parentElement!.appendChild(icon)
                          }}
                        />
                      </div>
                    ))
                  : Array.from({
                      length: Math.min(5, preview.total_rows),
                    }).map((_, i) => (
                      <div
                        key={i}
                        className="w-20 h-20 bg-muted rounded-lg border flex items-center justify-center"
                      >
                        <ImageIcon className="h-5 w-5 text-muted-foreground/20" />
                      </div>
                    ))}
              </div>
              {!activeDataset?.image_column && (
                <p className="text-xs text-muted-foreground italic">
                  Map "Image Path" to see previews
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/* ── Mapping Pill ──────────────────────────────────────────────────────────── */

function MappingPill({
  label,
  availableHeaders,
  currentValue,
  allHeaders,
  onChange,
}: {
  label: string
  availableHeaders: string[]
  currentValue: string
  allHeaders: string[]
  onChange: (column: string) => void
}) {
  // Show: current value (always) + unmapped headers
  const options = currentValue
    ? [currentValue, ...availableHeaders.filter((h) => h !== currentValue)]
    : availableHeaders

  return (
    <Select
      value={currentValue || undefined}
      onValueChange={(v) => {
        if (v) onChange(v)
      }}
    >
      <SelectTrigger
        className={cn(
          "h-8 rounded-full text-xs min-w-[100px]",
          currentValue
            ? "bg-primary/10 border-primary/30 text-primary"
            : "border-border",
        )}
      >
        <span className="truncate">{label}</span>
      </SelectTrigger>
      <SelectContent>
        {options.map((h) => (
          <SelectItem key={h} value={h}>
            {h}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
