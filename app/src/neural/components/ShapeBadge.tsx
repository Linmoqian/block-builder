import React from 'react';
import { TensorShape } from '../graph/types';

interface ShapeBadgeProps {
  shape: TensorShape;
  hasError?: boolean;
}

export function ShapeBadge({ shape, hasError }: ShapeBadgeProps) {
  const text = (shape as number[]).join(', ');

  if (hasError) {
    return (
      <span className="inline-block px-1.5 py-0.5 text-[9px] font-mono font-bold text-red-600 bg-red-50 rounded border border-red-200">
        [{text}]
      </span>
    );
  }

  return (
    <span className="inline-block px-1.5 py-0.5 text-[9px] font-mono text-zinc-500 bg-zinc-50 rounded border border-zinc-100">
      [{text}]
    </span>
  );
}
