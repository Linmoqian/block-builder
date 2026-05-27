/** Tensor shape: [C, H, W] for 2D, [C] for 1D */
export type TensorShape = [number, number, number] | [number, number] | [number];

/** Parameter value types */
export type ParamValue = number | string | boolean | number[] | string[];

/** Module parameter definition (from registry) */
export interface ParamDef {
  type: 'int' | 'float' | 'string' | 'bool' | 'select';
  default: ParamValue;
  min?: number;
  max?: number;
  options?: string[];
  label: string;
  description?: string;
}

/** Port definition on a module */
export interface PortDef {
  id: string;
  label: string;
  required: boolean;
}

/** Module category */
export type ModuleCategory = 'input' | 'basic' | 'composite' | 'attention' | 'head' | 'connector';

/** Module definition in the registry */
export interface ModuleDefinition {
  type: string;
  label: string;
  category: ModuleCategory;
  color: string;
  params: Record<string, ParamDef>;
  inputs: PortDef[];
  outputs: PortDef[];
  inferShape: (inputShapes: TensorShape[], params: Record<string, ParamValue>) => TensorShape[];
}

/** A node instance on the canvas */
export interface GraphNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  params: Record<string, ParamValue>;
}

/** An edge connecting two nodes */
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle: string;
  targetHandle: string;
}

/** The complete graph intermediate representation */
export interface GraphIR {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata?: {
    name: string;
    version: string;
    inputShape: TensorShape;
  };
}

/** Shape inference result for a node */
export interface InferredShape {
  nodeId: string;
  outputShapes: TensorShape[];
  hasError: boolean;
  errorMessage?: string;
}

/** Graph validation error */
export interface ValidationError {
  type: 'cycle' | 'missing_input' | 'shape_mismatch' | 'disconnected' | 'dimension_mismatch';
  nodeId?: string;
  edgeId?: string;
  message: string;
  suggestion?: string;
}
