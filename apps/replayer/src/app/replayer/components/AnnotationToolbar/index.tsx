"use client";

import { FC } from "react";
import type { AnnotationColor } from "../../types/annotation";
import {
  ANNOTATION_COLOR_LIST,
  ANNOTATION_COLOR_HEX,
  getAnnotationBorderColor,
} from "../../types/annotation";
import styles from "./style.module.scss";

interface Props {
  currentColor: AnnotationColor;
  onColorClick: (c: AnnotationColor) => void;
}

const AnnotationToolbar: FC<Props> = ({ currentColor, onColorClick }) => {
  return (
    <div className={styles.toolbar}>
      {ANNOTATION_COLOR_LIST.map((c) => {
        const isSelected = c === currentColor;
        return (
          <button
            key={c}
            type="button"
            className={`${styles.colorDot} ${isSelected ? styles.selected : ""}`}
            style={{
              backgroundColor: ANNOTATION_COLOR_HEX[c],
              borderColor: getAnnotationBorderColor(c),
            }}
            onClick={() => onColorClick(c)}
            aria-label={`Select ${c}`}
            aria-pressed={isSelected}
          />
        );
      })}
      <span className={styles.hint}>点击画面任意位置标注</span>
    </div>
  );
};

export default AnnotationToolbar;
