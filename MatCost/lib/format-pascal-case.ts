export const formatPascalCase = (text: string | null | undefined): string => {
  if (!text) return "Unknown";
  return text.replace(/([a-z])([A-Z])/g, "$1 $2");
};
