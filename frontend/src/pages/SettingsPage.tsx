import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { settingsApi } from "@/features/settings/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Save, Check, Eye, EyeOff, ShieldCheck, ShieldAlert } from "lucide-react"

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const [showKeys, setShowKeys] = useState(false)

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: settingsApi.get,
  })

  // Individual key fields — empty means "no change"
  const [featherlessKey, setFeatherlessKey] = useState("")
  const [awsAccessKey, setAwsAccessKey] = useState("")
  const [awsSecretKey, setAwsSecretKey] = useState("")

  const mutation = useMutation({
    mutationFn: (data: Record<string, string>) => settingsApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] })
      setFeatherlessKey("")
      setAwsAccessKey("")
      setAwsSecretKey("")
    },
  })

  const handleSave = () => {
    const payload: Record<string, string> = {}
    if (featherlessKey) payload.featherless_key = featherlessKey
    if (awsAccessKey) payload.aws_access_key = awsAccessKey
    if (awsSecretKey) payload.aws_secret_access_key = awsSecretKey
    if (Object.keys(payload).length === 0) return
    mutation.mutate(payload)
  }

  if (!settings) return <p className="text-muted-foreground">Loading…</p>

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-muted-foreground">
          Manage connections, API keys, and preferences
        </p>
      </div>

      {/* API Keys */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">API Keys</CardTitle>
          <button
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowKeys(!showKeys)}
          >
            {showKeys ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
            {showKeys ? "Hide" : "Show"}
          </button>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Featherless */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Featherless.ai
              </Label>
              {settings.has_featherless_key ? (
                <Badge variant="outline" className="text-xs gap-1 text-emerald-600 border-emerald-200 bg-emerald-50">
                  <ShieldCheck className="h-3 w-3" /> Configured
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs gap-1 text-muted-foreground">
                  <ShieldAlert className="h-3 w-3" /> Not configured
                </Badge>
              )}
            </div>
            <Input
              type={showKeys ? "text" : "password"}
              placeholder={settings.has_featherless_key ? settings.featherless_key : "flk_..."}
              value={featherlessKey}
              onChange={(e) => setFeatherlessKey(e.target.value)}
            />
          </div>

          {/* AWS Access Key */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                AWS Access Key
              </Label>
              {settings.has_aws_keys ? (
                <Badge variant="outline" className="text-xs gap-1 text-emerald-600 border-emerald-200 bg-emerald-50">
                  <ShieldCheck className="h-3 w-3" /> Configured
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs gap-1 text-muted-foreground">
                  <ShieldAlert className="h-3 w-3" /> Not configured
                </Badge>
              )}
            </div>
            <Input
              type={showKeys ? "text" : "password"}
              placeholder={settings.has_aws_keys ? settings.aws_access_key : "AKIA..."}
              value={awsAccessKey}
              onChange={(e) => setAwsAccessKey(e.target.value)}
            />
          </div>

          {/* AWS Secret */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                AWS Secret Access Key
              </Label>
            </div>
            <Input
              type={showKeys ? "text" : "password"}
              placeholder={settings.has_aws_keys ? settings.aws_secret_access_key : "wJalrX..."}
              value={awsSecretKey}
              onChange={(e) => setAwsSecretKey(e.target.value)}
            />
          </div>

          {/* Security notice */}
          <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-800">
            <p className="font-medium">⚠️ Security Best Practice: Please provide credentials for an IAM User with <code className="bg-amber-100 px-1 py-0.5 rounded text-[11px]">AmazonS3ReadOnlyAccess</code> only.</p>
            <p className="mt-1 text-amber-700">Do not use Administrator keys.</p>
            <p className="mt-1 text-amber-600 italic">If left blank, fairly will auto-detect your local AWS CLI credentials or environment variables.</p>
          </div>

          {/* Save */}
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleSave}
            disabled={mutation.isPending || (!featherlessKey && !awsAccessKey && !awsSecretKey)}
          >
            {mutation.isSuccess ? (
              <><Check className="h-4 w-4 mr-2" /> Saved</>
            ) : (
              <><Save className="h-4 w-4 mr-2" /> {mutation.isPending ? "Saving…" : "Save Changes"}</>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
