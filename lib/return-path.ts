export function getSafeReturnPath(formData: FormData, fallback: string) {
  const value = formData.get("return_path");

  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();

  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }

  return trimmed;
}
