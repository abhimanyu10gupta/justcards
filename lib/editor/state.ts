import type { LayoutType, WalletTemplate } from "@/lib/editor/templates";
import { getTemplate, templatesForLayout } from "@/lib/editor/templates";

export type TextSize = "sm" | "md" | "lg";
export type TextStyle = { bold: boolean; size: TextSize };

export type ImageTransform = {
  /**
   * Normalized pan in units of half-zone size.
   * Example: x=1 means translate by (zoneWidth / 2) pixels.
   */
  x: number;
  y: number;
  scale: number;
};

export type EditorState = {
  layoutType: LayoutType;
  templateId: string;

  texts: Record<string, string>;
  textStyles: Record<string, TextStyle>;

  image: {
    /** URL string usable by <img src>. Can be a blob URL. */
    src: string | null;
    /** Returned by /api/uploads */
    uploadPath: string | null;
    transform: ImageTransform;
  };

  colors: {
    backgroundPresetId: string;
    textPresetId: string;
  };
};

export type EditorAction =
  | { type: "layout.set"; layoutType: LayoutType }
  | { type: "template.set"; templateId: string }
  | { type: "text.set"; slotId: string; value: string }
  | { type: "textStyle.setBold"; slotId: string; bold: boolean }
  | { type: "textStyle.setSize"; slotId: string; size: TextSize }
  | { type: "image.setSrc"; src: string | null }
  | { type: "image.setUploadPath"; uploadPath: string | null }
  | { type: "image.setTransform"; transform: Partial<ImageTransform> }
  | { type: "image.resetTransform" }
  | { type: "colors.setBackground"; backgroundPresetId: string }
  | { type: "colors.setText"; textPresetId: string }
  | { type: "reset.all" };

const DEFAULT_IMAGE_TRANSFORM: ImageTransform = { x: 0, y: 0, scale: 1 };
const DEFAULT_TEXT_STYLE: TextStyle = { bold: false, size: "md" };

function stateFromTemplate(layoutType: LayoutType, t: WalletTemplate): EditorState {
  const texts: Record<string, string> = {};
  const textStyles: Record<string, TextStyle> = {};
  for (const slot of t.textSlots) {
    const dv = t.defaults.textBySlotId?.[slot.id];
    if (typeof dv === "string") texts[slot.id] = dv;
    else if (slot.role === "title") texts[slot.id] = "stupid card";
    else if (slot.role === "subtitle") texts[slot.id] = "looks real enough";
    else texts[slot.id] = "";

    textStyles[slot.id] = {
      ...DEFAULT_TEXT_STYLE,
      bold: slot.role === "title",
      size: slot.role === "title" ? "lg" : "md",
    };
  }

  return {
    layoutType,
    templateId: t.id,
    texts,
    textStyles,
    image: {
      src: null,
      uploadPath: null,
      transform: { ...DEFAULT_IMAGE_TRANSFORM },
    },
    colors: {
      backgroundPresetId: t.defaults.backgroundPresetId,
      textPresetId: t.defaults.textPresetId,
    },
  };
}

export function initialEditorState(layoutType: LayoutType): EditorState {
  const list = templatesForLayout(layoutType);
  const first = list[0];
  if (!first) throw new Error(`No templates for layout: ${layoutType}`);
  return stateFromTemplate(layoutType, first);
}

