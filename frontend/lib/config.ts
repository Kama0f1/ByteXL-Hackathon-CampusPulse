/** Backend base URL, shared by server-side reads and browser-side writes. */
export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000").replace(/\/+$/, "");
