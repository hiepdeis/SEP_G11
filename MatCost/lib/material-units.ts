export const MATERIAL_UNIT_OPTIONS = [
  { value: "kg", label: "kg" },
  { value: "tấn", label: "tấn" },
  { value: "m", label: "m" },
  { value: "m²", label: "m²" },
  { value: "m³", label: "m³" },
  { value: "cây", label: "cây" },
  { value: "cái", label: "cái" },
  { value: "viên", label: "viên" },
  { value: "tấm", label: "tấm" },
  { value: "bao", label: "bao" },
  { value: "cuộn", label: "cuộn" },
  { value: "bộ", label: "bộ" },
  { value: "thùng", label: "thùng" },
  { value: "lít", label: "lít" },
  { value: "ống", label: "ống" },
  { value: "thanh", label: "thanh" },
] as const;

export type MaterialUnitValue = (typeof MATERIAL_UNIT_OPTIONS)[number]["value"];

const FRACTIONAL_QUANTITY_UNITS = new Set<MaterialUnitValue>([
  "kg",
  "tấn",
  "m",
  "m²",
  "m³",
  "lít",
]);

const MATERIAL_UNIT_ALIASES = new Map<string, MaterialUnitValue>([
  ["kg", "kg"],
  ["kilogram", "kg"],
  ["tấn", "tấn"],
  ["tan", "tấn"],
  ["m", "m"],
  ["met", "m"],
  ["mét", "m"],
  ["m2", "m²"],
  ["m^2", "m²"],
  ["m²", "m²"],
  ["m3", "m³"],
  ["m^3", "m³"],
  ["m³", "m³"],
  ["cây", "cây"],
  ["cay", "cây"],
  ["cái", "cái"],
  ["cai", "cái"],
  ["viên", "viên"],
  ["vien", "viên"],
  ["tấm", "tấm"],
  ["tam", "tấm"],
  ["bao", "bao"],
  ["cuộn", "cuộn"],
  ["cuon", "cuộn"],
  ["bộ", "bộ"],
  ["bo", "bộ"],
  ["thùng", "thùng"],
  ["thung", "thùng"],
  ["lít", "lít"],
  ["lit", "lít"],
  ["ống", "ống"],
  ["ong", "ống"],
  ["thanh", "thanh"],
]);

export function canonicalizeMaterialUnit(unit: string): MaterialUnitValue | null {
  const normalized = unit.trim().toLowerCase();
  return MATERIAL_UNIT_ALIASES.get(normalized) ?? null;
}

export function allowsFractionalMaterialQuantity(unit: string): boolean {
  const normalized = canonicalizeMaterialUnit(unit);
  return normalized ? FRACTIONAL_QUANTITY_UNITS.has(normalized) : false;
}

export function requiresWholeMaterialQuantity(unit: string): boolean {
  const normalized = canonicalizeMaterialUnit(unit);
  return normalized ? !FRACTIONAL_QUANTITY_UNITS.has(normalized) : false;
}

export function getMaterialQuantityRuleText(unit: string): string | null {
  const normalized = canonicalizeMaterialUnit(unit);
  if (!normalized) {
    return null;
  }

  return requiresWholeMaterialQuantity(normalized)
    ? `Đơn vị ${normalized} chỉ chấp nhận số nguyên.`
    : `Đơn vị ${normalized} cho phép số lẻ.`;
}

export function getMaterialUnitLabel(unit: string): string {
  return canonicalizeMaterialUnit(unit) ?? unit.trim();
}
