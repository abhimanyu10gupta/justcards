export type LayoutType = "card" | "pass";

export type NormalizedRect = {
  /** 0..1 */
  x: number;
  /** 0..1 */
  y: number;
  /** 0..1 */
  w: number;
  /** 0..1 */
  h: number;
};

export type FontSizeBounds = {
  min: number;
  max: number;
  default: number;
};

export type TextAlign = "left" | "center" | "right";

export type TemplateTextSlot = {
  id: string;
  /**
   * Optional semantic role so the editor can export to the existing
   * pass contract (`title` + `subtitle`) without hardcoding template ids.
   */
  role?: "title" | "subtitle";
  /** Normalized position within the preview surface. */
  rect: NormalizedRect;
  align: TextAlign;
  maxLines: number;
  fontSize: FontSizeBounds;
  /**
   * Controls whether this slot can be tapped to focus.
   * (Used by “Skin”: text is present but not a movable/editable surface.)
   */
  selectable?: boolean;
  /**
   * If false, the slot is still present in state/export but is visually minimized.
   * (Used for “Skin” wallet-validity text.)
   */
  visible?: boolean;
  /** Higher renders on top. */
  zIndex: number;
};

export type PanBounds = {
  /** Normalized in units of half-zone size. Example: -0.5..0.5 */
  min: number;
  max: number;
};

export type TemplateImageZone = {
  rect: NormalizedRect;
  minScale: number;
  maxScale: number;
  panX: PanBounds;
  panY: PanBounds;
  /**
   * If true, the zone is intended as a full-bleed background.
   * (Still bounded by wallet-safe constraints encoded in `rect` + pan bounds.)
   */
  fullBleed?: boolean;
};

export type TemplateLayering = "imageUnderText" | "textUnderImage";

export type ColorPreset = { id: string; name: string; hex: string };

export type WalletTemplate = {
  id: string;
  name: string;
  layoutType: LayoutType;
  /**
   * Existing backend expects `type` to be "meme" | "streak" (or "club").
   * We keep the editor fully template-driven by mapping templates to pass types.
   */
  passType: "meme" | "streak";

  imageZone: TemplateImageZone | null;
  textSlots: TemplateTextSlot[];
  layering: TemplateLayering;

  /** Defaults for the editor state when this template is selected. */
  defaults: {
    backgroundPresetId: string;
    textPresetId: string;
    textBySlotId?: Record<string, string>;
  };
};

export const BACKGROUND_PRESETS: ColorPreset[] = [
  { id: "bg-black", name: "Black", hex: "#000000" },
  { id: "bg-zinc-900", name: "Zinc", hex: "#18181b" },
  { id: "bg-slate-900", name: "Slate", hex: "#0f172a" },
  { id: "bg-indigo-950", name: "Indigo", hex: "#1e1b4b" },
  { id: "bg-emerald-950", name: "Emerald", hex: "#022c22" },
];

export const TEXT_PRESETS: ColorPreset[] = [
  { id: "text-white", name: "White", hex: "#ffffff" },
  { id: "text-zinc-100", name: "Zinc", hex: "#f4f4f5" },
  { id: "text-amber-100", name: "Amber", hex: "#fef3c7" },
];

/**
 * Starter templates (data-only).
 * New templates should be addable by defining new objects here.
 */
