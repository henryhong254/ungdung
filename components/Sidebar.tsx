"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const nav = [
  { href: "/", label: "Dashboard", icon: "📊", roles: ["expert", "assistant"] },
  { href: "/customers", label: "Khách hàng", icon: "👥", roles: ["expert", "assistant"] },
  { href: "/plan", label: "Kế hoạch", icon: "🗓", roles: ["expert", "assistant"] },
  { href: "/time", label: "Hôm Nay", icon: "📅", roles: ["expert", "assistant"] },
  { href: "/time/report", label: "Báo cáo", icon: "📈", roles: ["expert"] },
  { href: "/team", label: "Team", icon: "🔑", roles: ["expert"] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || "assistant";
  const items = nav.filter(item => item.roles.includes(role));

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || (pathname.startsWith(href + "/") && href !== "/time");

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-52 flex-col py-6 px-3 shrink-0" style={{ background: "var(--bg-surface)", borderRight: "1px solid var(--border-dark)" }}>
        <div className="px-3 mb-8">
          <span className="font-semibold text-base tracking-tight" style={{ color: "var(--gold)" }}>Polaris</span>
        </div>
        <nav className="flex flex-col gap-0.5 flex-1">
          {items.map(item => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href} href={item.href}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors"
                style={active
                  ? { background: "rgba(201,168,76,0.15)", color: "var(--gold)" }
                  : { color: "var(--cream-muted)" }
                }
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = "var(--cream)"; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = "var(--cream-muted)"; }}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        {session && (
          <div className="px-3 pt-4" style={{ borderTop: "1px solid var(--border-dark)" }}>
            <p className="text-xs font-medium truncate" style={{ color: "var(--cream)" }}>{session.user?.name}</p>
            <p className="text-xs mb-2" style={{ color: "var(--cream-muted)" }}>{role === "expert" ? "Expert" : "Trợ lý"}</p>
            <button onClick={() => signOut()} className="text-xs transition-colors" style={{ color: "var(--cream-muted)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--cream)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--cream-muted)")}
            >
              Đăng xuất
            </button>
          </div>
        )}
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex" style={{ background: "var(--bg-surface)", borderTop: "1px solid var(--border-dark)" }}>
        {items.map(item => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href} href={item.href}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] transition-colors"
              style={{ color: active ? "var(--gold)" : "var(--cream-muted)" }}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="truncate max-w-full px-0.5">{item.label}</span>
            </Link>
          );
        })}
        {/* Account / logout */}
        {session && (
          <button
            onClick={() => signOut()}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px]"
            style={{ color: "var(--cream-muted)" }}
          >
            <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-white text-[10px] font-bold leading-none">
              {session.user?.name?.split(" ").pop()?.[0]}
            </div>
            <span className="truncate max-w-full px-0.5">{session.user?.name?.split(" ").pop()}</span>
          </button>
        )}
      </nav>
    </>
  );
}
