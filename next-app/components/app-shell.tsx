"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenText, Calculator, ChartDonut, Gear, GraduationCap, Moon, Sun } from "@phosphor-icons/react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [{ href: "/", label: "Overview", icon: ChartDonut }, { href: "/students", label: "Students", icon: GraduationCap }, { href: "/subjects", label: "Subjects", icon: BookOpenText }, { href: "/calculator", label: "Grade calculator", icon: Calculator }, { href: "/settings", label: "Settings", icon: Gear }];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  return <div className="min-h-screen bg-muted/30 md:flex">
    <aside className="border-b bg-card md:fixed md:inset-y-0 md:w-64 md:border-b-0 md:border-r">
      <div className="flex h-full flex-col px-4 py-5 md:px-5"><Link href="/" className="flex items-center gap-3 px-2"><span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><GraduationCap size={23} weight="fill" /></span><span><strong className="block text-sm tracking-tight">Gradebook</strong><span className="text-xs text-muted-foreground">Academic workspace</span></span></Link>
      <nav className="mt-8 flex gap-1 overflow-x-auto md:flex-col">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={cn("flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground", path === href || (href !== "/" && path.startsWith(href)) ? "bg-primary/10 font-medium text-primary" : "")}><Icon size={19} />{label}</Link>)}</nav>
      <div className="mt-auto hidden rounded-xl bg-muted/70 p-4 md:block"><p className="text-xs font-semibold">A clear view of progress.</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Keep every mark and student report in one place.</p></div></div>
    </aside>
    <div className="min-w-0 flex-1 md:ml-64"><header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/90 px-5 backdrop-blur md:px-9"><div><p className="text-xs text-muted-foreground">ACADEMIC MANAGEMENT</p><p className="text-sm font-medium">{links.find((l) => l.href === path)?.label ?? "Student report"}</p></div><Button variant="ghost" size="icon" aria-label="Toggle color theme" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}><Sun className="hidden dark:block" /><Moon className="dark:hidden" /></Button></header><main className="mx-auto w-full max-w-7xl p-5 md:p-9">{children}</main></div>
  </div>;
}
