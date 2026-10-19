import { NavLink, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuth } from "../auth";
import { useNotificationStream } from "../hooks/useNotificationStream";
import { linkButton } from "./ui";

const tabs = [
  { to: "/", label: "Today", end: true },
  { to: "/food", label: "Food", end: false },
  { to: "/exercise", label: "Exercise", end: false },
  { to: "/history", label: "History", end: false },
];

const statusText = { live: "Live", connecting: "Connecting", offline: "Offline" } as const;

export default function Layout() {
  const { token, logout } = useAuth();
  const status = useNotificationStream(token);
  const notifications = useQuery({ queryKey: ["notifications"], queryFn: api.notifications });
  const unread = notifications.data?.filter((n) => !n.isRead).length ?? 0;

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-md items-baseline justify-between px-4 pb-2 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <span className="text-base font-semibold">Fitness Tracker</span>
        <span className="flex items-baseline gap-4">
          <span className={`text-sm ${status === "live" ? "text-water" : "text-muted"}`}>{statusText[status]}</span>
          <button type="button" className={linkButton} onClick={logout}>
            Log out
          </button>
        </span>
      </header>

      <main className="mx-auto w-full max-w-md px-4 pb-32">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 border-t border-line bg-paper pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid max-w-md grid-cols-4">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `-mt-px py-3.5 text-center text-base ${
                  isActive ? "border-t-2 border-ink font-semibold" : "border-t-2 border-transparent text-muted"
                }`
              }
            >
              {tab.label}
              {tab.to === "/" && unread > 0 ? ` (${unread})` : ""}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
