import { BlockTemplate } from '../types';

export const NETWORK_TEMPLATES: BlockTemplate[] = [
  { type: 'Linear', label: 'Linear(128, 64)', defaultColor: '#4f46e5', isNetwork: true },
  { type: 'Conv2d', label: 'Conv2d(3, 16)', defaultColor: '#4f46e5', isNetwork: true },
  { type: 'ReLU', label: 'ReLU', defaultColor: '#ec4899', isNetwork: true },
  { type: 'Dropout', label: 'Dropout(0.5)', defaultColor: '#ec4899', isNetwork: true },
  { type: 'CrossEntropy', label: 'CrossEntropyLoss', defaultColor: '#f59e0b', isNetwork: true },
  { type: 'Adam', label: 'Adam', defaultColor: '#10b981', isNetwork: true },
  { type: 'RandomData', label: 'RandomData', defaultColor: '#8b5cf6', isNetwork: true },
];
