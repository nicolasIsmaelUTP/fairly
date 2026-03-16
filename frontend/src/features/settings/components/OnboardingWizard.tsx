/** Onboarding wizard — shown on first app visit when no API keys are configured. */

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { settingsApi } from "@/features/settings/api"
import { settingsSchema, type SettingsFormValues } from "@/lib/schemas"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Sparkles, ArrowRight, Check } from "lucide-react"

interface Props {
  onComplete: () => void
}

export default function OnboardingWizard({ onComplete }: Props) {
  const [step, setStep] = useState(0)
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { featherless_key: "", aws_access_key: "", aws_secret_access_key: "" },
  })

  const mutation = useMutation({
    mutationFn: (data: SettingsFormValues) => settingsApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] })
      onComplete()
    },
  })

  const onSubmit = (data: SettingsFormValues) => mutation.mutate(data)

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <Sparkles className="mx-auto h-10 w-10 text-primary mb-2" />
          <CardTitle className="text-2xl">Welcome to fairly</CardTitle>
          <p className="text-muted-foreground text-sm mt-1">
            Let's configure your credentials so you can start evaluating models.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Step 0: Featherless */}
            {step === 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Featherless.ai API Key</h3>
                <p className="text-xs text-muted-foreground">
                  Connect an open-source VLM catalog. You can skip this and add it later in Settings.
                </p>
                <div>
                  <Label htmlFor="featherless_key">API Key</Label>
                  <Input
                    id="featherless_key"
                    type="password"
                    placeholder="fl-..."
                    {...register("featherless_key")}
                  />
                  {errors.featherless_key && (
                    <p className="text-xs text-destructive mt-1">{errors.featherless_key.message}</p>
                  )}
                </div>
                <Button type="button" className="w-full" onClick={() => setStep(1)}>
                  Next <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Step 1: AWS S3 */}
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">AWS S3 Credentials</h3>
                <p className="text-xs text-muted-foreground">
                  Required only if your images are stored on S3. Skip if using local paths.
                </p>
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
                <Separator />
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setStep(0)}>
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" disabled={mutation.isPending}>
                    <Check className="h-4 w-4 mr-2" />
                    {mutation.isPending ? "Saving…" : "Finish Setup"}
                  </Button>
                </div>
              </div>
            )}
          </form>

          {/* Skip link */}
          <button
            type="button"
            onClick={onComplete}
            className="w-full text-center text-xs text-muted-foreground mt-4 hover:underline"
          >
            Skip for now — I'll configure later
          </button>
        </CardContent>
      </Card>
    </div>
  )
}
