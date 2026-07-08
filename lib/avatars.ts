// 10 ready-made bodybuilder avatars (5 men + 5 women, young → old) that every
// community user picks from. Skin tone is chosen separately and overrides the
// preset default, so the same avatar works for any complexion.

export interface AvatarPreset {
  id: number;
  gender: "male" | "female";
  labelFa: string;
  labelEn: string;
  hair: string; // hair colour
  hairStyle: "short" | "buzz" | "bald" | "quiff" | "pony" | "bun" | "bob" | "wavy" | "shortF";
  beard: "none" | "stubble" | "beard" | "grayBeard";
  top: string; // tank-top colour
  skin: string; // default skin (user can override)
}

export const USER_AVATARS: AvatarPreset[] = [
  // ---- men: young → old ----
  { id: 0, gender: "male", labelFa: "بدنساز جوان", labelEn: "Young lifter", hair: "#221a12", hairStyle: "short", beard: "none", top: "#b8f24a", skin: "#e8b489" },
  { id: 1, gender: "male", labelFa: "بدنساز", labelEn: "Athlete", hair: "#1c150f", hairStyle: "buzz", beard: "stubble", top: "#2e7d9a", skin: "#d99a6c" },
  { id: 2, gender: "male", labelFa: "قهرمان", labelEn: "Champion", hair: "#20160f", hairStyle: "quiff", beard: "beard", top: "#d1495b", skin: "#c07d4f" },
  { id: 3, gender: "male", labelFa: "کهنه‌کار", labelEn: "Veteran", hair: "#6b6b6b", hairStyle: "short", beard: "grayBeard", top: "#5e6472", skin: "#e8b489" },
  { id: 4, gender: "male", labelFa: "پیشکسوت", labelEn: "Master", hair: "#b8b8b8", hairStyle: "bald", beard: "grayBeard", top: "#3a8f7a", skin: "#c07d4f" },
  // ---- women: young → old ----
  { id: 5, gender: "female", labelFa: "بدنساز جوان", labelEn: "Young lifter", hair: "#2a1d14", hairStyle: "pony", beard: "none", top: "#ec6ba0", skin: "#eebf9a" },
  { id: 6, gender: "female", labelFa: "ورزشکار", labelEn: "Athlete", hair: "#241a12", hairStyle: "bun", beard: "none", top: "#8a5cf6", skin: "#d99a6c" },
  { id: 7, gender: "female", labelFa: "قهرمان", labelEn: "Champion", hair: "#2b211a", hairStyle: "bob", beard: "none", top: "#2eb8a6", skin: "#c07d4f" },
  { id: 8, gender: "female", labelFa: "کهنه‌کار", labelEn: "Veteran", hair: "#7a7a7a", hairStyle: "wavy", beard: "none", top: "#e08a3c", skin: "#eebf9a" },
  { id: 9, gender: "female", labelFa: "پیشکسوت", labelEn: "Master", hair: "#c2c2c2", hairStyle: "shortF", beard: "none", top: "#4a90d9", skin: "#c07d4f" },
];

export const SKIN_TONES = [
  "#f4d0ad",
  "#e8b489",
  "#d99a6c",
  "#c07d4f",
  "#9c5f38",
  "#6f4326",
];

export function avatarPreset(id: number): AvatarPreset {
  return USER_AVATARS[Math.max(0, Math.min(USER_AVATARS.length - 1, id))] ?? USER_AVATARS[0];
}
