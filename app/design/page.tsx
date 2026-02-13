"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase";
import { WalletPreview } from "@/components/editor/WalletPreview";
import { TextEditModal } from "@/components/editor/TextEditModal";
import { BACKGROUND_PRESETS, getTemplate, templatesForLayout } from "@/lib/editor/templates";

import {
  editorReducer,
  exportToPassPayload,
  initialEditorState,
  type EditorAction,
} from "@/lib/editor/state";

export default function DesignPage() {
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [state, _dispatch] = useReducer(editorReducer, initialEditorState("card"));
  const template = useMemo(() => getTemplate(state.templateId), [state.templateId]);

  // Non-serializable upload file; the serializable state keeps only a preview src + uploadPath.
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const lastObjectUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);

  const [note, setNote] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);

  function clearPendingFile() {
    setPendingFile(null);
    if (lastObjectUrlRef.current) {
      URL.revokeObjectURL(lastObjectUrlRef.current);
      lastObjectUrlRef.current = null;
    }
  }

  const dispatch = (action: EditorAction) => {
    _dispatch(action);
  };

  function pickImageFile(f: File | null) {
    clearPendingFile();
    if (!f) return;
    setPendingFile(f);
    const url = URL.createObjectURL(f);
    lastObjectUrlRef.current = url;
    dispatch({ type: "image.setSrc", src: url });
    dispatch({ type: "image.setUploadPath", uploadPath: null });
    dispatch({ type: "image.resetTransform" });
  }

  useEffect(() => {
    return () => {
      setPendingFile(null);
      if (lastObjectUrlRef.current) {
        URL.revokeObjectURL(lastObjectUrlRef.current);
        lastObjectUrlRef.current = null;
      }
    };
  }, []);

  async function maybeUpload() {
    if (!pendingFile) return null;
    const fd = new FormData();
    fd.set("file", pendingFile);
    const res = await fetch("/api/uploads", { method: "POST", body: fd });
    if (res.status === 403) {
      // Kill switch: fall back to template-only.
      setNote("Uploads disabled. Template-only.");
      return null;
    }
    if (!res.ok) throw new Error(await res.text());
    const json = (await res.json()) as { path: string };
    dispatch({ type: "image.setUploadPath", uploadPath: json.path });
    return json.path;
  }

  async function createPass() {
    setBusy(true);
    setNote("");
    try {
      const path = state.image.uploadPath ?? (await maybeUpload());
      const payload = exportToPassPayload(template, state);

      const token = supabase
        ? (await supabase.auth.getSession()).data.session?.access_token ?? null
        : null;

      const res = await fetch("/api/passes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          type: payload.type,
          title: payload.title,
          subtitle: payload.subtitle,
          upload_path: path,
        }),
      });

      if (res.status === 402) {
        router.push("/unlock");
        return;
      }
      if (!res.ok) throw new Error(await res.text());

      const json = (await res.json()) as { passId: string };
      router.push(`/my#${json.passId}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setNote(msg);
    } finally {
      setBusy(false);
    }
  }


    const templates = templatesForLayout(state.layoutType);

  return (
    <main className="min-h-[100svh] bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-100">
      <div className="mx-auto flex min-h-[100svh] w-full max-w-[520px] flex-col pb-10">
        {/* Top layout selector (explicit exception to “bottom-sheet-only”). */}
        <div className="px-4 pt-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold tracking-tight">Design</div>
            <div className="text-xs opacity-60">{template.name}</div>
          </div>

          <div className="mt-3 grid grid-cols-2 rounded-2xl bg-white ring-1 ring-black/10 dark:bg-zinc-900 dark:ring-white/10">
            <button
              type="button"
              onClick={() => dispatch({ type: "layout.set", layoutType: "card" })}
              className={[
                "rounded-2xl px-4 py-3 text-sm",
                state.layoutType === "card"
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "opacity-70",
              ].join(" ")}
            >
              Card
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: "layout.set", layoutType: "pass" })}
              className={[
                "rounded-2xl px-4 py-3 text-sm",
                state.layoutType === "pass"
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "opacity-70",
              ].join(" ")}
            >
              Pass
            </button>
          </div>
          <div className="mt-2 text-[11px] opacity-50">Layout switch preserves content.</div>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto px-4">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => dispatch({ type: "template.set", templateId: t.id })}
              className={[
                "px-3 py-1 rounded-full text-xs whitespace-nowrap",
                state.templateId === t.id
                  ? "bg-white text-black"
                  : "bg-zinc-800 text-white",
              ].join(" ")}
            >
              {t.name}
            </button>
          ))}
        </div>

        {/* Full-screen primary surface: live preview */}
        <WalletPreview
          template={template}
          state={state}
          dispatch={dispatch}
          onRequestImageUpload={() => fileInputRef.current?.click()}
          onRequestEditText={(slotId) => setEditingSlotId(slotId)}
        />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            pickImageFile(f);
            // allow selecting same file again
            e.currentTarget.value = "";
          }}
        />

        {/* Color row (background only) */}
        <div className="px-4">
          <div className="mt-4 flex items-center justify-center gap-2">
            {BACKGROUND_PRESETS.slice(0, 7).map((p) => {
              const active = p.id === state.colors.backgroundPresetId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() =>
                    dispatch({ type: "colors.setBackground", backgroundPresetId: p.id })
                  }
                  className={[
                    "h-9 w-9 rounded-full ring-2",
                    active
                      ? "ring-black/40 dark:ring-white/40"
                      : "ring-black/10 dark:ring-white/10",
                  ].join(" ")}
                  style={{ backgroundColor: p.hex }}
                  aria-label={p.name}
                />
              );
            })}
          </div>
        </div>

        <div className="px-4 pt-6">
          <button
            type="button"
            onClick={createPass}
            disabled={busy}
            className="w-full rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {busy ? "Making…" : "Create pass"}
          </button>
          {note ? <div className="mt-2 text-xs opacity-70">{note}</div> : null}
        </div>

        <TextEditModal
          open={Boolean(editingSlotId)}
          template={template}
          slotId={editingSlotId}
          state={state}
          dispatch={dispatch}
          onClose={() => setEditingSlotId(null)}
        />
      </div>
    </main>
  );
}

