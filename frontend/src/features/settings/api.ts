import api from "@/lib/axios"
import type { Settings } from "@/types"

export const settingsApi = {
  get: () => api.get<Settings>("/settings").then((r) => r.data),

  update: (data: Partial<Settings>) =>
    api.put<Settings>("/settings", data).then((r) => r.data),
}
