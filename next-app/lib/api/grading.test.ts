import { describe, expect, it } from "vitest";
import { calculateGrade } from "./grading";
const scale = [{ min: 90, letter: "A" }, { min: 80, letter: "B" }, { min: 70, letter: "C" }, { min: 60, letter: "D" }, { min: 50, letter: "E" }, { min: 0, letter: "F" }];
describe("calculateGrade", () => {
  it("calculates 80/90/70 as 240 / 80.00 / B", () => expect(calculateGrade([{ name: "Math", mark: 80 }, { name: "Science", mark: 90 }, { name: "English", mark: 70 }], scale)).toMatchObject({ total: 240, average: 80, average_raw: 80, letter: "B" }));
  it("uses inclusive grade boundaries", () => { expect(calculateGrade([{ name: "Math", mark: 90 }], scale).letter).toBe("A"); expect(calculateGrade([{ name: "Math", mark: 80 }], scale).letter).toBe("B"); expect(calculateGrade([{ name: "Math", mark: 50 }], scale).letter).toBe("E"); });
  it("rejects marks below zero and above 100", () => { expect(() => calculateGrade([{ name: "Math", mark: -1 }], scale)).toThrow(); expect(() => calculateGrade([{ name: "Math", mark: 101 }], scale)).toThrow(); });
  it("uses subject weights for the average", () => expect(calculateGrade([{ name: "Math", mark: 100, weight: 2 }, { name: "English", mark: 50, weight: 1 }], scale)).toMatchObject({ total: 150, average: 83.33, average_raw: 250 / 3, letter: "B" }));
});
