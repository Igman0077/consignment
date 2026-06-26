"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

export default function SetupPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: form.get("secret"),
        password: form.get("password"),
        email: form.get("email") || "owner@shop.com",
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Setup failed");
      return;
    }

    setSuccess(data.message || "Owner account created. You can log in now.");
    setTimeout(() => router.push("/login"), 2000);
  }

  return (
    <div className="container-page flex min-h-[70vh] items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h1 className="text-xl font-bold text-slate-900">Shop owner setup</h1>
          <p className="mt-1 text-sm text-slate-600">
            Use this once after deploying to Render. Requires your SETUP_SECRET from the hosting
            dashboard.
          </p>
        </CardHeader>
        <CardBody>
          {error && (
            <Alert variant="error" className="mb-4">
              {error}
            </Alert>
          )}
          {success && (
            <Alert variant="success" className="mb-4">
              {success}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Setup secret"
              name="secret"
              type="password"
              required
              autoComplete="off"
              hint="Same value as SETUP_SECRET in Render environment variables"
            />
            <Input
              label="Owner email"
              name="email"
              type="email"
              defaultValue="owner@shop.com"
              required
            />
            <Input
              label="New password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              hint="At least 8 characters"
            />
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? "Setting up..." : "Create / reset owner account"}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
