"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, safeNextPath } from "@/lib/auth";

/** Demo sign-in: any submission starts a demo faculty session. No credentials are verified. */
export async function signIn(formData: FormData) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "demo-faculty", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  redirect(safeNextPath(formData.get("next")));
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/");
}
