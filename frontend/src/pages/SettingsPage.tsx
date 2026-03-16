import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { settingsApi } from "@/features/settings/api"
import { settingsSchema, type SettingsFormValues } from "@/lib/schemas"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Save, Check } from "lucide-react"

export default function SettingsPage() {
  const queryClient = useQueryClient()

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: settingsApi.get,
  })

  const {
    register,
    handleSubmit,
    reset,
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { featherless_key: "", aws_access_key: "", aws_secret_access_key: "" },
  })

  // Populate form when settings load
  useEffect(() => {
    if (settings) {
      reset({
        featherless_key: settings.featherless_key,
        aws_access_key: settings.aws_access_key,
        aws_secret_access_key: settings.aws_secret_access_key,
      })
    }
  }, [settings, reset])

  const mutation = useMutation({
    mutationFn: (data: SettingsFormValues) => settingsApi.update(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
  })

  if (!settings) return <p className="text-muted-foreground">Loading…</p>

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-muted-foreground">
          Configure your API keys and preferences.
        </p>
      </div>

      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Featherless.ai</CardTitle>
          </CardHeader>
          <CardContent>
            <Label htmlFor="featherless_key">API Key</Label>
            <Input
              id="featherless_key"
              type="password"
              placeholder="fl-..."
              {...register("featherless_key")}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">AWS S3</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="aws_access_key">Access Key</Label>
              <Input
                id="aws_access_key"
                type="password"
                {...register("aws_access_key")}
              />
            </div>
            <div>
              <Label htmlFor="aws_secret_access_key">Secret Access Key</Label>
              <Input
                id="aws_secret_access_key"
                type="password"
                {...register("aws_secret_access_key")}
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isSuccess ? (
            <><Check className="h-4 w-4 mr-2" /> Saved</>
          ) : (
            <><Save className="h-4 w-4 mr-2" /> {mutation.isPending ? "Saving…" : "Save Settings"}</>
          )}
        </Button>
      </form>
    </div>
  )
}
