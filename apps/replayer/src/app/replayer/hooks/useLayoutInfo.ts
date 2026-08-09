import React, { useEffect, useState } from "react";

const useLayoutInfo = () => {
  const observeRef = React.useRef<HTMLDivElement>(null);
  const [observeRect, setObserveRect] = useState<DOMRect>(new DOMRect());

  useEffect(() => {
    const el = observeRef.current;
    if (!el) return;

    const ro = new ResizeObserver(([entry]) => {
      setObserveRect(entry.contentRect);
    });

    // 开始观察
    ro.observe(el);

    // 初次也测一次，避免 0 值
    setObserveRect(el.getBoundingClientRect());

    // 停止观察
    return () => ro.disconnect();
  }, []);

  return {
    observeRef,
    observeRect,
  };
};

export default useLayoutInfo;
