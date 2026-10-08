"use client";

import { useLayoutEffect, useRef, useState } from "react";

// Clamps text to `lines`; shows a toggle only when the text actually overflows.
export default function ExpandableText({
  text,
  lines = 4,
  moreLabel,
  lessLabel,
}: {
  text: string;
  lines?: number;
  moreLabel: string;
  lessLabel: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (el && !expanded) setOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [text, expanded]);

  return (
    <>
      <span
        ref={ref}
        className="block break-words"
        style={
          expanded
            ? undefined
            : { display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" }
        }
      >
        {text}
      </span>
      {(overflows || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-xs font-medium text-green-700 hover:underline dark:text-green-400"
        >
          {expanded ? lessLabel : moreLabel}
        </button>
      )}
    </>
  );
}
