import { z } from "zod";
import { calculateGrade, GradeValidationError, type CalculatorSubject, type GradeResult } from "@/lib/api/grading";
import { env } from "@/lib/env";

const idSchema = z.number().int();
const isoDateSchema = z.string().datetime({ offset: true });
export const studentSchema = z.object({ id: idSchema, name: z.string().min(1), student_number: z.string().optional(), section: z.string().optional(), inserted_at: isoDateSchema });
export const subjectSchema = z.object({ id: idSchema, name: z.string().min(1), code: z.string().min(1), credit_hours: z.number().positive() });
export const scaleRowSchema = z.object({ min: z.number().min(0).max(100), letter: z.string().min(1) });
export const scaleSchema = z.array(scaleRowSchema).superRefine((rows, ctx) => {
  if (rows.at(-1)?.min !== 0) ctx.addIssue({ code: "custom", message: "The last scale row must have min 0" });
  for (let i = 1; i < rows.length; i++) if (rows[i - 1]!.min <= rows[i]!.min) ctx.addIssue({ code: "custom", path: [i, "min"], message: "Scale must be sorted by min descending" });
});
export const gradeResultSchema = z.object({ entries: z.array(z.object({ name: z.string(), mark: z.number().min(0).max(100), weight: z.number().positive(), letter: z.string() })), total: z.number(), average: z.number(), average_raw: z.number(), letter: z.string() });
export const reportSchema = z.object({ student: studentSchema, entries: z.array(z.object({ subject: subjectSchema, mark: z.number().min(0).max(100), weight: z.number().positive(), letter: z.string() })), total: z.number(), weighted_total: z.number(), average: z.number(), average_raw: z.number(), letter: z.string(), rank: z.number().int().positive(), class_size: z.number().int().nonnegative() });
export const pageMetaSchema = z.object({ page: z.number().int(), per_page: z.number().int(), total: z.number().int() });
export const listSchema = <T extends z.ZodType>(item: T) => z.object({ data: z.array(item), meta: pageMetaSchema });
export const singleSchema = <T extends z.ZodType>(item: T) => z.object({ data: item });
export const errorBodySchema = z.union([
  z.object({ error: z.object({ code: z.literal("validation_failed"), message: z.string(), fields: z.record(z.string(), z.array(z.string())) }) }),
  z.object({ error: z.object({ code: z.literal("not_found"), message: z.string() }) }),
]);
export const statsSchema = z.object({ student_count: z.number().int(), class_average: z.number(), highest: z.object({ student: studentSchema, average: z.number() }).nullable(), lowest: z.object({ student: studentSchema, average: z.number() }).nullable(), distribution: z.object({ A: z.number(), B: z.number(), C: z.number(), D: z.number(), E: z.number(), F: z.number() }), per_subject: z.array(z.object({ subject: subjectSchema, average: z.number(), highest: z.number(), lowest: z.number() })) });
export const healthSchema = z.object({ status: z.literal("ok") });
export type Student = z.infer<typeof studentSchema>;
export type Subject = z.infer<typeof subjectSchema>;
export type GradeScale = z.infer<typeof scaleSchema>;
export type StudentReport = z.infer<typeof reportSchema>;
export type Page<T> = { data: T[]; meta: z.infer<typeof pageMetaSchema> };
export type ApiErrorBody = z.infer<typeof errorBodySchema>;

export class ApiError extends Error {
  constructor(readonly status: number, readonly body: ApiErrorBody) {
    super(body.error.message);
    this.name = "ApiError";
  }
  get fields(): Record<string, string[]> { return this.body.error.code === "validation_failed" ? this.body.error.fields : {}; }
}

export type StudentQuery = { search?: string; page?: number; per_page?: number; sort?: string };
export type StudentInput = { name: string; student_number?: string; section?: string };
export type SubjectInput = { name: string; code: string; credit_hours?: number };
export type StudentPatch = Partial<StudentInput>;
export type GradeInput = { subject_id: number; mark: number };
export type ApiClient = {
  students(query?: StudentQuery): Promise<Page<Student>>;
  createStudent(input: StudentInput): Promise<{ data: Student }>;
  student(id: number): Promise<{ data: Student }>;
  updateStudent(id: number, input: StudentPatch): Promise<{ data: Student }>;
  deleteStudent(id: number): Promise<void>;
  subjects(): Promise<Page<Subject>>;
  createSubject(input: SubjectInput): Promise<{ data: Subject }>;
  updateSubject(id: number, input: Partial<SubjectInput>): Promise<{ data: Subject }>;
  deleteSubject(id: number): Promise<void>;
  upsertGrades(id: number, grades: GradeInput[]): Promise<unknown>;
  deleteGrade(id: number, subjectId: number): Promise<void>;
  report(id: number): Promise<{ data: StudentReport }>;
  calculate(subjects: CalculatorSubject[]): Promise<{ data: GradeResult }>;
  scale(): Promise<{ data: GradeScale }>;
  updateScale(scale: GradeScale): Promise<{ data: GradeScale }>;
  stats(): Promise<{ data: z.infer<typeof statsSchema> }>;
  exportStudentsCsv(): Promise<string>;
  health(): Promise<z.infer<typeof healthSchema>>;
};

