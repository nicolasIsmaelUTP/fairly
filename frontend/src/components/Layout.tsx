import { NavLink, Outlet } from "react-router-dom"
import {
  LayoutDashboard,
  BrainCircuit,
  Database,
  FlaskConical,
  Settings,
} from "lucide-react"

const NAV_ITEMS = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/models", icon: BrainCircuit, label: "Models" },
  { to: "/datasets", icon: Database, label: "Datasets" },
  { to: "/benchmark", icon: FlaskConical, label: "Benchmark" },
  { to: "/settings", icon: Settings, label: "Settings" },
]

export default function Layout() {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-56 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold tracking-tight">fairly</h1>
          <p className="text-xs text-muted-foreground">Bias Evaluation Toolkit</p>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent text-foreground"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t text-xs text-muted-foreground">
          v0.1.0
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
