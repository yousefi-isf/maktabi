/**
 * Persian text and digit normalization utilities for Maktabi backend.
 */

const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
const ARABIC_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

/**
 * Converts all Persian and Arabic digits in a string to standard English digits (0-9).
 */
export function toEnglishDigits(input: string): string {
  if (!input) return "";
  let result = input;
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(PERSIAN_DIGITS[i], "g"), String(i));
    result = result.replace(new RegExp(ARABIC_DIGITS[i], "g"), String(i));
  }
  return result;
}

/**
 * Normalizes Persian text:
 * - Replaces Arabic characters (ي and ك) with Persian equivalents (ی and ک).
 * - Trims and cleans multiple spaces and control characters.
 */
export function normalizePersianText(input: string): string {
  if (!input) return "";
  return input
    .replace(/\u064A/g, "ی") // Arabic Yeh -> Persian Yeh
    .replace(/\u0643/g, "ک") // Arabic Kaf -> Persian Keheh
    .replace(/\u0629/g, "ه") // Teh Marbuta -> Heh
    .replace(/\u0649/g, "ی") // Alef Maksura -> Persian Yeh
    .replace(/[\u200B\u200C\u200E\u200F\uFEFF]/g, " ") // Zero-width spaces to normal space for uniformity
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Safely parses a grade string into a number (or null if absent / ---- / not set).
 * Handles Persian decimals like "۱۷/۵۰" or "17.50" or "17,50".
 */
export function parseGradeScore(input: string | null | undefined): number | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (trimmed === "" || trimmed === "----" || trimmed === "---" || trimmed === "--" || trimmed === "-") {
    return null;
  }

  // Convert digits to English
  let normalized = toEnglishDigits(trimmed);
  // Replace Persian slash or comma with dot
  normalized = normalized.replace(/[/٫,]/g, ".");
  // Strip any non-numeric and non-dot characters
  normalized = normalized.replace(/[^0-9.]/g, "");

  if (normalized === "" || normalized === ".") return null;

  const num = parseFloat(normalized);
  return isNaN(num) ? null : num;
}

/**
 * Normalizes a national code or student ID:
 * Removes non-digits, converts to English digits, pads with leading zeros if needed.
 */
export function normalizeNationalCode(input: string): string {
  const digitsOnly = toEnglishDigits(input).replace(/\D/g, "");
  return digitsOnly.padStart(10, "0");
}