function mergeContentAcrossTemplates(
  fromTemplate: WalletTemplate,
  fromState: EditorState,
  toTemplate: WalletTemplate,
  layoutType: LayoutType,
  opts: { resetImageTransform?: boolean }
): EditorState {
  const nextTexts: Record<string, string> = {};
  const nextTextStyles: Record<string, TextStyle> = {};

  const fromSlotsByRole = new Map<string, string>();
  for (const s of fromTemplate.textSlots) {
    if (s.role) fromSlotsByRole.set(s.role, s.id);
  }

  for (const slot of toTemplate.textSlots) {
    const byId = fromState.texts[slot.id];
    const byRole =
      slot.role && fromSlotsByRole.get(slot.role)
        ? fromState.texts[fromSlotsByRole.get(slot.role)!]
        : undefined;

    const value =
      typeof byId === "string"
        ? byId
        : typeof byRole === "string"
          ? byRole
          : toTemplate.defaults.textBySlotId?.[slot.id] ?? "";

    nextTexts[slot.id] = value;

    const styleById = fromState.textStyles[slot.id];
    const styleByRole =
      slot.role && fromSlotsByRole.get(slot.role)
        ? fromState.textStyles[fromSlotsByRole.get(slot.role)!]
        : undefined;

    nextTextStyles[slot.id] = styleById ?? styleByRole ?? {
      ...DEFAULT_TEXT_STYLE,
      bold: slot.role === "title",
      size: slot.role === "title" ? "lg" : "md",
    };
  }

  return {
    ...fromState,
    layoutType,
    templateId: toTemplate.id,
    texts: nextTexts,
    textStyles: nextTextStyles,
    image: {
      ...fromState.image,
      transform: opts.resetImageTransform
        ? { ...DEFAULT_IMAGE_TRANSFORM }
        : fromState.image.transform,
    },
    colors: { ...fromState.colors },
  };
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "layout.set": {
      const to = templatesForLayout(action.layoutType)[0];
      if (!to) return state;
      const from = getTemplate(state.templateId);
      // New UX: preserve content; reset only the selected template (to first in layout).
      return mergeContentAcrossTemplates(from, state, to, action.layoutType, {
        resetImageTransform: true,
      });
    }
    case "template.set": {
      const t = getTemplate(action.templateId);
      const from = getTemplate(state.templateId);
      // Preserve user content when swapping templates (still template-driven).
      return mergeContentAcrossTemplates(from, state, t, state.layoutType, {
        resetImageTransform: false,
      });
    }
    case "reset.all": {
      return initialEditorState(state.layoutType);
    }
    case "text.set":
      return {
        ...state,
        texts: { ...state.texts, [action.slotId]: action.value },
      };
    case "textStyle.setBold":
      return {
        ...state,
        textStyles: {
          ...state.textStyles,
          [action.slotId]: {
            ...(state.textStyles[action.slotId] ?? DEFAULT_TEXT_STYLE),
            bold: action.bold,
          },
        },
      };
    case "textStyle.setSize":
      return {
        ...state,
        textStyles: {
          ...state.textStyles,
          [action.slotId]: {
            ...(state.textStyles[action.slotId] ?? DEFAULT_TEXT_STYLE),
            size: action.size,
          },
        },
      };
    case "image.setSrc":
      return {
        ...state,
        image: { ...state.image, src: action.src },
      };
    case "image.setUploadPath":
      return {
        ...state,
        image: { ...state.image, uploadPath: action.uploadPath },
      };
    case "image.setTransform": {
      const next = {
        ...state.image.transform,
        ...action.transform,
      };
      return { ...state, image: { ...state.image, transform: next } };
    }
    case "image.resetTransform":
      return {
        ...state,
        image: {
          ...state.image,
          transform: { ...DEFAULT_IMAGE_TRANSFORM },
        },
      };
    case "colors.setBackground":
      return {
        ...state,
        colors: { ...state.colors, backgroundPresetId: action.backgroundPresetId },
      };
    case "colors.setText":
      return {
        ...state,
        colors: { ...state.colors, textPresetId: action.textPresetId },
      };
    default:
      return state;
  }
}

export function exportToPassPayload(t: WalletTemplate, state: EditorState) {
  const titleSlot = t.textSlots.find((s) => s.role === "title")?.id ?? "title";
  const subtitleSlot =
    t.textSlots.find((s) => s.role === "subtitle")?.id ?? "subtitle";

  return {
    type: t.passType,
    title: String(state.texts[titleSlot] ?? "").slice(0, 80),
    subtitle: String(state.texts[subtitleSlot] ?? "").slice(0, 80),
  } as const;
}

