/** Inference card gallery with Pass/Flag audit controls (Story 4.1). */

import type { Inference } from "@/types"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ThumbsUp, ThumbsDown } from "lucide-react"

interface Props {
  inferences: Inference[]
  onAudit: (inferenceId: number, status: string) => void
}

export default function InferenceGallery({ inferences, onAudit }: Props) {
  const audited = inferences.filter((i) => i.audit_status !== "unreviewed").length

  return (
    <div>
      <h3 className="text-lg font-semibold mb-1">Inference Gallery</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Audited: {audited} / {inferences.length}
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {inferences.map((inf) => (
          <Card
            key={inf.inference_id}
            className={
              inf.audit_status === "flag"
                ? "border-red-400"
                : inf.audit_status === "pass"
                  ? "border-green-400"
                  : ""
            }
          >
            <CardContent className="pt-4 space-y-2">
              {/* Thumbnail */}
              {inf.thumbnail_url ? (
                <img
                  src={inf.thumbnail_url}
                  alt={`Image #${inf.image_id}`}
                  className="w-full h-40 object-cover rounded-md bg-muted"
                />
              ) : (
                <div className="w-full h-40 rounded-md bg-muted flex items-center justify-center text-xs text-muted-foreground">
                  No thumbnail
                </div>
              )}

              {/* Prompt text */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Prompt #{inf.prompt_id}
                </p>
                <p className="text-sm leading-relaxed bg-muted/50 rounded p-2">
                  {inf.prompt_text || "—"}
                </p>
              </div>

              {/* Model response */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Response</p>
                <p className="text-sm leading-relaxed">{inf.response}</p>
              </div>

              {/* Audit buttons */}
              <div className="flex items-center gap-2 pt-2">
                <Button
                  size="sm"
                  variant={inf.audit_status === "pass" ? "default" : "outline"}
                  onClick={() => onAudit(inf.inference_id, "pass")}
                >
                  <ThumbsUp className="h-3 w-3 mr-1" /> Pass
                </Button>
                <Button
                  size="sm"
                  variant={inf.audit_status === "flag" ? "destructive" : "outline"}
                  onClick={() => onAudit(inf.inference_id, "flag")}
                >
                  <ThumbsDown className="h-3 w-3 mr-1" /> Flag
                </Button>
                <Badge variant="outline" className="ml-auto text-xs">
                  {inf.audit_status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
