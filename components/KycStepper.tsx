"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PhotoCapture } from "@/components/PhotoCapture";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiPost } from "@/lib/api-client";

type StepId = "personal" | "id" | "selfie" | "review";

const STEPS: { id: StepId; label: string }[] = [
  { id: "personal", label: "Personal info" },
  { id: "id", label: "ID document" },
  { id: "selfie", label: "Live selfie" },
  { id: "review", label: "Submit" },
];

interface KycStepperProps {
  uid: string;
  initial: {
    fullName: string;
    dateOfBirth: string; // YYYY-MM-DD
    nationalId: string;
    phone: string;
    addressLine1: string;
    city: string;
    district: string;
  };
}

interface KycSubmitData {
  attempt_id: string;
  status: "passed" | "failed";
  failure_reason?: string;
}

export function KycStepper({ uid, initial }: KycStepperProps) {
  const router = useRouter();
  const draftId = useMemo(
    () => `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    [],
  );

  const [step, setStep] = useState<StepId>("personal");
  const [info, setInfo] = useState(initial);
  const [idPath, setIdPath] = useState<string | null>(null);
  const [selfiePath, setSelfiePath] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  function goNext() {
    if (stepIndex < STEPS.length - 1) setStep(STEPS[stepIndex + 1]!.id);
  }
  function goBack() {
    if (stepIndex > 0) setStep(STEPS[stepIndex - 1]!.id);
  }

  const personalValid =
    info.fullName.trim().length > 1 &&
    /^\d{4}-\d{2}-\d{2}$/.test(info.dateOfBirth) &&
    info.nationalId.trim().length >= 8 &&
    info.phone.trim().length >= 8;

  async function handleSubmit() {
    if (!idPath || !selfiePath) {
      toast.error("Upload both ID and selfie before submitting");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiPost<KycSubmitData>("/api/kyc/submit", {
        body: {
          id_image_path: idPath,
          selfie_image_path: selfiePath,
        },
      });
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      // Either pass or fail — both go to /signup/pending. That page reads
      // the live status from Firestore and shows the right message.
      router.push("/signup/pending");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Progress */}
      <ol className="grid grid-cols-4 gap-2">
        {STEPS.map((s, i) => {
          const reached = i <= stepIndex;
          return (
            <li key={s.id} className="flex flex-col gap-1">
              <div
                className={
                  "h-1 rounded-full " +
                  (reached ? "bg-neutral-900" : "bg-neutral-200")
                }
              />
              <span
                className={
                  "text-[11px] uppercase tracking-widest " +
                  (reached ? "text-neutral-900" : "text-neutral-400")
                }
              >
                {i + 1}. {s.label}
              </span>
            </li>
          );
        })}
      </ol>

      {/* Step bodies */}
      {step === "personal" && (
        <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6">
          <h2 className="text-base font-semibold text-neutral-900">
            Confirm your details
          </h2>
          <p className="text-sm text-neutral-600">
            These details must match the ID you&apos;re about to upload.
          </p>

          <Field
            id="fullName"
            label="Full name"
            value={info.fullName}
            onChange={(v) => setInfo({ ...info, fullName: v })}
          />
          <Field
            id="dateOfBirth"
            label="Date of birth"
            type="date"
            value={info.dateOfBirth}
            onChange={(v) => setInfo({ ...info, dateOfBirth: v })}
          />
          <Field
            id="nationalId"
            label="National ID"
            value={info.nationalId}
            onChange={(v) => setInfo({ ...info, nationalId: v })}
          />
          <Field
            id="phone"
            label="Phone (+250…)"
            value={info.phone}
            onChange={(v) => setInfo({ ...info, phone: v })}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              id="city"
              label="City"
              value={info.city}
              onChange={(v) => setInfo({ ...info, city: v })}
            />
            <Field
              id="district"
              label="District"
              value={info.district}
              onChange={(v) => setInfo({ ...info, district: v })}
            />
          </div>
          <Field
            id="addressLine1"
            label="Address"
            value={info.addressLine1}
            onChange={(v) => setInfo({ ...info, addressLine1: v })}
          />
        </section>
      )}

      {step === "id" && (
        <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6">
          <h2 className="text-base font-semibold text-neutral-900">
            Upload your ID
          </h2>
          <p className="text-sm text-neutral-600">
            Front of your Rwandan national ID. Make sure all four corners are
            visible, no glare on the date of birth.
          </p>
          <PhotoCapture
            label="ID front"
            hint="JPEG or PNG up to 6 MB"
            uploadPath={`kyc/${uid}/${draftId}/id_front.jpg`}
            onUploaded={setIdPath}
            initialPath={idPath}
          />
        </section>
      )}

      {step === "selfie" && (
        <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6">
          <h2 className="text-base font-semibold text-neutral-900">Live selfie</h2>
          <p className="text-sm text-neutral-600">
            A photo of your face in good light. We&apos;ll compare it to your
            ID.
          </p>
          <PhotoCapture
            label="Selfie"
            hint="JPEG or PNG up to 6 MB"
            uploadPath={`kyc/${uid}/${draftId}/selfie.jpg`}
            onUploaded={setSelfiePath}
            initialPath={selfiePath}
          />
        </section>
      )}

      {step === "review" && (
        <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6">
          <h2 className="text-base font-semibold text-neutral-900">
            Ready to submit
          </h2>
          <p className="text-sm text-neutral-600">
            Verification usually takes under a minute. You&apos;ll be moved to
            the waiting screen.
          </p>
          <dl className="space-y-2 rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm">
            <Row label="Name" value={info.fullName} />
            <Row label="DOB" value={info.dateOfBirth} />
            <Row label="National ID" value={info.nationalId} mono />
            <Row label="Phone" value={info.phone} />
            <Row
              label="ID photo"
              value={idPath ? "uploaded" : "missing"}
              icon={
                idPath ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                ) : null
              }
            />
            <Row
              label="Selfie"
              value={selfiePath ? "uploaded" : "missing"}
              icon={
                selfiePath ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                ) : null
              }
            />
          </dl>
        </section>
      )}

      {/* Nav */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          className="text-neutral-600 hover:bg-neutral-100"
          onClick={goBack}
          disabled={stepIndex === 0 || submitting}
        >
          Back
        </Button>

        {step === "review" ? (
          <Button
            type="button"
            className="h-11 bg-neutral-900 px-5 text-white hover:bg-neutral-800"
            onClick={handleSubmit}
            disabled={!idPath || !selfiePath || submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Submitting…
              </>
            ) : (
              "Submit for review"
            )}
          </Button>
        ) : (
          <Button
            type="button"
            className="h-11 bg-neutral-900 px-5 text-white hover:bg-neutral-800"
            onClick={goNext}
            disabled={
              (step === "personal" && !personalValid) ||
              (step === "id" && !idPath) ||
              (step === "selfie" && !selfiePath)
            }
          >
            Continue
          </Button>
        )}
      </div>
    </div>
  );
}

interface FieldProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
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
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="h-11 border-neutral-300 bg-white text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-0"
      />
    </div>
  );
}

function Row({
  label,
  value,
  mono,
  icon,
}: {
  label: string;
  value: string;
  mono?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-neutral-500">{label}</dt>
      <dd
        className={
          "flex items-center gap-1.5 text-right text-neutral-800 " +
          (mono ? "font-mono text-xs" : "")
        }
      >
        {icon}
        {value}
      </dd>
    </div>
  );
}
