"use client";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { api } from "@/lib/api";
import { useApiMutation, useScale } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageFrame, PageHeading, SectionCard } from "@/components/page-frame";

const schema = z.object({ scale: z.array(z.object({ min: z.coerce.number().min(0).max(100), letter: z.string().trim().min(1) })).min(1).superRefine((rows, ctx) => { if (rows.at(-1)?.min !== 0) ctx.addIssue({ code: "custom", message: "The final grade must start at 0", path: [rows.length - 1, "min"] }); rows.slice(1).forEach((row, i) => { if (rows[i]!.min <= row.min) ctx.addIssue({ code: "custom", message: "Set minimums in descending order", path: [i + 1, "min"] }); }); }) });
type Values = z.input<typeof schema>; type ParsedValues = z.output<typeof schema>;
export default function SettingsPage() { const query = useScale(); const save = useApiMutation((v: ParsedValues) => api.updateScale(v.scale), [["scale"], ["stats"], ["report"]]); const form = useForm<Values, unknown, ParsedValues>({ resolver: zodResolver(schema), defaultValues: { scale: [] } }); const rows = useFieldArray({ control: form.control, name: "scale" }); useEffect(() => { if (query.data) form.reset({ scale: query.data.data }); }, [query.data, form]); const submit = form.handleSubmit((v) => save.mutate(v)); return <PageFrame><PageHeading title="Grading scale" subtitle="Choose the letter boundaries used in reports and the dashboard." /><div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]"><SectionCard title="Grade boundaries"><form onSubmit={submit} className="space-y-3">{rows.fields.map((row, i) => <div key={row.id} className="grid grid-cols-[1fr_1fr_auto] items-end gap-3"><div><Label>Minimum mark</Label><Input type="number" min="0" max="100" {...form.register(`scale.${i}.min`)} /></div><div><Label>Letter</Label><Input {...form.register(`scale.${i}.letter`)} /></div><Button type="button" variant="outline" onClick={() => rows.remove(i)} disabled={rows.fields.length <= 1}>Remove</Button></div>)}{form.formState.errors.scale?.message && <p className="text-sm text-destructive">{form.formState.errors.scale.message}</p>}<div className="flex gap-2 pt-2"><Button type="button" variant="outline" onClick={() => rows.append({ min: 0, letter: "" })}>Add row</Button><Button type="submit" disabled={save.isPending}>Save scale</Button></div></form></SectionCard><SectionCard title="Preview"><p className="mb-4 text-sm text-muted-foreground">Letter grades are assigned from the exact average before display rounding.</p><div className="space-y-2">{rows.fields.map((row, i) => <div key={row.id} className="flex items-center justify-between rounded-lg border p-3"><span>{i === 0 ? "100" : `${Number(form.getValues(`scale.${i}.min`))}–${Number(form.getValues(`scale.${i - 1}.min`)) - 1}`}%</span><Badge variant="secondary">{form.getValues(`scale.${i}.letter`) || "?"}</Badge></div>)}</div></SectionCard></div></PageFrame>; }