export const WALLET_TEMPLATES: WalletTemplate[] = [
  {
    id: "card.basic",
    name: "Basic Card",
    layoutType: "card",
    passType: "meme",
    layering: "imageUnderText",
    imageZone: {
      // Wallet-safe-ish: keep padding top/bottom for text readability.
      rect: { x: 0.04, y: 0.06, w: 0.92, h: 0.60 },
      minScale: 1,
      maxScale: 3,
      panX: { min: -0.6, max: 0.6 },
      panY: { min: -0.6, max: 0.6 },
    },
    textSlots: [
      {
        id: "title",
        role: "title",
        rect: { x: 0.06, y: 0.70, w: 0.88, h: 0.16 },
        align: "left",
        maxLines: 2,
        fontSize: { min: 18, max: 34, default: 26 },
        selectable: true,
        visible: true,
        zIndex: 20,
      },
      {
        id: "subtitle",
        role: "subtitle",
        rect: { x: 0.06, y: 0.86, w: 0.88, h: 0.10 },
        align: "left",
        maxLines: 1,
        fontSize: { min: 12, max: 18, default: 14 },
        selectable: true,
        visible: true,
        zIndex: 20,
      },
    ],
    defaults: {
      backgroundPresetId: "bg-black",
      textPresetId: "text-white",
      textBySlotId: {
        title: "stupid card",
        subtitle: "looks real enough",
      },
    },
  },
  {
    id: "card.skin",
    name: "Skin (Full Bleed)",
    layoutType: "card",
    passType: "meme",
    layering: "imageUnderText",
    imageZone: {
      rect: { x: 0.02, y: 0.02, w: 0.96, h: 0.96 },
      minScale: 1,
      maxScale: 4,
      panX: { min: -0.75, max: 0.75 },
      panY: { min: -0.75, max: 0.75 },
      fullBleed: true,
    },
    // Text exists for wallet validity but is visually minimal and not tappable.
    textSlots: [
      {
        id: "title",
        role: "title",
        rect: { x: 0.06, y: 0.90, w: 0.88, h: 0.06 },
        align: "left",
        maxLines: 1,
        fontSize: { min: 8, max: 12, default: 9 },
        selectable: false,
        visible: false,
        zIndex: 30,
      },
      {
        id: "subtitle",
        role: "subtitle",
        rect: { x: 0.06, y: 0.96, w: 0.88, h: 0.03 },
        align: "left",
        maxLines: 1,
        fontSize: { min: 8, max: 12, default: 9 },
        selectable: false,
        visible: false,
        zIndex: 30,
      },
    ],
    defaults: {
      backgroundPresetId: "bg-black",
      textPresetId: "text-white",
      textBySlotId: {
        title: "cardlol",
        subtitle: "",
      },
    },
  },
  {
    id: "pass.basic",
    name: "Basic Pass",
    layoutType: "pass",
    passType: "meme",
    layering: "imageUnderText",
    imageZone: {
      rect: { x: 0.06, y: 0.08, w: 0.88, h: 0.46 },
      minScale: 1,
      maxScale: 3,
      panX: { min: -0.6, max: 0.6 },
      panY: { min: -0.6, max: 0.6 },
    },
    textSlots: [
      {
        id: "title",
        role: "title",
        rect: { x: 0.08, y: 0.60, w: 0.84, h: 0.14 },
        align: "left",
        maxLines: 2,
        fontSize: { min: 18, max: 34, default: 26 },
        selectable: true,
        visible: true,
        zIndex: 20,
      },
      {
        id: "subtitle",
        role: "subtitle",
        rect: { x: 0.08, y: 0.74, w: 0.84, h: 0.10 },
        align: "left",
        maxLines: 2,
        fontSize: { min: 12, max: 18, default: 14 },
        selectable: true,
        visible: true,
        zIndex: 20,
      },
    ],
    defaults: {
      backgroundPresetId: "bg-black",
      textPresetId: "text-white",
      textBySlotId: {
        title: "stupid pass",
        subtitle: "ticket-like, wallet-ish",
      },
    },
  },
  {
    id: "pass.skin",
    name: "Skin Pass (Full Bleed)",
    layoutType: "pass",
    passType: "meme",
    layering: "imageUnderText",
    imageZone: {
      rect: { x: 0.04, y: 0.04, w: 0.92, h: 0.92 },
      minScale: 1,
      maxScale: 4,
      panX: { min: -0.75, max: 0.75 },
      panY: { min: -0.75, max: 0.75 },
      fullBleed: true,
    },
    textSlots: [
      {
        id: "title",
        role: "title",
        rect: { x: 0.08, y: 0.93, w: 0.84, h: 0.05 },
        align: "left",
        maxLines: 1,
        fontSize: { min: 8, max: 12, default: 9 },
        selectable: false,
        visible: false,
        zIndex: 30,
      },
      {
        id: "subtitle",
        role: "subtitle",
        rect: { x: 0.08, y: 0.98, w: 0.84, h: 0.02 },
        align: "left",
        maxLines: 1,
        fontSize: { min: 8, max: 12, default: 9 },
        selectable: false,
        visible: false,
        zIndex: 30,
      },
    ],
    defaults: {
      backgroundPresetId: "bg-black",
      textPresetId: "text-white",
      textBySlotId: {
        title: "cardlol",
        subtitle: "",
      },
    },
  },
];

export function templatesForLayout(layoutType: LayoutType) {
  return WALLET_TEMPLATES.filter((t) => t.layoutType === layoutType);
}

export function getTemplate(templateId: string): WalletTemplate {
  const t = WALLET_TEMPLATES.find((x) => x.id === templateId);
  if (!t) throw new Error(`Unknown template: ${templateId}`);
  return t;
}

export function getColorPreset(
  kind: "background" | "text",
  id: string
): ColorPreset | null {
  const list = kind === "background" ? BACKGROUND_PRESETS : TEXT_PRESETS;
  return list.find((p) => p.id === id) ?? null;
}

