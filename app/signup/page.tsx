"use client";

import { FirebaseError } from "firebase/app";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LemonLogo } from "@/components/LemonLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { auth, db } from "@/lib/firebase-client";
import { COLLECTIONS } from "@/lib/types";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
      await updateProfile(cred.user, { displayName: fullName });

      await setDoc(doc(db, COLLECTIONS.users, cred.user.uid), {
        full_name: fullName,
        email: email.trim(),
        phone_e164: phone.trim(),
        national_id: "",
        date_of_birth: null,
        address: { line1: "", city: "", district: "", country: "Rwanda" },
        status: "kyc_pending",
        plan: "free",
        tenure_months: 0,
        ltv_rwf: 0,
        churn_risk: 0,
        created_at: serverTimestamp(),
        last_login_at: serverTimestamp(),
      });

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
          Create your account
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          A few details to get you started. You&apos;ll verify your ID next.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <Field
            id="fullName"
            label="Full name"
            value={fullName}
            onChange={setFullName}
            autoComplete="name"
            required
          />
          <Field
            id="email"
            type="email"
            label="Email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            required
          />
          <Field
            id="phone"
            type="tel"
            label="Phone (+250…)"
            value={phone}
            onChange={setPhone}
            autoComplete="tel"
            placeholder="+250788000000"
            required
          />
          <Field
            id="password"
            type="password"
            label="Password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            required
            minLength={8}
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
            {submitting ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-600">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-neutral-900 underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
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
        placeholder={props.placeholder}
        required={props.required}
        minLength={props.minLength}
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
      case "auth/email-already-in-use":
        return "An account with that email already exists.";
      case "auth/invalid-email":
        return "That email doesn't look right.";
      case "auth/weak-password":
        return "Password must be at least 8 characters.";
      case "auth/network-request-failed":
        return "Network error. Check your connection and try again.";
      default:
        return err.message;
    }
  }
  return "Something went wrong. Please try again.";
}
