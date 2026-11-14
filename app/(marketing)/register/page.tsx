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
  title: "Create Account",
  description: "Create your free JobPilot account to automate your job applications and track interviews.",
};

export default function RegisterPage() {
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
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription>
            Join JobPilot to manage your AI-powered job search
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
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
