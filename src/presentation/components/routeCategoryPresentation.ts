import type { RouteCategory } from "@/domain/entities/routeCategory";

export interface RouteCategoryPresentation {
  readonly emoji: string;
  readonly labelJa: string;
}

const ROUTE_CATEGORY_PRESENTATIONS: Record<RouteCategory, RouteCategoryPresentation> = {
  scenic: { emoji: "🏞️", labelJa: "景色が良い" },
  coastal: { emoji: "🌊", labelJa: "海沿い" },
  mountain: { emoji: "⛰️", labelJa: "山道" },
  nightView: { emoji: "🌃", labelJa: "夜景" },
  winding: { emoji: "🌀", labelJa: "ワインディング" },
  urban: { emoji: "🏙️", labelJa: "街中" },
};

export function getRouteCategoryPresentation(category: RouteCategory): RouteCategoryPresentation {
  return ROUTE_CATEGORY_PRESENTATIONS[category];
}
