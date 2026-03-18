/** Inference gallery: grouped-by-prompt accordion with compact table rows. */

import { useState } from "react"
import type { Inference } from "@/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ThumbsUp, ThumbsDown, ChevronDown, ChevronRight } from "lucide-react"

interface Props {
  inferences: Inference[]
  onAudit: (inferenceId: number, status: string) => void
}

export default function InferenceGallery({ inferences, onAudit }: Props) {
  const audited = inferences.filter((i) => i.audit_status !== "unreviewed").length

  // Group inferences by prompt_id
  const grouped = new Map<number, { text: string; items: Inference[] }>()
  for (const inf of inferences) {
    if (!grouped.has(inf.prompt_id)) {
      grouped.set(inf.prompt_id, { text: inf.prompt_text || `Prompt #${inf.prompt_id}`, items: [] })
    }
    grouped.get(inf.prompt_id)!.items.push(inf)
  }

  const [openGroups, setOpenGroups] = useState<Set<number>>(() => {
    // Open first group by default
    const first = grouped.keys().next().value
    return first !== undefined ? new Set([first]) : new Set()
  })

  const toggle = (pid: number) => {
    setOpenGroups((prev) => {
      const next = new Set(prev)
      if (next.has(pid)) next.delete(pid)
      else next.add(pid)
      return next
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Inference Results</h3>
          <p className="text-xs text-muted-foreground">
            {inferences.length} inferences · {audited} audited · {grouped.size} prompts
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {Array.from(grouped.entries()).map(([promptId, group]) => {
          const isOpen = openGroups.has(promptId)
          const errors = group.items.filter((i) => i.response.startsWith("[ERROR]") || i.response.startsWith("[SKIPPED]")).length
          const flagged = group.items.filter((i) => i.audit_status === "flag").length

          return (
            <div key={promptId} className="border rounded-lg overflow-hidden">
              {/* Accordion header */}
              <button
                onClick={() => toggle(promptId)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
              >
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{group.text}</p>
                  <p className="text-xs text-muted-foreground">
                    {group.items.length} images
                    {errors > 0 && <span className="text-red-500 ml-2">{errors} errors</span>}
                    {flagged > 0 && <span className="text-red-500 ml-2">{flagged} flagged</span>}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs shrink-0">
                  Prompt #{promptId}
                </Badge>
              </button>

              {/* Table body */}
              {isOpen && (
                <div className="border-t">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left px-4 py-2 font-medium text-xs text-muted-foreground w-20">Image</th>
                        <th className="text-left px-4 py-2 font-medium text-xs text-muted-foreground">Response</th>
                        <th className="text-left px-4 py-2 font-medium text-xs text-muted-foreground w-28">Status</th>
                        <th className="text-right px-4 py-2 font-medium text-xs text-muted-foreground w-36">Audit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.items.map((inf) => (
                        <tr
                          key={inf.inference_id}
                          className={`border-b last:border-b-0 ${
                            inf.audit_status === "flag"
                              ? "bg-red-50 dark:bg-red-950/20"
                              : inf.audit_status === "pass"
                                ? "bg-green-50 dark:bg-green-950/20"
                                : ""
                          }`}
                        >
                          <td className="px-4 py-2">
                            {inf.thumbnail_url ? (
                              <img
                                src={inf.thumbnail_url}
                                alt={`img ${inf.image_id}`}
                                className="w-14 h-14 object-cover rounded bg-muted"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded bg-muted flex items-center justify-center text-[10px] text-muted-foreground">
                                N/A
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <p className={`text-sm ${
                              inf.response.startsWith("[ERROR]") || inf.response.startsWith("[SKIPPED]")
                                ? "text-red-600 dark:text-red-400"
                                : ""
                            }`}>
                              {inf.response}
                            </p>
                          </td>
                          <td className="px-4 py-2">
                            <Badge
                              variant={
                                inf.audit_status === "flag"
                                  ? "destructive"
                                  : inf.audit_status === "pass"
                                    ? "default"
                                    : "outline"
                              }
                              className="text-xs"
                            >
                              {inf.audit_status}
                            </Badge>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <div className="inline-flex gap-1">
                              <Button
                                size="sm"
                                variant={inf.audit_status === "pass" ? "default" : "outline"}
                                className="h-7 px-2"
                                onClick={() => onAudit(inf.inference_id, "pass")}
                              >
                                <ThumbsUp className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant={inf.audit_status === "flag" ? "destructive" : "outline"}
                                className="h-7 px-2"
                                onClick={() => onAudit(inf.inference_id, "flag")}
                              >
                                <ThumbsDown className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
