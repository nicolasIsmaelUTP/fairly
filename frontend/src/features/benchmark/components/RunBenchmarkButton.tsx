/** "Run Benchmark" button with validation feedback. */

import { useMutation } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { evaluationsApi } from "@/features/evaluations/api"
import { useBenchmarkStore } from "@/features/benchmark/store"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { FlaskConical } from "lucide-react"

export default function RunBenchmarkButton() {
  const navigate = useNavigate()
  const { modelId, datasetId, domainId, activeDims, numImages, resolution, reset } =
    useBenchmarkStore()

  const canRun = modelId && datasetId && domainId && activeDims.size > 0

  const mutation = useMutation({
    mutationFn: () =>
      evaluationsApi.create({
        model_id: modelId!,
        dataset_id: datasetId!,
        domain_id: domainId!,
        dimension_ids: Array.from(activeDims),
        num_images: numImages,
        images_resolution: resolution,
      }),
    onSuccess: (ev) => {
      reset()
      navigate(`/evaluations/${ev.evaluation_id}`)
    },
  })

  return (
    <>
      <Separator />
      <Button
        size="lg"
        className="w-full"
        disabled={!canRun || mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        <FlaskConical className="h-4 w-4 mr-2" />
        {mutation.isPending ? "Launching…" : "Run Benchmark"}
      </Button>
    </>
  )
}
