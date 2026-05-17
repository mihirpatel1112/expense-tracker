import { login } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 py-10 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(48,209,88,0.18),transparent_28%),radial-gradient(circle_at_80%_0%,rgba(10,132,255,0.16),transparent_30%),radial-gradient(circle_at_70%_80%,rgba(255,45,85,0.14),transparent_28%)]" />
      <Card className="relative w-full max-w-sm">
        <CardHeader>
          <p className="text-sm font-semibold text-[#30d158]">Expense Tracker</p>
          <CardTitle className="text-4xl">Log in</CardTitle>
          <p className="text-sm leading-6 text-zinc-400">
            Private dashboard for your monthly CSV uploads.
          </p>
        </CardHeader>

        <CardContent>
          <form action={login} className="space-y-4">
          <div>
            <Label htmlFor="username">
              Username
            </Label>
            <Input
              className="mt-2"
              id="username"
              name="username"
              type="text"
              required
            />
          </div>

          <div>
            <Label htmlFor="password">
              Password
            </Label>
            <Input
              className="mt-2"
              id="password"
              name="password"
              type="password"
              required
            />
          </div>

          {error === "invalid" ? (
            <p className="rounded-2xl border border-[#ff453a]/20 bg-[#ff453a]/10 px-4 py-3 text-sm font-medium text-[#ff453a]">
              Wrong username or password.
            </p>
          ) : null}

          <Button className="w-full" type="submit" variant="health">
            Log in
          </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
