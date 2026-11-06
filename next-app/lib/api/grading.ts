export type ScaleRow = { min: number; letter: string };
export type CalculatorSubject = { name: string; mark: number; weight?: number };
export type GradeEntry = { name: string; mark: number; weight: number; letter: string };
export type GradeResult = { entries: GradeEntry[]; total: number; average: number; average_raw: number; letter: string };

export class GradeValidationError extends Error {
  constructor(message: string, readonly fields: Record<string, string[]>) {
    super(message);
    this.name = "GradeValidationError";
  }
}

export function calculateGrade(subjects: CalculatorSubject[], scale: ScaleRow[]): GradeResult {
  const fields: Record<string, string[]> = {};
  if (!subjects.length) fields.subjects = ["At least one subject mark is required"];
  subjects.forEach((subject, index) => {
    if (!subject.name.trim()) fields[`subjects.${index}.name`] = ["Name cannot be empty"];
    if (typeof subject.mark !== "number" || !Number.isFinite(subject.mark)) fields[`subjects.${index}.mark`] = ["Mark must be a number"];
    else if (subject.mark < 0 || subject.mark > 100) fields[`subjects.${index}.mark`] = ["Mark must be between 0 and 100"];
    if (subject.weight !== undefined && (typeof subject.weight !== "number" || !Number.isFinite(subject.weight) || subject.weight <= 0)) fields[`subjects.${index}.weight`] = ["Weight must be greater than 0"];
  });
  if (Object.keys(fields).length) throw new GradeValidationError("The submitted grades are invalid", fields);
  const entries = subjects.map((subject) => ({
    name: subject.name.trim(),
    mark: subject.mark,
    weight: subject.weight ?? 1,
    letter: gradeLetter(subject.mark, scale),
  }));
  const weightSum = entries.reduce((sum, entry) => sum + entry.weight, 0);
  const weightedTotal = entries.reduce((sum, entry) => sum + entry.mark * entry.weight, 0);
  const averageRaw = weightedTotal / weightSum;
  return {
    entries,
    total: entries.reduce((sum, entry) => sum + entry.mark, 0),
    average: Number(averageRaw.toFixed(2)),
    average_raw: averageRaw,
    letter: gradeLetter(averageRaw, scale),
  };
}

export function gradeLetter(average: number, scale: ScaleRow[]): string {
  return [...scale].sort((a, b) => b.min - a.min).find((row) => average >= row.min)?.letter ?? "F";
}
