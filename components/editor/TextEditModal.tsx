import { useEffect, useMemo, useRef } from "react";
import type { EditorAction, EditorState, TextSize } from "@/lib/editor/state";
import type { WalletTemplate } from "@/lib/editor/templates";

function sizeLabel(size: TextSize) {
  if (size === "sm") return "Small";
  if (size === "lg") return "Large";
  return "Medium";
}

export function TextEditModal(props: {
  open: boolean;
  template: WalletTemplate;
  slotId: string | null;
  state: EditorState;
  dispatch: (action: EditorAction) => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const slot = useMemo(() => {
    if (!props.slotId) return null;
    return props.template.textSlots.find((s) => s.id === props.slotId) ?? null;
  }, [props.slotId, props.template.textSlots]);

  const value = props.slotId ? props.state.texts[props.slotId] ?? "" : "";
  const style = props.slotId
    ? props.state.textStyles[props.slotId] ?? { bold: false, size: "md" as const }
    : { bold: false, size: "md" as const };

  useEffect(() => {
    if (!props.open) return;
    const t = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(t);
  }, [props.open]);

  if (!props.open || !props.slotId || !slot) return null;

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Edit text"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={props.onClose}
        aria-label="Close"
      />

      <div
        className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[520px] rounded-t-3xl bg-white p-4 ring-1 ring-black/10 dark:bg-zinc-950 dark:ring-white/10"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}
      >
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">
            {slot.role === "title" ? "Title" : slot.role === "subtitle" ? "Subtitle" : "Text"}
          </div>
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-xl px-3 py-2 text-sm opacity-70 ring-1 ring-black/10 dark:ring-white/10"
          >
            Done
          </button>
        </div>

        <label className="mt-3 grid gap-2">
          <span className="text-xs opacity-60">Text</span>
          <textarea
            ref={inputRef}
            value={value}
            onChange={(e) =>
              props.dispatch({
                type: "text.set",
                slotId: props.slotId!,
                value: e.target.value,
              })
            }
            className="min-h-[96px] w-full resize-none rounded-2xl bg-transparent px-3 py-3 ring-1 ring-black/10 outline-none focus:ring-2 focus:ring-black/20 dark:ring-white/10 dark:focus:ring-white/20"
            placeholder="Type…"
          />
          <div className="text-[11px] opacity-50">Max lines: {slot.maxLines}</div>
        </label>

        <div className="mt-4 grid gap-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-medium opacity-60">Bold</div>
            <button
              type="button"
              onClick={() =>
                props.dispatch({
                  type: "textStyle.setBold",
                  slotId: props.slotId!,
                  bold: !style.bold,
                })
              }
              className={[
                "rounded-2xl px-4 py-2 text-sm ring-1",
                style.bold
                  ? "bg-black text-white ring-black/20 dark:bg-white dark:text-black dark:ring-white/20"
                  : "ring-black/10 dark:ring-white/10",
              ].join(" ")}
            >
              {style.bold ? "On" : "Off"}
            </button>
          </div>

          <div className="grid gap-2">
            <div className="text-xs font-medium opacity-60">Size</div>
            <div className="grid grid-cols-3 gap-2">
              {(["sm", "md", "lg"] as const).map((s) => {
                const active = style.size === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() =>
                      props.dispatch({
                        type: "textStyle.setSize",
                        slotId: props.slotId!,
                        size: s,
                      })
                    }
                    className={[
                      "rounded-2xl px-3 py-3 text-sm ring-1",
                      active
                        ? "bg-black text-white ring-black/20 dark:bg-white dark:text-black dark:ring-white/20"
                        : "ring-black/10 dark:ring-white/10",
                    ].join(" ")}
                  >
                    {sizeLabel(s)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

