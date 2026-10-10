import { getDemoProfile, getDemoRoster } from "@/lib/demo/campus";
import type { DataResult, StudentProfile, StudentRow } from "@/lib/types";

/** Student roster. Proposed endpoint: `GET /api/students`. Currently demo data. */
export async function getStudents(): Promise<DataResult<StudentRow[]>> {
  return { origin: "demo", data: getDemoRoster() };
}

/** One student's full profile. Proposed endpoint: `GET /api/students/{id}`. Currently demo data. */
export async function getStudentProfile(studentId: string): Promise<DataResult<StudentProfile> | null> {
  const data = getDemoProfile(studentId);
  return data ? { origin: "demo", data } : null;
}
