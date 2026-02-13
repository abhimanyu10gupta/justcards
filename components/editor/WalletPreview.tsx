import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import type { EditorAction, EditorState } from "@/lib/editor/state";
import { getColorPreset } from "@/lib/editor/templates";
import type { WalletTemplate } from "@/lib/editor/templates";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function PlusIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
      className="opacity-70"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function aspectRatioForLayout(layoutType: WalletTemplate["layoutType"]) {
  // Layout families own aspect ratio (not templates).
  // Card: credit-card-ish. Pass: ticket-ish.
  return layoutType === "card" ? 1.586 : 0.72;
}

type Props = {
  template: WalletTemplate;
  state: EditorState;
  dispatch: (action: EditorAction) => void;
  onRequestImageUpload: () => void;
  onRequestEditText: (slotId: string) => void;
};

export function WalletPreview({
  template,
  state,
  dispatch,
  onRequestImageUpload,
  onRequestEditText,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const bg = useMemo(
    () => getColorPreset("background", state.colors.backgroundPresetId)?.hex ?? "#000",
    [state.colors.backgroundPresetId]
  );
  const fg = useMemo(
    () => getColorPreset("text", state.colors.textPresetId)?.hex ?? "#fff",
    [state.colors.textPresetId]
  );

  const zonePx = useMemo(() => {
    const z = template.imageZone;
    if (!z) return null;
    return {
      left: z.rect.x * size.w,
      top: z.rect.y * size.h,
      width: z.rect.w * size.w,
      height: z.rect.h * size.h,
    };
  }, [template.imageZone, size.h, size.w]);

  const baseScale = useMemo(() => {
    if (!zonePx || !naturalSize) return 1;
  
    const scaleX = zonePx.width / naturalSize.w;
    const scaleY = zonePx.height / naturalSize.h;
  
    return Math.max(scaleX, scaleY);
  }, [zonePx, naturalSize]);

  // Pointer gesture state for image pan/zoom.
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const gestureRef = useRef<{
    startX: number;
    startY: number;
    startScale: number;
    startDist: number;
    startMid: { x: number; y: number };
  } | null>(null);

  function commitImageTransform(next: Partial<EditorState["image"]["transform"]>) {
    if (!template.imageZone) return;
    const z = template.imageZone;
    const cur = state.image.transform;
    if (!zonePx || !naturalSize) return;

    const finalScale = baseScale * (next.scale ?? cur.scale);
    
    const scaledW = naturalSize.w * finalScale;
    const scaledH = naturalSize.h * finalScale;
    
    const overflowX = Math.max(0, (scaledW - zonePx.width) / 2);
    const overflowY = Math.max(0, (scaledH - zonePx.height) / 2);
    
    const maxX = overflowX / (zonePx.width / 2);
    const maxY = overflowY / (zonePx.height / 2);
    
    const x = clamp(next.x ?? cur.x, -maxX, maxX);
    const y = clamp(next.y ?? cur.y, -maxY, maxY);
    const scale = clamp(next.scale ?? cur.scale, z.minScale, z.maxScale);
    dispatch({ type: "image.setTransform", transform: { x, y, scale } });
  }

  function onImagePointerDown(e: PointerEvent) {
    if (!template.imageZone) return;
    if (!state.image.src) {
      // onRequestImageUpload();
      return;
    }

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const pts = Array.from(pointersRef.current.values());
    if (pts.length === 1) {
      gestureRef.current = {
        startX: state.image.transform.x,
        startY: state.image.transform.y,
        startScale: state.image.transform.scale,
        startDist: 0,
        startMid: { x: pts[0]!.x, y: pts[0]!.y },
      };
    } else if (pts.length === 2) {
      const [a, b] = pts;
      const dx = (b!.x ?? 0) - (a!.x ?? 0);
      const dy = (b!.y ?? 0) - (a!.y ?? 0);
      const dist = Math.max(1, Math.hypot(dx, dy));
      gestureRef.current = {
        startX: state.image.transform.x,
        startY: state.image.transform.y,
        startScale: state.image.transform.scale,
        startDist: dist,
        startMid: { x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 },
      };
    }
  }

  function onImagePointerMove(e: PointerEvent) {
    if (!template.imageZone) return;
    if (!state.image.src) return;
    if (!zonePx) return;
    if (!pointersRef.current.has(e.pointerId)) return;

    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = Array.from(pointersRef.current.values());
    const g = gestureRef.current;
    if (!g) return;

    if (pts.length === 1) {
      const p = pts[0]!;
      const dx = p.x - g.startMid.x;
      const dy = p.y - g.startMid.y;

      const nx = g.startX + dx / Math.max(1, zonePx.width / 2);
      const ny = g.startY + dy / Math.max(1, zonePx.height / 2);
      commitImageTransform({ x: nx, y: ny });
      return;
    }

    if (pts.length >= 2) {
      const [a, b] = pts;
      const dx = (b!.x ?? 0) - (a!.x ?? 0);
      const dy = (b!.y ?? 0) - (a!.y ?? 0);
      const dist = Math.max(1, Math.hypot(dx, dy));
      const ratio = dist / Math.max(1, g.startDist);
      const scale = g.startScale * ratio;

      const mid = { x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 };
      const mdx = mid.x - g.startMid.x;
      const mdy = mid.y - g.startMid.y;

      const nx = g.startX + mdx / Math.max(1, zonePx.width / 2);
      const ny = g.startY + mdy / Math.max(1, zonePx.height / 2);
      commitImageTransform({ x: nx, y: ny, scale });
    }
  }

  function onImagePointerUp(e: PointerEvent) {
    pointersRef.current.delete(e.pointerId);
    const pts = Array.from(pointersRef.current.values());
    if (pts.length === 0) {
      gestureRef.current = null;
      return;
    }
    if (pts.length === 1) {
      const p = pts[0]!;
      gestureRef.current = {
        startX: state.image.transform.x,
        startY: state.image.transform.y,
        startScale: state.image.transform.scale,
        startDist: 0,
        startMid: { x: p.x, y: p.y },
      };
      return;
    }
    if (pts.length >= 2) {
      const [a, b] = pts;
      const dx = (b!.x ?? 0) - (a!.x ?? 0);
      const dy = (b!.y ?? 0) - (a!.y ?? 0);
      const dist = Math.max(1, Math.hypot(dx, dy));
      gestureRef.current = {
        startX: state.image.transform.x,
        startY: state.image.transform.y,
        startScale: state.image.transform.scale,
        startDist: dist,
        startMid: { x: (a!.x + b!.x) / 2, y: (a!.y + b!.y) / 2 },
      };
    }
  }

  function focusText(slotId: string, selectable: boolean | undefined) {
    if (selectable === false) return;
    onRequestEditText(slotId);
  }

  const layers =
    template.layering === "textUnderImage"
      ? ["text", "image"] as const
      : ["image", "text"] as const;

  const ratio = aspectRatioForLayout(state.layoutType);

  return (
    <div className="flex w-full flex-1 items-center justify-center px-4 pt-4">
      <div
        ref={containerRef}
        className="relative w-full max-w-[440px] select-none overflow-hidden rounded-[28px] ring-1 ring-black/10 shadow-sm dark:ring-white/10"
        style={{
          aspectRatio: String(ratio),
          backgroundColor: bg,
          touchAction: state.image.src ? "none" : "auto",
        }}
        aria-label="Card preview"
      >
        {/* Subtle border highlight */}
        <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-white/10" />

        {layers.map((layer) => {
          if (layer === "image") {
            const z = template.imageZone;
            if (!z) return null;
            const left = z.rect.x * 100;
            const top = z.rect.y * 100;
            const width = z.rect.w * 100;
            const height = z.rect.h * 100;

            const tx = zonePx ? state.image.transform.x * (zonePx.width / 2) : 0;
            const ty = zonePx ? state.image.transform.y * (zonePx.height / 2) : 0;

            const finalScale = baseScale * state.image.transform.scale;

            return (
              <div
                key="image"
                className={[
                  "absolute overflow-hidden rounded-[22px]",
                  state.image.src
                    ? "ring-1 ring-black/10 dark:ring-white/10"
                    : "ring-1 ring-white/0",
                ].join(" ")}
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  width: `${width}%`,
                  height: `${height}%`,
                  touchAction: "none",
                }}
                // onPointerDown={onImagePointerDown}
                // onPointerMove={onImagePointerMove}
                // onPointerUp={onImagePointerUp}
                // onPointerCancel={onImagePointerUp}
                // onPointerLeave={onImagePointerUp}
                role="button"
                aria-label="Background image"
              >
                {state.image.src ? (
                  
                  // eslint-disable-next-line @next/next/no-img-element
                  <div
                  className="absolute inset-0"
                  style={{ touchAction: "none" }}
                  onPointerDown={onImagePointerDown}
                  onPointerMove={onImagePointerMove}
                  onPointerUp={onImagePointerUp}
                  onPointerCancel={onImagePointerUp}
                  onPointerLeave={onImagePointerUp}
                >
                  
                  <img
                    src={state.image.src}
                    alt=""
                    className="absolute left-1/2 top-1/2 max-w-none max-h-none"
  
                    style={{
                      width: naturalSize ? `${naturalSize.w * finalScale}px` : "100%",
                      height: naturalSize ? `${naturalSize.h * finalScale}px` : "auto",
                      transform: `translate(-50%, -50%) translate(${tx}px, ${ty}px)`,
                      transformOrigin: "center",
                      willChange: "transform",
                    }}
                    
                    draggable={false}
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      setNaturalSize({
                        w: img.naturalWidth,
                        h: img.naturalHeight,
                      })
                    }}
                  />
                  </div>
                ) : (
                  <div
                    className="relative flex h-full w-full items-center justify-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRequestImageUpload();
                    }}
                    role="button"
                    aria-label="Upload image"
                  >
                    <div className="absolute inset-0 rounded-[22px] border border-dashed border-white/30" />
                    <div className="flex items-center justify-center rounded-full bg-black/20 px-3 py-2 text-xs text-white backdrop-blur-sm">
                      <PlusIcon />
                      <span className="ml-2 opacity-90">Add image</span>
                    </div>
                  </div>
                )}
                  {state.image.src && (
                    <button
                      className="absolute bottom-2 right-2 rounded-full bg-black/40 px-2 py-1 text-xs text-white backdrop-blur-sm z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRequestImageUpload();
                      }}
                    >
                      Change
                    </button>
                  )}
              </div>
            );
          }

          // layer === "text"
          return (
            <div key="text" className="absolute inset-0 pointer-events-none">
              {template.textSlots
                .slice()
                .sort((a, b) => a.zIndex - b.zIndex)
                .map((slot) => {
                  const v = state.texts[slot.id] ?? "";
                  const r = slot.rect;
                  const visible = slot.visible !== false;
                  const selectable = slot.selectable !== false;
                  const style = state.textStyles[slot.id] ?? { bold: false, size: "md" };

                  const fontSize =
                    style.size === "sm"
                      ? slot.fontSize.min
                      : style.size === "lg"
                        ? slot.fontSize.max
                        : slot.fontSize.default;

                  const showPlaceholder = selectable && visible && v.trim().length === 0;

                  return (
                    <div
                      key={slot.id}
                      className={[
                        "absolute rounded-lg px-2 py-1",
                        selectable ? "pointer-events-auto cursor-pointer" : "pointer-events-none",
                      ].join(" ")}
                      style={{
                        left: `${r.x * 100}%`,
                        top: `${r.y * 100}%`,
                        width: `${r.w * 100}%`,
                        height: `${r.h * 100}%`,
                        color: fg,
                        textAlign: slot.align,
                        fontSize: `${fontSize}px`,
                        lineHeight: 1.12,
                        fontWeight: style.bold ? 800 : slot.role === "title" ? 700 : 500,
                        opacity: visible ? 0.92 : 0.03,
                        display: "-webkit-box",
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: slot.maxLines,
                        overflow: "hidden",
                      }}
                      onClick={() => focusText(slot.id, slot.selectable)}
                      role="button"
                      aria-label={`Edit ${slot.role ?? slot.id}`}
                    >
                      {showPlaceholder ? (
                        <div className="relative flex h-full w-full items-center justify-center">
                          <div className="absolute inset-0 rounded-lg border border-dashed border-white/30" />
                          <div className="flex items-center justify-center rounded-full bg-black/20 px-3 py-2 text-xs text-white backdrop-blur-sm">
                            <PlusIcon />
                            <span className="ml-2 opacity-90">Add text</span>
                          </div>
                        </div>
                      ) : (
                        v
                      )}
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

