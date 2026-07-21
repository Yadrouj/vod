export type SubtitleMode = "auto" | "off" | "embedded" | "online" | "local";

export type SubtitleSelection = {
  id: string;
  mode: SubtitleMode;
  label: string;
  language: string;
  url?: string | null;
  content?: string | null;
  nativeTrackId?: string | null;
};

export const AUTO_SUBTITLE_SELECTION: SubtitleSelection = {
  id: "auto",
  mode: "auto",
  label: "Automatic",
  language: "auto",
};

export const OFF_SUBTITLE_SELECTION: SubtitleSelection = {
  id: "off",
  mode: "off",
  label: "Off",
  language: "",
};
