import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Sparkles } from "lucide-react";

import { AuthForm } from "@/components/auth/auth-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to your JobPilot AI job application workspace.",
};

export default function LoginPage() {
  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6 px-4 py-16">
      {/* Branding */}
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
          <Sparkles className="h-5 w-5" />
        </div>
        <span className="text-xl font-bold tracking-tight">JobPilot</span>
      </div>

      <Card className="shadow-lg">
        <CardHeader className="pb-4 text-center">
          <CardTitle className="text-2xl">Sign in to your workspace</CardTitle>
          <CardDescription>
            Enter your credentials to continue
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
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