const BASE_URL = env.NEXT_PUBLIC_API_URL;
const USE_MOCKS = env.NEXT_PUBLIC_USE_MOCKS === "true";

async function request<T>(path: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  if (response.status === 422 || response.status === 404) {
    const body = errorBodySchema.parse(await response.json());
    throw new ApiError(response.status, body);
  }
  if (!response.ok) throw new Error(`API request failed with status ${response.status}`);
  return schema.parse(await response.json());
}
const json = (method: string, body?: unknown): RequestInit => ({ method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
const realClient: ApiClient = {
  students: (query = {}) => { const params = new URLSearchParams(); for (const [key, value] of Object.entries(query)) if (value !== undefined) params.set(key, String(value)); return request(`/students${params.size ? `?${params}` : ""}`, listSchema(studentSchema)); },
  createStudent: (input) => request("/students", singleSchema(studentSchema), json("POST", input)),
  student: (id) => request(`/students/${id}`, singleSchema(studentSchema)),
  updateStudent: (id, input) => request(`/students/${id}`, singleSchema(studentSchema), json("PATCH", input)),
  deleteStudent: async (id) => { const response = await fetch(`${BASE_URL}/students/${id}`, { method: "DELETE" }); if (response.status === 404 || response.status === 422) throw new ApiError(response.status, errorBodySchema.parse(await response.json())); if (!response.ok) throw new Error(`API request failed with status ${response.status}`); },
  subjects: () => request("/subjects", listSchema(subjectSchema)),
  createSubject: (input) => request("/subjects", singleSchema(subjectSchema), json("POST", input)),
  updateSubject: (id, input) => request(`/subjects/${id}`, singleSchema(subjectSchema), json("PATCH", input)),
  deleteSubject: async (id) => { const response = await fetch(`${BASE_URL}/subjects/${id}`, { method: "DELETE" }); if (response.status === 404 || response.status === 422) throw new ApiError(response.status, errorBodySchema.parse(await response.json())); if (!response.ok) throw new Error(`API request failed with status ${response.status}`); },
  upsertGrades: (id, grades) => request(`/students/${id}/grades`, z.unknown(), json("PUT", { grades })),
  deleteGrade: async (id, subjectId) => { const response = await fetch(`${BASE_URL}/students/${id}/grades/${subjectId}`, { method: "DELETE" }); if (response.status === 404 || response.status === 422) throw new ApiError(response.status, errorBodySchema.parse(await response.json())); if (!response.ok) throw new Error(`API request failed with status ${response.status}`); },
  report: (id) => request(`/students/${id}/report`, singleSchema(reportSchema)),
  calculate: (subjects) => request("/calculate", singleSchema(gradeResultSchema), json("POST", { subjects })),
  scale: () => request("/grading-scale", singleSchema(scaleSchema)),
  updateScale: (scale) => request("/grading-scale", singleSchema(scaleSchema), json("PUT", { scale })),
  stats: () => request("/stats", singleSchema(statsSchema)),
  exportStudentsCsv: async () => { const response = await fetch(`${BASE_URL}/export/students.csv`); if (!response.ok) throw new Error(`API request failed with status ${response.status}`); return z.string().parse(await response.text()); },
  health: () => request("/health", healthSchema),
};

const defaultScale: GradeScale = [{ min: 90, letter: "A" }, { min: 80, letter: "B" }, { min: 70, letter: "C" }, { min: 60, letter: "D" }, { min: 50, letter: "E" }, { min: 0, letter: "F" }];
const seedSubjects: Subject[] = [{ id: 1, name: "Mathematics", code: "MATH", credit_hours: 4 }, { id: 2, name: "English", code: "ENG", credit_hours: 3 }, { id: 3, name: "Biology", code: "BIO", credit_hours: 3 }, { id: 4, name: "History", code: "HIST", credit_hours: 2 }];
const insertedAt = "2025-01-15T08:00:00.000Z";
const seedStudents: Student[] = [{ id: 1, name: "Amara Hassan", student_number: "ST-001", section: "A", inserted_at: insertedAt }, { id: 2, name: "Daniel Kimani", student_number: "ST-002", section: "A", inserted_at: insertedAt }, { id: 3, name: "Nia Mwangi", student_number: "ST-003", section: "B", inserted_at: insertedAt }, { id: 4, name: "Ethan Otieno", student_number: "ST-004", section: "B", inserted_at: insertedAt }, { id: 5, name: "Zuri Achieng", student_number: "ST-005", section: "A", inserted_at: insertedAt }];
let students = seedStudents;
let subjects = seedSubjects;
let scale = defaultScale;
const grades = new Map<number, Map<number, number>>([[1, new Map([[1, 92], [2, 84], [3, 88], [4, 79]])], [2, new Map([[1, 76], [2, 81], [3, 73], [4, 85]])], [3, new Map([[1, 95], [2, 91], [3, 89], [4, 94]])], [4, new Map([[1, 63], [2, 72], [3, 68], [4, 75]])], [5, new Map([[1, 84], [2, 87], [3, 90], [4, 82]])]]);
const validationError = (fields: Record<string, string[]>): never => { throw new ApiError(422, { error: { code: "validation_failed", message: "The submitted data is invalid", fields } }); };
const notFound = (): never => { throw new ApiError(404, { error: { code: "not_found", message: "The requested resource was not found" } }); };
function validateScale(value: GradeScale): void { const result = scaleSchema.safeParse(value); if (!result.success) validationError({ scale: result.error.issues.map((issue) => issue.message) }); }
function reportFor(student: Student): StudentReport {
  const marks = [...(grades.get(student.id) ?? new Map())].flatMap(([subjectId, mark]) => { const subject = subjects.find((item) => item.id === subjectId); return subject ? [{ subject, mark, weight: subject.credit_hours, letter: calculateGrade([{ name: subject.name, mark }], scale).letter }] : []; });
  const result = calculateGrade(marks.map(({ subject, mark, weight }) => ({ name: subject.name, mark, weight })), scale);
  const ordered = students.map((item) => ({ item, average_raw: calculateGrade([...((grades.get(item.id) ?? new Map()).entries())].flatMap(([subjectId, mark]) => { const subject = subjects.find((subjectItem) => subjectItem.id === subjectId); return subject ? [{ name: subject.name, mark, weight: subject.credit_hours }] : []; }), scale).average_raw })).sort((a, b) => b.average_raw - a.average_raw);
  return { student, entries: marks, total: result.total, weighted_total: marks.reduce((sum, mark) => sum + mark.mark * mark.weight, 0), average: result.average, average_raw: result.average_raw, letter: result.letter, rank: Math.max(1, ordered.findIndex(({ item }) => item.id === student.id) + 1), class_size: students.length };
}
function page<T>(items: T[], query: StudentQuery = {}): Page<T> { const pageNumber = Math.max(1, Number(query.page ?? 1)); const perPage = Math.max(1, Number(query.per_page ?? 10)); const start = (pageNumber - 1) * perPage; return { data: items.slice(start, start + perPage), meta: { page: pageNumber, per_page: perPage, total: items.length } }; }
function validateStudent(input: StudentInput): void {
 const fields: Record<string, string[]> = {};
 if (!input.name.trim()) fields.name = ["Name cannot be empty"];
 if (input.student_number && students.some((student) => student.student_number === input.student_number)) fields.student_number = ["Student number must be unique"];
 if (Object.keys(fields).length) validationError(fields);
}
function validateSubject(input: SubjectInput): void { const fields: Record<string, string[]> = {}; if (!input.name.trim()) fields.name = ["Name cannot be empty"]; if (!input.code.trim()) fields.code = ["Code cannot be empty"]; if (input.code && subjects.some((subject) => subject.code === input.code)) fields.code = ["Code must be unique"]; if (input.credit_hours !== undefined && input.credit_hours <= 0) fields.credit_hours = ["Credit hours must be greater than 0"]; if (Object.keys(fields).length) validationError(fields); }
const mockClient: ApiClient = {
  async students(query = {}) { let list = [...students]; if (query.search) list = list.filter((student) => `${student.name} ${student.student_number ?? ""} ${student.section ?? ""}`.toLowerCase().includes(query.search!.toLowerCase())); if (query.sort) list.sort((a, b) => String(a[query.sort as keyof Student] ?? "").localeCompare(String(b[query.sort as keyof Student] ?? ""))); return page(list, query); },
  async createStudent(input) { validateStudent(input); const student = studentSchema.parse({ id: Math.max(0, ...students.map((item) => item.id)) + 1, ...input, inserted_at: new Date().toISOString() }); students.push(student); grades.set(student.id, new Map()); return { data: student }; },
  async student(id) { const item = students.find((student) => student.id === id); return item ? { data: item } : notFound(); },
  async updateStudent(id, input) { const old = students.find((student) => student.id === id); if (!old) return notFound(); const candidate = { ...old, ...input }; if (!candidate.name.trim()) validationError({ name: ["Name cannot be empty"] }); if (input.student_number && students.some((student) => student.id !== id && student.student_number === input.student_number)) validationError({ student_number: ["Student number must be unique"] }); const updated = studentSchema.parse(candidate); students = students.map((student) => student.id === id ? updated : student); return { data: updated }; },
  async deleteStudent(id) { if (!students.some((student) => student.id === id)) notFound(); students = students.filter((student) => student.id !== id); grades.delete(id); },
  async subjects() { return page(subjects); },
  async createSubject(input) { validateSubject(input); const subject = subjectSchema.parse({ id: Math.max(0, ...subjects.map((item) => item.id)) + 1, credit_hours: 1, ...input }); subjects.push(subject); return { data: subject }; },
  async updateSubject(id, input) { const old = subjects.find((subject) => subject.id === id); if (!old) return notFound(); const candidate = { ...old, ...input }; if (!candidate.name.trim()) validationError({ name: ["Name cannot be empty"] }); if (!candidate.code.trim()) validationError({ code: ["Code cannot be empty"] }); if (subjects.some((subject) => subject.id !== id && subject.code === candidate.code)) validationError({ code: ["Code must be unique"] }); if (candidate.credit_hours <= 0) validationError({ credit_hours: ["Credit hours must be greater than 0"] }); const updated = subjectSchema.parse(candidate); subjects = subjects.map((subject) => subject.id === id ? updated : subject); return { data: updated }; },
  async deleteSubject(id) { if (!subjects.some((subject) => subject.id === id)) notFound(); subjects = subjects.filter((subject) => subject.id !== id); for (const map of grades.values()) map.delete(id); },
  async upsertGrades(id, input) { if (!students.some((student) => student.id === id)) notFound(); const fields: Record<string, string[]> = {}; if (!input.length) fields.grades = ["At least one grade is required"]; input.forEach((grade, i) => { if (!subjects.some((subject) => subject.id === grade.subject_id)) fields[`grades.${i}.subject_id`] = ["Subject not found"]; if (!Number.isFinite(grade.mark) || grade.mark < 0 || grade.mark > 100) fields[`grades.${i}.mark`] = ["Mark must be between 0 and 100"]; }); if (Object.keys(fields).length) validationError(fields); const row = grades.get(id) ?? new Map<number, number>(); input.forEach((grade) => row.set(grade.subject_id, grade.mark)); grades.set(id, row); return { data: { grades: [...row].map(([subject_id, mark]) => ({ subject_id, mark })) } }; },
  async deleteGrade(id, subjectId) { if (!students.some((student) => student.id === id)) notFound(); const row = grades.get(id); if (!row?.has(subjectId)) notFound(); row!.delete(subjectId); },
  async report(id) { const student = students.find((item) => item.id === id); return student ? { data: reportSchema.parse(reportFor(student)) } : notFound(); },
  async calculate(input) { try { const result = calculateGrade(input, scale); return { data: gradeResultSchema.parse(result) }; } catch (error) { if (error instanceof GradeValidationError) return validationError(error.fields); throw error; } },
  async scale() { return { data: scaleSchema.parse(scale) }; },
  async updateScale(input) { validateScale(input); scale = input; return { data: scale }; },
  async stats() { const reports = students.map((student) => reportFor(student)); const distribution = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 }; reports.forEach((report) => { distribution[report.letter as keyof typeof distribution]++; }); const perSubject = subjects.map((subject) => { const marks = reports.flatMap((report) => report.entries.filter((entry) => entry.subject.id === subject.id).map((entry) => entry.mark)); return { subject, average: marks.length ? marks.reduce((a, b) => a + b, 0) / marks.length : 0, highest: Math.max(0, ...marks), lowest: marks.length ? Math.min(...marks) : 0 }; }); const ordered = reports.filter((report) => report.average_raw > 0).sort((a, b) => b.average_raw - a.average_raw); return { data: statsSchema.parse({ student_count: students.length, class_average: reports.length ? reports.reduce((sum, report) => sum + report.average, 0) / reports.length : 0, highest: ordered.length ? { student: ordered[0].student, average: ordered[0].average } : null, lowest: ordered.length ? { student: ordered.at(-1)!.student, average: ordered.at(-1)!.average } : null, distribution, per_subject: perSubject }) }; },
  async exportStudentsCsv() { return ["id,name,student_number,section,inserted_at", ...students.map((student) => `${student.id},"${student.name.replaceAll('"', '""')}",${student.student_number ?? ""},${student.section ?? ""},${student.inserted_at}`)].join("\r\n"); },
  async health() { return healthSchema.parse({ status: "ok" }); },
};
export const api: ApiClient = USE_MOCKS ? mockClient : realClient;
export type { CalculatorSubject, GradeResult, ScaleRow } from "./grading";
