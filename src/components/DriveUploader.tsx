"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { formatBytes } from "@/lib/format";
import { ZOOM_EXT, type Jenis } from "@/lib/types";
import { UploadAbortedError, uploadToDrive } from "@/lib/upload";

type Props = {
  requestId: string;
  kind?: "video" | "thumb";
  /** Menentukan format apa yang boleh dipilih untuk berkas utama. */
  jenis?: Jenis;
  currentName?: string | null;
  currentSize?: number | null;
  disabled?: boolean;
};

type Phase = "idle" | "menyiapkan" | "mengirim" | "mencatat" | "selesai";

export function DriveUploader({
  requestId,
  kind = "video",
  jenis = "video",
  currentName,
  currentSize,
  disabled,
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [sent, setSent] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const busy = phase !== "idle" && phase !== "selesai";
  const pct = total > 0 ? Math.round((sent / total) * 100) : 0;

  // Rekaman Zoom mentah berekstensi .zoom dan tidak punya mime video,
  // jadi filter dialog berkas harus menyebut ekstensinya langsung.
  const accept =
    kind === "thumb"
      ? "image/*"
      : jenis === "zoom"
        ? ZOOM_EXT.join(",")
        : "video/*";

  async function start(file: File) {
    setError(null);
    setPhase("menyiapkan");
    setSent(0);
    setTotal(file.size);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const sessionRes = await fetch("/api/drive/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          kind,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
        }),
      });

      const session = await sessionRes.json();
      if (!sessionRes.ok) throw new Error(session.error ?? "Gagal menyiapkan upload");

      setPhase("mengirim");
      const uploaded = await uploadToDrive({
        file,
        uploadUrl: session.uploadUrl as string,
        signal: controller.signal,
        onProgress: (p) => setSent(p.sent),
      });

      setPhase("mencatat");
      const attachRes = await fetch("/api/drive/attach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, kind, fileId: uploaded.id }),
      });

      const attach = await attachRes.json();
      if (!attachRes.ok) throw new Error(attach.error ?? "Gagal mencatat file");

      setPhase("selesai");
      router.refresh();
    } catch (err) {
      if (err instanceof UploadAbortedError) {
        setPhase("idle");
        return;
      }
      setError(err instanceof Error ? err.message : "Upload gagal");
      setPhase("idle");
    } finally {
      abortRef.current = null;
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const label =
    kind === "thumb" ? "thumbnail" : jenis === "zoom" ? "rekaman Zoom" : "video";

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (disabled || busy) return;
          const file = e.dataTransfer.files?.[0];
          if (file) void start(file);
        }}
        className={`rounded-xl border border-dashed p-5 text-center transition ${
          dragging
            ? "border-brand-500 bg-brand-500/5"
            : "border-ink-700 bg-ink-850/50"
        } ${disabled ? "opacity-50" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          disabled={disabled || busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void start(file);
          }}
        />

        {busy ? (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-ink-300">
                {phase === "menyiapkan" && "Menyiapkan…"}
                {phase === "mengirim" && `Mengirim ke Drive — ${pct}%`}
                {phase === "mencatat" && "Mencatat file…"}
              </span>
              <span className="text-xs text-ink-400">
                {formatBytes(sent)} / {formatBytes(total)}
              </span>
            </div>

            <div className="h-1.5 overflow-hidden rounded-full bg-ink-800">
              <div
                className="h-full rounded-full bg-brand-500 transition-[width] duration-200"
                style={{ width: `${phase === "mengirim" ? pct : 100}%` }}
              />
            </div>

            <button
              type="button"
              className="text-xs text-ink-400 underline underline-offset-2 hover:text-ink-100"
              onClick={() => abortRef.current?.abort()}
            >
              Batalkan
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-ink-300">
              Tarik file {label} ke sini, atau
            </p>
            <button
              type="button"
              className="btn-ghost mt-2.5"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
            >
              Pilih file {label}
            </button>
            {currentName && (
              <p className="mt-3 text-xs text-ink-400">
                Sekarang: <span className="text-ink-300">{currentName}</span>
                {currentSize ? ` · ${formatBytes(currentSize)}` : ""}
                {" — upload lagi untuk mengganti"}
              </p>
            )}
          </>
        )}
      </div>

      {phase === "selesai" && !error && (
        <p className="mt-2 text-xs text-emerald-400">
          File masuk ke Drive dan sudah tercatat.
        </p>
      )}
      {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
    </div>
  );
}
