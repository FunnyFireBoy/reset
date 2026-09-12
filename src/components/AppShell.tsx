import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Crown, User } from "lucide-react";
import type { ReactNode } from "react";

export function GemPill({ gems, name }: { gems: number; name?: string | undefined }) {
  return (
    <div className="cloud-card flex items-center gap-2 px-4 py-1.5 text-sm font-bold">
      {name ? <span className="max-w-24 truncate font-hand text-lg">{name}</span> : null}
      <span className="tabular-nums">{gems}</span>
      <span className="text-gem">💎</span>
    </div>
  );
}

function CloudBand() {
  return (
    <svg
      viewBox="0 0 400 90"
      preserveAspectRatio="none"
      className="pointer-events-none absolute -top-10 left-0 h-14 w-full"
      aria-hidden="true"
    >
      <path
        d="M0 90 L0 60 Q20 34 48 44 Q58 16 90 22 Q108 0 134 16 Q160 4 176 28 Q206 18 218 44 Q248 28 262 50 Q292 36 306 56 Q334 42 350 62 Q376 52 400 68 L400 90 Z"
        fill="var(--cloud)"
      />
    </svg>
  );
}

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = [
    { to: "/", label: "Home", icon: Home },
    { to: "/quests", label: "Quests", icon: Crown },
    { to: "/account", label: "Account", icon: User },
  ] as const;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md">
      <div className="relative bg-cloud pt-3 pb-3">
        <CloudBand />
        <ul className="relative grid grid-cols-3">
          {items.map(({ to, label, icon: Icon }) => {
            const active = pathname === to;
            return (
              <li key={to} className="flex justify-center">
                <Link
                  to={to}
                  className={`flex flex-col items-center gap-0.5 px-3 ${
                    active ? "text-accent" : "text-foreground/70"
                  }`}
                >
                  <Icon className="size-7" strokeWidth={active ? 2.6 : 2} />
                  <span className="font-hand text-lg leading-none">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

export function AppShell({
  children,
  header,
}: {
  children: ReactNode;
  header?: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      {header ? (
        <header className="sticky top-0 z-20 flex justify-end px-4 pt-4 pb-2">{header}</header>
      ) : null}
      <main className="flex-1 px-4 pb-36">{children}</main>
      <BottomNav />
    </div>
  );
}
