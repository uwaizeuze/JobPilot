import Link from "next/link";
import { Suspense } from "react";

import { AuthForm } from "@/components/auth/auth-form";
import { FoundationNotice } from "@/components/layout/foundation-notice";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-16">
      <FoundationNotice />
      <Card>
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            Enter your credentials to access your JobPilot assistant.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Suspense
            fallback={
              <div className="text-sm text-muted-foreground">Loading form...</div>
            }
          >
            <AuthForm mode="login" />
          </Suspense>
          <p className="text-sm text-muted-foreground">
            Need an account?{" "}
            <Link href="/register" className="text-primary underline">
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
