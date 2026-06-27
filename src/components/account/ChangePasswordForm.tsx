"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

export function ChangePasswordForm() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    const form = new FormData(e.currentTarget);
    const newPassword = form.get("newPassword") as string;
    const confirmPassword = form.get("confirmPassword") as string;

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/account/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: form.get("currentPassword"),
        newPassword,
        confirmPassword,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Could not update password");
      return;
    }

    setSuccess(true);
    e.currentTarget.reset();
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="section-title">Change Password</h2>
      </CardHeader>
      <CardBody>
        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}
        {success && (
          <Alert variant="success" className="mb-4">
            Your password has been updated.
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Current password"
            name="currentPassword"
            type="password"
            required
            autoComplete="current-password"
          />
          <Input
            label="New password"
            name="newPassword"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            hint="At least 6 characters"
          />
          <Input
            label="Confirm new password"
            name="confirmPassword"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
          />
          <Button type="submit" disabled={loading}>
            {loading ? "Updating..." : "Update password"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
