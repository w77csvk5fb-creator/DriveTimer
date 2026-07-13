import type { SafetyRating } from "@/domain/entities/safetyRating";

export interface SafetyRatingPresentation {
  readonly emoji: string;
  readonly label: string;
  readonly textClass: string;
}

const SAFETY_RATING_PRESENTATIONS: Record<SafetyRating, SafetyRatingPresentation> = {
  perfect: { emoji: "🟢", label: "Perfect", textClass: "text-accent-safe" },
  good: { emoji: "🟡", label: "Good", textClass: "text-accent-caution" },
  close: { emoji: "🟠", label: "Close", textClass: "text-accent-warning" },
  critical: { emoji: "🔴", label: "Critical", textClass: "text-accent-urgent" },
};

export function getSafetyRatingPresentation(rating: SafetyRating): SafetyRatingPresentation {
  return SAFETY_RATING_PRESENTATIONS[rating];
}
