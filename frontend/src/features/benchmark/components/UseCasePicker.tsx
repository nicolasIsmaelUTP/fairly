import { useQuery } from "@tanstack/react-query"
import { promptsApi } from "@/features/benchmark/api"
import { useBenchmarkStore } from "@/features/benchmark/store"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function UseCasePicker() {
  const { domainId, setDomainId } = useBenchmarkStore()

  const { data: domains = [] } = useQuery({
    queryKey: ["domains"],
    queryFn: promptsApi.domains,
  })

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Use Case</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {domains.map((d) => (
            <button
              key={d.domain_id}
              onClick={() => setDomainId(d.domain_id)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-colors border ${
                domainId === d.domain_id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground border-border hover:bg-muted"
              }`}
            >
              {d.name}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
