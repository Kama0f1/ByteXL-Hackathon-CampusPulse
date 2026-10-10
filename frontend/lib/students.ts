import { NotFoundError, withFallback } from "@/lib/api";
import { getDemoProfile, getDemoRoster } from "@/lib/demo/campus";
import type { DataResult, StudentProfile, StudentRow } from "@/lib/types";

/** Student roster: `GET /api/students`, or the demo campus if the backend is down. */
export async function getStudents(): Promise<DataResult<StudentRow[]>> {
  return withFallback("/api/students", getDemoRoster);
}

/** One student's full profile: `GET /api/students/{id}`. Returns null for an unknown student. */
export async function getStudentProfile(studentId: string): Promise<DataResult<StudentProfile> | null> {
  try {
    const result = await withFallback(`/api/students/${encodeURIComponent(studentId)}`, () => getDemoProfile(studentId));
    return result.data ? (result as DataResult<StudentProfile>) : null;
  } catch (error) {
    if (error instanceof NotFoundError) return null;
    throw error;
  }
}
