"use client";

import { FirebaseError } from "firebase/app";
import { signInWithEmailAndPassword } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LemonLogo } from "@/components/LemonLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { auth } from "@/lib/firebase-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("lola@lemonpay.demo");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.push("/app");
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-neutral-50 px-6 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <Link
          href="/"
          className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900"
        >
          <LemonLogo className="h-6 w-6 text-neutral-900" />
          <span className="text-sm font-medium tracking-tight">Lemonpay</span>
        </Link>

        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-neutral-900">
          Welcome back
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Sign in to your Lemonpay account.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <Field
            id="email"
            type="email"
            label="Email"
            autoComplete="email"
            value={email}
            onChange={setEmail}
            required
          />
          <Field
            id="password"
            type="password"
            label="Password"
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
            required
          />

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={submitting}
            className="h-11 bg-neutral-900 text-white hover:bg-neutral-800 disabled:opacity-60"
          >
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-600">
          New to Lemonpay?{" "}
          <Link href="/signup" className="font-medium text-neutral-900 underline-offset-4 hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  );
}

interface FieldProps {
  id: string;
  type?: string;
  label: string;
  autoComplete?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}

function Field(props: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={props.id} className="text-sm font-medium text-neutral-800">
        {props.label}
      </label>
      <Input
        id={props.id}
        type={props.type ?? "text"}
        autoComplete={props.autoComplete}
        required={props.required}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="h-11 border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-0"
      />
    </div>
  );
}

function authErrorMessage(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "Email or password is incorrect.";
      case "auth/too-many-requests":
        return "Too many attempts. Try again in a minute.";
      case "auth/invalid-email":
        return "That email doesn't look right.";
      case "auth/network-request-failed":
        return "Network error. Check your connection and try again.";
      default:
        return err.message;
    }
  }
  return "Something went wrong. Please try again.";
}
