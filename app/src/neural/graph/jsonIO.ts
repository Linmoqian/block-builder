import { GraphIR } from './types';

export function exportGraphIR(graph: GraphIR): string {
  return JSON.stringify(graph, null, 2);
}

export function importGraphIR(json: string): GraphIR {
  const parsed = JSON.parse(json);
  if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
    throw new Error('Invalid graph: missing nodes array');
  }
  if (!parsed.edges || !Array.isArray(parsed.edges)) {
    throw new Error('Invalid graph: missing edges array');
  }
  return parsed as GraphIR;
}

export function downloadJson(graph: GraphIR, filename = 'network-graph.json') {
  const json = exportGraphIR(graph);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function uploadJson(): Promise<GraphIR> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return reject(new Error('No file selected'));
      try {
        const text = await file.text();
        resolve(importGraphIR(text));
      } catch (e) {
        reject(e);
      }
    };
    input.oncancel = () => reject(new Error('Cancelled'));
    // Also handle focus return without selection (some browsers)
    const onFocus = () => {
      setTimeout(() => {
        if (!input.files?.length) reject(new Error('Cancelled'));
      }, 500);
      window.removeEventListener('focus', onFocus);
    };
    window.addEventListener('focus', onFocus);
    input.click();
  });
}
