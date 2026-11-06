"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api, ApiError, type Student } from "@/lib/api";
import { useApiMutation, useStudents } from "@/hooks/use-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ErrorState, LoadingCard, PageFrame, PageHeading, SectionCard } from "@/components/page-frame";

const formSchema = z.object({ name: z.string().trim().min(1, "Name is required"), student_number: z.string().optional(), section: z.string().optional() });
type FormValues = z.infer<typeof formSchema>;

export default function StudentsPage() {
  const [search, setSearch] = useState(""); const [page, setPage] = useState(1); const [editing, setEditing] = useState<Student | null>(null); const [open, setOpen] = useState(false);
  const query = useStudents(search, page, 8); const create = useApiMutation((v: FormValues) => api.createStudent(v), [["students"], ["stats"]]); const update = useApiMutation((v: FormValues) => api.updateStudent(editing!.id, v), [["students"], ["stats"], ["student"], ["report"]]); const remove = useApiMutation((id: number) => api.deleteStudent(id), [["students"], ["stats"], ["student"], ["report"]]);
  const form = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: { name: "", student_number: "", section: "" } });
  const serverErrors = (error: unknown) => { if (error instanceof ApiError) Object.entries(error.fields).forEach(([field, messages]) => form.setError(field as keyof FormValues, { message: messages[0] })); };
  const openForm = (student?: Student) => { setEditing(student ?? null); form.reset(student ? { name: student.name, student_number: student.student_number ?? "", section: student.section ?? "" } : { name: "", student_number: "", section: "" }); setOpen(true); };
  const onSubmit = form.handleSubmit(async (values) => { try { if (editing) await update.mutateAsync(values); else await create.mutateAsync(values); setOpen(false); } catch (error) { serverErrors(error); } });
  const exportCsv = async () => { const blob = new Blob([await api.exportStudentsCsv()], { type: "text/csv" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "students.csv"; a.click(); URL.revokeObjectURL(url); };
  return <PageFrame><PageHeading title="Students" subtitle="Manage your roster, marks and reports." action={<div className="flex gap-2"><Button variant="outline" onClick={exportCsv}>Export CSV</Button><Dialog open={open} onOpenChange={setOpen}><DialogTrigger render={<Button onClick={() => openForm()}>Add student</Button>} /><DialogContent><DialogHeader><DialogTitle>{editing ? "Edit student" : "Add student"}</DialogTitle></DialogHeader><form onSubmit={onSubmit} className="space-y-4">{(["name", "student_number", "section"] as const).map((field) => <div key={field} className="space-y-1.5"><Label htmlFor={field}>{field === "student_number" ? "Student number" : field[0]!.toUpperCase() + field.slice(1)}</Label><Input id={field} {...form.register(field)} />{form.formState.errors[field] && <p className="text-xs text-destructive">{form.formState.errors[field]?.message}</p>}</div>)}<Button type="submit" className="w-full" disabled={create.isPending || update.isPending}>{editing ? "Save changes" : "Create student"}</Button></form></DialogContent></Dialog></div>} />
    <SectionCard title="Class roster" action={<Input className="w-52" placeholder="Search students..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />}>{query.isLoading ? <LoadingCard /> : query.isError ? <ErrorState /> : <><Table><TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Section</TableHead><TableHead>Average</TableHead><TableHead>Grade</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{query.data?.data.map((student) => <StudentRow key={student.id} student={student} onEdit={() => openForm(student)} onDelete={() => remove.mutate(student.id)} />)}{!query.data?.data.length && <TableRow><TableCell colSpan={5} className="py-12 text-center text-muted-foreground">No students match your search.</TableCell></TableRow>}</TableBody></Table><div className="mt-4 flex items-center justify-between text-sm text-muted-foreground"><span>{query.data?.meta.total ?? 0} students</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button><Button variant="outline" size="sm" disabled={page * 8 >= (query.data?.meta.total ?? 0)} onClick={() => setPage(page + 1)}>Next</Button></div></div></>}</SectionCard></PageFrame>;
}

function StudentRow({ student, onEdit, onDelete }: { student: Student; onEdit: () => void; onDelete: () => void }) {
  return <TableRow><TableCell><Link href={`/students/${student.id}`} className="font-medium hover:text-primary">{student.name}</Link><span className="block text-xs text-muted-foreground">{student.student_number ?? `ID ${student.id}`}</span></TableCell><TableCell>{student.section ?? "—"}</TableCell><TableCell><StudentAverage id={student.id} /></TableCell><TableCell><StudentLetter id={student.id} /></TableCell><TableCell className="space-x-2 text-right"><Button size="sm" variant="ghost" onClick={onEdit}>Edit</Button><AlertDialog><AlertDialogTrigger render={<Button size="sm" variant="ghost" className="text-destructive">Delete</Button>} /><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {student.name}?</AlertDialogTitle><AlertDialogDescription>This removes the student and their grade records.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={onDelete}>Delete student</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></TableCell></TableRow>;
}
import { useReport } from "@/hooks/use-api";
function StudentAverage({ id }: { id: number }) { const { data } = useReport(id); return <>{data?.data.average.toFixed(2) ?? "—"}%</>; }
function StudentLetter({ id }: { id: number }) { const { data } = useReport(id); return data ? <Badge variant="secondary">{data.data.letter}</Badge> : <span>—</span>; }
