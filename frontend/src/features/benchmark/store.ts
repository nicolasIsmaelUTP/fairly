/** Zustand store for the Benchmark Constructor wizard state. */

import { create } from "zustand"

interface BenchmarkState {
  modelId: number | null
  datasetId: number | null
  domainId: number | null
  activeDims: Set<number>
  numImages: number
  resolution: string
  sampleMode: "full" | "recommended" | "custom"
  customSampleSize: number

  setModelId: (id: number | null) => void
  setDatasetId: (id: number | null) => void
  setDomainId: (id: number | null) => void
  toggleDim: (id: number) => void
  setActiveDims: (dims: Set<number>) => void
  setNumImages: (n: number) => void
  setResolution: (r: string) => void
  setSampleMode: (m: "full" | "recommended" | "custom") => void
  setCustomSampleSize: (n: number) => void
  reset: () => void
}

const INITIAL = {
  modelId: null,
  datasetId: null,
  domainId: null,
  activeDims: new Set<number>(),
  numImages: 50,
  resolution: "optimized",
  sampleMode: "recommended" as const,
  customSampleSize: 100,
}

export const useBenchmarkStore = create<BenchmarkState>((set) => ({
  ...INITIAL,

  setModelId: (id) => set({ modelId: id }),
  setDatasetId: (id) => set({ datasetId: id }),
  setDomainId: (id) => set({ domainId: id }),

  toggleDim: (id) =>
    set((s) => {
      const next = new Set(s.activeDims)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { activeDims: next }
    }),

  setActiveDims: (dims) => set({ activeDims: dims }),
  setNumImages: (n) => set({ numImages: n }),
  setResolution: (r) => set({ resolution: r }),
  setSampleMode: (m) => set({ sampleMode: m }),
  setCustomSampleSize: (n) => set({ customSampleSize: n }),
  reset: () => set({ ...INITIAL, activeDims: new Set() }),
}))
