import { describe, it, expect } from 'vitest';
import { MODULE_REGISTRY } from '../registry';

describe('MODULE_REGISTRY', () => {
  it('应包含 15 个模块', () => {
    const all = MODULE_REGISTRY.getAll();
    expect(Object.keys(all).length).toBe(15);
  });

  it('get() 应返回正确的 ModuleDefinition', () => {
    const conv = MODULE_REGISTRY.get('Conv');
    expect(conv).toBeDefined();
    expect(conv!.type).toBe('Conv');
    expect(conv!.category).toBe('basic');
    expect(conv!.inputs).toHaveLength(1);
    expect(conv!.outputs).toHaveLength(1);
    expect(conv!.params.out_channels).toBeDefined();
    expect(conv!.params.kernel_size).toBeDefined();
    expect(conv!.params.stride).toBeDefined();
  });

  it('get() 对不存在的类型应返回 undefined', () => {
    expect(MODULE_REGISTRY.get('NonExistent')).toBeUndefined();
    expect(MODULE_REGISTRY.get('')).toBeUndefined();
  });

  it('getByCategory 应正确分组', () => {
    const basic = MODULE_REGISTRY.getByCategory('basic');
    expect(basic.length).toBeGreaterThan(0);
    expect(basic.every((m) => m.category === 'basic')).toBe(true);

    const input = MODULE_REGISTRY.getByCategory('input');
    expect(input).toHaveLength(1);
    expect(input[0].type).toBe('Input');

    const attention = MODULE_REGISTRY.getByCategory('attention');
    expect(attention.length).toBeGreaterThanOrEqual(2); // CBAM, CA, SimAM

    const head = MODULE_REGISTRY.getByCategory('head');
    expect(head).toHaveLength(1);
    expect(head[0].type).toBe('Detect');

    const composite = MODULE_REGISTRY.getByCategory('composite');
    expect(composite.length).toBeGreaterThanOrEqual(2); // C2f, SPPF

    const connector = MODULE_REGISTRY.getByCategory('connector');
    expect(connector).toHaveLength(1);
    expect(connector[0].type).toBe('Concat');
  });
});
