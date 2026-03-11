"use server";

import { signIn } from "@/auth";

/**
 * Server action to start Google sign-in.
 * Auth.js does not support GET /api/auth/signin/google (it throws); the approved flow is POST via signIn().
 */
export async function signInWithGoogle() {
  await signIn("google", { callbackUrl: "/" });
}
