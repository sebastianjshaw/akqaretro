export { auth as middleware } from "@/auth";

// Don't run auth middleware on /api/* — let the API route (Node) handle it.
// Otherwise the middleware (Edge) can run first and fail with Configuration when env differs in Edge.
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
