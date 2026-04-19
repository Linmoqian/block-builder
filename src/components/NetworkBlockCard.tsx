import React from 'react';
import { NetworkLayerType } from '../types';

interface NetworkBlockProps {
  type: string;
  color: string;
  size?: number;
  label?: string;
}

export const NetworkBlockCard: React.FC<NetworkBlockProps> = ({ type, color, size = 64, label }) => {
  return (
    <div 
      className="flex items-center justify-center rounded-md font-bold text-white shadow-md relative"
      style={{
        backgroundColor: color,
        width: typeof size === 'number' ? size * 1.5 : size,
        height: size,
        minWidth: 80,
      }}
    >
      <div className="absolute left-0 top-1/2 -mt-1.5 -ml-1.5 w-3 h-3 bg-white border-2 border-current rounded-full" style={{ borderColor: color }} />
      <span className="text-xs px-2 text-center pointer-events-none break-all" style={{ userSelect: 'none' }}>
        {label || type}
      </span>
      <div className="absolute right-0 top-1/2 -mt-1.5 -mr-1.5 w-3 h-3 bg-white border-2 border-current rounded-full" style={{ borderColor: color }} />
    </div>
  );
};
