import { useState } from "react"
import { NavLink, Outlet } from "react-router-dom"
import {
  LayoutDashboard,
  BrainCircuit,
  Database,
  FlaskConical,
  BarChart3,
  Settings,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react"

const NAV_ITEMS = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/models", icon: BrainCircuit, label: "Models" },
  { to: "/datasets", icon: Database, label: "Datasets" },
  { to: "/benchmark", icon: FlaskConical, label: "Benchmarks" },
  { to: "/results", icon: BarChart3, label: "Results" },
]

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex h-screen">
      <aside
        className={`${
          collapsed ? "w-16" : "w-56"
        } border-r bg-sidebar flex flex-col transition-all duration-200`}
      >
        {/* Logo + brand */}
        <div className="p-3 border-b border-sidebar-border flex items-center gap-3 min-h-14">
          <img
            src="/logo.png"
            alt="fairly"
            className="h-8 w-8 rounded-lg shrink-0"
          />
          {!collapsed && (
            <h1 className="text-lg font-bold tracking-tight text-sidebar-foreground leading-tight">
              fairly
            </h1>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 space-y-1">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md text-sm font-medium transition-colors ${
                  collapsed ? "justify-center px-2 py-2" : "px-3 py-2"
                } ${
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Settings at bottom */}
        <div className="px-2 pb-3 border-t border-sidebar-border pt-2">
          <NavLink
            to="/settings"
            title={collapsed ? "Settings" : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md text-sm font-medium transition-colors ${
                collapsed ? "justify-center px-2 py-2" : "px-3 py-2"
              } ${
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`
            }
          >
            <Settings className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Settings</span>}
          </NavLink>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden bg-background">
        <div className="flex items-center px-4 h-10 border-b shrink-0">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded text-muted-foreground/40 hover:text-muted-foreground transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
