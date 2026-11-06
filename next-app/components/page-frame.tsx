"use client";

import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PageFrame({ children }: { children: React.ReactNode }) { return <AppShell>{children}</AppShell>; }
export function PageHeading({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) { return <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">Gradebook</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1><p className="mt-1 text-sm text-muted-foreground">{subtitle}</p></div>{action}</div>; }
export function LoadingCard() { return <Card><CardHeader><Skeleton className="h-5 w-32" /></CardHeader><CardContent><Skeleton className="h-28 w-full" /></CardContent></Card>; }
export function ErrorState({ message = "Could not load this information." }: { message?: string }) { return <Card><CardContent className="py-12 text-center"><p className="font-medium">Something went wrong</p><p className="mt-1 text-sm text-muted-foreground">{message}</p></CardContent></Card>; }
export function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) { return <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-base">{title}</CardTitle>{action}</CardHeader><CardContent>{children}</CardContent></Card>; }
