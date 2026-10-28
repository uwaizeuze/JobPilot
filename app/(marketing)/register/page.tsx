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

export default function RegisterPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-16">
      <FoundationNotice />
      <Card>
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <CardDescription>
            Join JobPilot to manage your AI-powered job search.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Suspense
            fallback={
              <div className="text-sm text-muted-foreground">Loading form...</div>
            }
          >
            <AuthForm mode="register" />
          </Suspense>
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
