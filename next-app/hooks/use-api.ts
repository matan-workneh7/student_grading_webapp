"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";

export const keys = { stats: ["stats"], students: ["students"], subjects: ["subjects"], scale: ["scale"] };
export function useStats() { return useQuery({ queryKey: keys.stats, queryFn: () => api.stats() }); }
export function useStudents(search = "", page = 1, per_page = 10, sort = "name") { return useQuery({ queryKey: [...keys.students, search, page, per_page, sort], queryFn: () => api.students({ search, page, per_page, sort }) }); }
export function useSubjects() { return useQuery({ queryKey: keys.subjects, queryFn: () => api.subjects() }); }
export function useStudent(id: number) { return useQuery({ queryKey: ["student", id], queryFn: () => api.student(id), enabled: Number.isInteger(id) }); }
export function useReport(id: number) { return useQuery({ queryKey: ["report", id], queryFn: () => api.report(id), enabled: Number.isInteger(id) }); }
export function useScale() { return useQuery({ queryKey: keys.scale, queryFn: () => api.scale() }); }
export function useApiMutation<T>(mutationFn: (value: T) => Promise<unknown>, invalidates: readonly unknown[][]) {
  const client = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: async () => { await Promise.all(invalidates.map((queryKey) => client.invalidateQueries({ queryKey }))); },
    onError: (error) => toast.error(error instanceof Error ? error.message : "The request failed."),
  });
}
