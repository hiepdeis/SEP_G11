export const formatPascalCase = (text: string | null | undefined): string => {
  if (!text) return "Unknown";
  return text.replace(/([a-z0-9])([A-Z])|([A-Z])([A-Z][a-z])/g, '$1$3 $2$4')
};
