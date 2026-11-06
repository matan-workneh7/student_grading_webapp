"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ApiError, api } from "@/lib/api";
import { useApiMutation, useReport, useStudent, useSubjects } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ErrorState, LoadingCard, PageFrame, PageHeading, SectionCard } from "@/components/page-frame";

const markSchema = z.object({ mark: z.coerce.number().min(0).max(100) });

export default function StudentDetail({ params }: { params: Promise<{ id: string }> }) {
  const id = Number(use(params).id);
  const studentQuery = useStudent(id);
  const report = useReport(id);
  const subjects = useSubjects();
  const [subjectId, setSubjectId] = useState("");
  const [newMark, setNewMark] = useState("0");
  const invalidate: readonly unknown[][] = [["report", id], ["student", id], ["stats"], ["students"]];
  const save = useApiMutation((values: { subject_id: number; mark: number }[]) => api.upsertGrades(id, values), invalidate);
  const remove = useApiMutation((subjectId: number) => api.deleteGrade(id, subjectId), invalidate);
  const noMarks = report.error instanceof ApiError && report.error.status === 422 && "grades" in report.error.fields;

  if (studentQuery.isLoading || (report.isLoading && !report.data)) {
    return <PageFrame><LoadingCard /></PageFrame>;
  }

  if (studentQuery.isError || !studentQuery.data || (report.isError && !noMarks)) {
    return <PageFrame><ErrorState message="The requested student report could not be found." /></PageFrame>;
  }

  const student = report.data?.data.student ?? studentQuery.data.data;
  const entries = report.data?.data.entries ?? [];
  const available = subjects.data?.data.filter((subject) => !entries.some((entry) => entry.subject.id === subject.id)) ?? [];
  const value = report.data?.data;

  return (
    <PageFrame>
      <PageHeading
        title={student.name}
        subtitle={`${student.student_number ?? `Student ${id}`} · Section ${student.section ?? "—"}`}
        action={<Link href="/students" className="text-sm text-primary">← All students</Link>}
      />
      {value ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Weighted total", value: value.weighted_total.toFixed(2) },
            { label: "Average", value: `${value.average.toFixed(2)}%` },
            { label: "Letter grade", value: value.letter },
            { label: "Class rank", value: `${value.rank} / ${value.class_size}` },
          ].map((item) => (
            <Card key={item.label}>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold">{item.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
          Add a subject mark to calculate this student’s result.
        </p>
      )}
      <div className="mt-5">
        <SectionCard
          title="Subject marks"
          action={available.length > 0 ? (
            <div className="flex gap-2">
              <Select value={subjectId} onValueChange={(value) => setSubjectId(value ?? "")}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Choose subject" /></SelectTrigger>
                <SelectContent>
                  {available.map((subject) => <SelectItem key={subject.id} value={String(subject.id)}>{subject.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input className="w-24" type="number" min="0" max="100" value={newMark} onChange={(event) => setNewMark(event.target.value)} />
              <Button
                size="sm"
                disabled={!subjectId || save.isPending}
                onClick={() => {
                  save.mutate([{ subject_id: Number(subjectId), mark: Number(newMark) }], {
                    onSuccess: () => setSubjectId(""),
                  });
                }}
              >
                Add mark
              </Button>
            </div>
          ) : undefined}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead><TableHead>Weight</TableHead><TableHead>Mark</TableHead>
                <TableHead>Letter</TableHead><TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.subject.id}>
                  <TableCell>
                    <span className="font-medium">{entry.subject.name}</span>
                    <span className="block text-xs text-muted-foreground">{entry.subject.code}</span>
                  </TableCell>
                  <TableCell>{entry.weight}</TableCell>
                  <TableCell><MarkInput mark={entry.mark} onSave={(mark) => save.mutate([{ subject_id: entry.subject.id, mark }])} /></TableCell>
                  <TableCell><Badge variant="secondary">{entry.letter}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="text-destructive" disabled={remove.isPending} onClick={() => remove.mutate(entry.subject.id)}>Remove</Button>
                  </TableCell>
                </TableRow>
              ))}
              {!entries.length && (
                <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">Add a subject mark to create this report.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          <p className="mt-4 text-xs text-muted-foreground">Average uses subject credit hours as weights. Letter grades use the unrounded average.</p>
        </SectionCard>
      </div>
    </PageFrame>
  );
}

function MarkInput({ mark, onSave }: { mark: number; onSave: (mark: number) => void }) {
  const form = useForm<z.input<typeof markSchema>, unknown, z.output<typeof markSchema>>({
    resolver: zodResolver(markSchema),
    defaultValues: { mark },
  });

  return (
    <form onSubmit={form.handleSubmit(({ mark: value }) => onSave(value))} className="flex items-center gap-2">
      <Label className="sr-only">Mark</Label>
      <Input className="w-24" type="number" min="0" max="100" {...form.register("mark")} />
      <Button type="submit" size="sm" variant="outline">Save</Button>
    </form>
  );
}
