import { useEffect, useState } from "react"
import {
  fetchSettings,
  updateSettings,
  type Settings,
} from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Save } from "lucide-react"

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchSettings().then(setSettings).catch(console.error)
  }, [])

  const handleSave = async () => {
    if (!settings) return
    await updateSettings({
      featherless_key: settings.featherless_key,
      aws_access_key: settings.aws_access_key,
      aws_secret_access_key: settings.aws_secret_access_key,
      theme: settings.theme,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!settings) return <p className="text-muted-foreground">Loading…</p>

  const update = (field: keyof Settings, value: string) =>
    setSettings({ ...settings, [field]: value })

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-muted-foreground">
          Configure your API keys and preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Featherless.ai</CardTitle>
        </CardHeader>
        <CardContent>
          <Label>API Key</Label>
          <Input
            type="password"
            value={settings.featherless_key}
            onChange={(e) => update("featherless_key", e.target.value)}
            placeholder="fl-..."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">AWS S3</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Access Key</Label>
            <Input
              type="password"
              value={settings.aws_access_key}
              onChange={(e) => update("aws_access_key", e.target.value)}
            />
          </div>
          <div>
            <Label>Secret Access Key</Label>
            <Input
              type="password"
              value={settings.aws_secret_access_key}
              onChange={(e) => update("aws_secret_access_key", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full">
        <Save className="h-4 w-4 mr-2" />
        {saved ? "Saved ✓" : "Save Settings"}
      </Button>
    </div>
  )
}
