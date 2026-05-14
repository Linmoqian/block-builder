import React from 'react';
import { YoloModuleType } from '../types';
import { YOLO_TEMPLATES } from '../config/yoloBlocks';

interface YoloBlockProps {
  type: string;
  color: string;
  size?: number;
  params?: Record<string, any>;
  repeats?: number;
}

export const YoloBlock = React.memo<YoloBlockProps>(({ type, color, size = 64, params, repeats }) => {
  const template = YOLO_TEMPLATES.find(t => t.type === type);

  // Build a short summary of key params
  const paramSummary = template ? buildParamSummary(type, params, template.argNames) : '';

  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl font-bold text-white shadow-md relative"
      style={{
        backgroundColor: color,
        width: size * 1.6,
        height: size,
        minWidth: 90,
      }}
    >
      {/* Module name */}
      <span className="text-xs font-bold tracking-wide pointer-events-none" style={{ userSelect: 'none' }}>
        {template?.label || type}
      </span>

      {/* Parameter summary */}
      {paramSummary && (
        <span className="text-[9px] opacity-80 mt-0.5 pointer-events-none font-mono" style={{ userSelect: 'none' }}>
          {paramSummary}
        </span>
      )}

      {/* Repeat badge */}
      {repeats && repeats > 1 && (
        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm">
          <span className="text-[9px] font-bold" style={{ color }}>×{repeats}</span>
        </div>
      )}

      {/* Category indicator strip */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1 rounded-b-xl opacity-50"
        style={{
          backgroundColor: categoryColor(template?.category),
        }}
      />

      {/* Input port dot (left) */}
      <div className="absolute left-0 top-1/2 -mt-1.5 -ml-1.5 w-3 h-3 bg-white rounded-full border-2 shadow-sm"
        style={{ borderColor: color }} />
      {/* Output port dot (right) */}
      <div className="absolute right-0 top-1/2 -mt-1.5 -mr-1.5 w-3 h-3 bg-white rounded-full border-2 shadow-sm"
        style={{ borderColor: color }} />
    </div>
  );
});

function categoryColor(cat?: string): string {
  switch (cat) {
    case 'conv': return '#93c5fd';
    case 'block': return '#86efac';
    case 'neck': return '#67e8f9';
    case 'head': return '#fca5a5';
    default: return '#d1d5db';
  }
}

function buildParamSummary(type: string, params: Record<string, any> | undefined, argNames: string[]): string {
  if (!params) return '';

  switch (type) {
    case 'Conv':
    case 'DWConv':
    case 'GhostConv':
    case 'RepConv':
      return `${params.c2 ?? '?'}, k${params.k ?? '?'}`;
    case 'Bottleneck':
      return `${params.c2 ?? '?'}${params.shortcut ? ' +sc' : ''}`;
    case 'C2f':
      return `${params.c2 ?? '?'}, n=${params.n ?? 1}`;
    case 'C3k2':
      return `${params.c2 ?? '?'}${params.c3k ? ' k' : ''}, e=${params.e ?? '?'}`;
    case 'SPPF':
      return `${params.c2 ?? '?'}, k${params.k ?? 5}`;
    case 'PSA':
    case 'C2PSA':
      return `${params.c2 ?? '?'}${params.n ? `, n=${params.n}` : ''}`;
    case 'Concat':
      return `d=${params.d ?? 1}`;
    case 'nn.Upsample':
      return `${params.scale_factor ?? 2}×`;
    case 'Detect':
    case 'Segment':
      return `nc=${params.nc ?? 80}`;
    default:
      return argNames.map(n => `${n}=${params[n] ?? '?'}`).join(' ');
  }
}
