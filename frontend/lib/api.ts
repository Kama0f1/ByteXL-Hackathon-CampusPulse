export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function fetchHealth() {
    const res = await fetch($($){API_BASE_URL}/api/health);
    if (!res.ok) throw new Error('Network response was not ok');
    return res.json();
}
