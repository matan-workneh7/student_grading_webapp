"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowUpRight, GraduationCap, Medal, TrendUp, TrendDown } from "@phosphor-icons/react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ErrorState, LoadingCard, PageFrame, PageHeading } from "@/components/page-frame";
import { useStats } from "@/hooks/use-api";

export default function Dashboard() {
  const { data, isLoading, isError } = useStats(); const stats = data?.data;
  return <PageFrame><PageHeading title="Overview" subtitle="A snapshot of your class performance." action={<Link href="/students" className="text-sm font-medium text-primary">View students <ArrowUpRight className="inline" /></Link>} />
    {isLoading ? <div className="grid gap-4 md:grid-cols-4"><LoadingCard /><LoadingCard /><LoadingCard /><LoadingCard /></div> : isError || !stats ? <ErrorState /> : <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[{ label: "Students", value: stats.student_count, Icon: GraduationCap, note: "Enrolled in this class" }, { label: "Class average", value: `${stats.class_average.toFixed(2)}%`, Icon: TrendUp, note: "Across all student reports" }, { label: "Highest average", value: stats.highest ? `${stats.highest.average.toFixed(2)}%` : "—", Icon: Medal, note: stats.highest?.student.name ?? "No grades yet" }, { label: "Lowest average", value: stats.lowest ? `${stats.lowest.average.toFixed(2)}%` : "—", Icon: TrendDown, note: stats.lowest?.student.name ?? "No grades yet" }].map(({ label, value, Icon, note }) => <Card key={label}><CardContent className="flex items-start justify-between p-5"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{note}</p></div><span className="rounded-lg bg-primary/10 p-2 text-primary"><Icon size={21} /></span></CardContent></Card>)}</div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.9fr]"><Card><CardHeader><CardTitle className="text-base">Grade distribution</CardTitle></CardHeader><CardContent><div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={Object.entries(stats.distribution).map(([grade, count]) => ({ grade, count }))} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}><CartesianGrid vertical={false} strokeDasharray="3 3" /><XAxis dataKey="grade" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="var(--primary)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div><div className="flex flex-wrap gap-2">{Object.entries(stats.distribution).map(([letter, count]) => <Badge key={letter} variant="secondary">{letter}: {count}</Badge>)}</div></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Per-subject averages</CardTitle></CardHeader><CardContent className="px-0"><Table><TableHeader><TableRow><TableHead className="pl-6">Subject</TableHead><TableHead>Average</TableHead><TableHead>Range</TableHead></TableRow></TableHeader><TableBody>{stats.per_subject.map(({ subject, average, highest, lowest }) => <TableRow key={subject.id}><TableCell className="pl-6 font-medium">{subject.name}<span className="block text-xs font-normal text-muted-foreground">{subject.code}</span></TableCell><TableCell>{average.toFixed(2)}%</TableCell><TableCell>{lowest.toFixed(0)}–{highest.toFixed(0)}</TableCell></TableRow>)}{!stats.per_subject.length && <TableRow><TableCell colSpan={3} className="py-10 text-center text-muted-foreground">No subjects yet</TableCell></TableRow>}</TableBody></Table></CardContent></Card></div>
    </>}</PageFrame>;
}
