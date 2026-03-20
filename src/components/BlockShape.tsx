import React from 'react';
import { ShapeType } from '../types';

interface BlockShapeProps {
  type: ShapeType;
  color: string;
  size?: number;
  className?: string;
}

export const BlockShape: React.FC<BlockShapeProps> = ({ type, color, size = 64, className = "" }) => {
  const style = { backgroundColor: color };

  switch (type) {
    case 'square':
      return <div className={`rounded-sm ${className}`} style={{ ...style, width: size, height: size }} />;
    case 'rect-h':
      return <div className={`rounded-sm ${className}`} style={{ ...style, width: size * 1.5, height: size * 0.75 }} />;
    case 'rect-v':
      return <div className={`rounded-sm ${className}`} style={{ ...style, width: size * 0.75, height: size * 1.5 }} />;
    case 'circle':
      return <div className={`rounded-full ${className}`} style={{ ...style, width: size, height: size }} />;
    case 'triangle':
      return (
        <div 
          className={className}
          style={{ 
            width: size, 
            height: size, 
            backgroundColor: color,
            clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' 
          }} 
        />
      );
    case 'l-shape':
      return (
        <div className={`relative ${className}`} style={{ width: size, height: size }}>
          <div style={{ ...style, position: 'absolute', bottom: 0, left: 0, width: size, height: size / 2 }} />
          <div style={{ ...style, position: 'absolute', top: 0, left: 0, width: size / 2, height: size }} />
        </div>
      );
    case 't-shape':
      return (
        <div className={`relative ${className}`} style={{ width: size, height: size }}>
          <div style={{ ...style, position: 'absolute', top: 0, left: 0, width: size, height: size / 2 }} />
          <div style={{ ...style, position: 'absolute', top: 0, left: size / 4, width: size / 2, height: size }} />
        </div>
      );
    default:
      return null;
  }
};
