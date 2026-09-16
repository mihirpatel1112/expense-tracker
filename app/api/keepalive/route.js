export async function GET() {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/expense_entries?select=id&limit=1`,
    {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return Response.json({ status: "error" }, { status: 500 });
  }

  return Response.json({ status: "ok" });
}
