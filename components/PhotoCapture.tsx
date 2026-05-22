"use client";

import { Camera, Check, Loader2, Upload, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ref as storageRef, uploadBytes } from "firebase/storage";
import { Button } from "@/components/ui/button";
import { storage } from "@/lib/firebase-client";

interface PhotoCaptureProps {
  label: string;
  hint: string;
  /** Firebase Storage path where the file should land (no leading slash). */
  uploadPath: string;
  onUploaded: (path: string) => void;
  /** Path that was uploaded in a previous step (so the component shows
   *  "uploaded ✓" on remount). */
  initialPath?: string | null;
}

/**
 * Upload a single photo (ID side or selfie) to Firebase Storage. For the demo
 * we accept a JPEG/PNG via file picker rather than triggering a live camera
 * stream — same result on screen, simpler to debug.
 */
export function PhotoCapture({
  label,
  hint,
  uploadPath,
  onUploaded,
  initialPath,
}: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(!!initialPath);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please pick an image (JPEG or PNG).");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      toast.error("Image is over 6 MB. Pick a smaller one.");
      return;
    }
    setPreviewUrl(URL.createObjectURL(file));
    setUploading(true);
    try {
      const ref = storageRef(storage, uploadPath);
      await uploadBytes(ref, file, { contentType: file.type });
      setDone(true);
      onUploaded(uploadPath);
      toast.success(`${label} uploaded`);
    } catch (err) {
      toast.error(
        `Upload failed: ${err instanceof Error ? err.message : "unknown"}`,
      );
    } finally {
      setUploading(false);
    }
  }

  function clear() {
    setPreviewUrl(null);
    setDone(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-neutral-900">{label}</p>
          <p className="text-xs text-neutral-500">{hint}</p>
        </div>
        {done && !uploading && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
            <Check className="h-3 w-3" />
            Uploaded
          </span>
        )}
      </div>

      <div className="relative flex aspect-[3/2] w-full items-center justify-center overflow-hidden rounded-xl border border-dashed border-neutral-300 bg-neutral-50">
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt={`${label} preview`}
            fill
            className="object-cover"
            sizes="(min-width: 768px) 400px, 90vw"
            unoptimized
          />
        ) : (
          <div className="flex flex-col items-center gap-1 px-4 text-center text-neutral-500">
            <Camera className="h-6 w-6" />
            <p className="text-xs">No photo yet</p>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 text-neutral-700">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-9 flex-1 border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="mr-1.5 h-3.5 w-3.5" />
          {done ? "Replace photo" : "Choose photo"}
        </Button>
        {previewUrl && (
          <Button
            type="button"
            variant="ghost"
            className="h-9 text-neutral-500 hover:bg-neutral-100"
            onClick={clear}
            disabled={uploading}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
