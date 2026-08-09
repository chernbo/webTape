export type AnnotationColor = "red" | "yellow" | "green" | "blue" | "white";

export const ANNOTATION_COLOR_LIST: AnnotationColor[] = [
  "red",
  "yellow",
  "green",
  "blue",
  "white",
];

export const ANNOTATION_COLOR_HEX: Record<AnnotationColor, string> = {
  red: "#f5222d",
  yellow: "#fadb14",
  green: "#52c41a",
  blue: "#1677ff",
  white: "#ffffff",
};

/** Text color that reads on top of the given annotation color */
export const getAnnotationTextColor = (c: AnnotationColor): string =>
  c === "yellow" || c === "white" ? "#1e1e1e" : "#ffffff";

/** Border color for white pins so they remain visible on light backgrounds */
export const getAnnotationBorderColor = (c: AnnotationColor): string =>
  c === "white" ? "#999999" : ANNOTATION_COLOR_HEX[c];

export interface Annotation {
  id: string;
  index: number;
  timestamp: number;
  x: number; // relative 0-1
  y: number; // relative 0-1
  comment: string;
  color: AnnotationColor;
  createdAt: number;
}
