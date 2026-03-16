/** Domain picker + Dimension toggle switches — core of the Benchmark Constructor. */

import { useQuery } from "@tanstack/react-query"
import { promptsApi } from "@/features/benchmark/api"
import { useBenchmarkStore } from "@/features/benchmark/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function DimensionToggles() {
  const { domainId, setDomainId, activeDims, toggleDim } = useBenchmarkStore()

  const { data: domains = [] } = useQuery({
    queryKey: ["domains"],
    queryFn: promptsApi.domains,
  })

  const { data: dimensions = [] } = useQuery({
    queryKey: ["dimensions"],
    queryFn: promptsApi.dimensions,
  })

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Use Case (Domain)</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={domainId ? String(domainId) : ""}
            onValueChange={(v) => { if (v) setDomainId(Number(v)) }}
          >
            <SelectTrigger><SelectValue placeholder="Choose a domain" /></SelectTrigger>
            <SelectContent>
              {domains.map((d) => (
                <SelectItem key={d.domain_id} value={String(d.domain_id)}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">3. Bias Dimensions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {dimensions.map((dim) => (
            <div key={dim.dimension_id} className="flex items-center justify-between">
              <Label>{dim.name}</Label>
              <Switch
                checked={activeDims.has(dim.dimension_id)}
                onCheckedChange={() => toggleDim(dim.dimension_id)}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  )
}
