import * as assert from 'assert';
import { DynamicOptionsProviderRegistry } from '../../../providers/DynamicOptionsProviderRegistry';
import { DynamicOptionsProvider } from '../../../providers/DynamicOptionsProvider';

suite('DynamicOptionsProviderRegistry Test Suite', () => {
  setup(() => {
    DynamicOptionsProviderRegistry.clear();
  });

  test('should register and retrieve provider', () => {
    const provider: DynamicOptionsProvider = {
      provideOptions: async () => [{ label: 'test' }]
    };
    
    DynamicOptionsProviderRegistry.register('test.provider', provider);
    const retrieved = DynamicOptionsProviderRegistry.getProvider('test.provider');
    
    assert.strictEqual(retrieved, provider);
  });

  test('should return undefined for non-existent provider', () => {
    const retrieved = DynamicOptionsProviderRegistry.getProvider('non.existent');
    assert.strictEqual(retrieved, undefined);
  });

  test('should unregister provider', () => {
    const provider: DynamicOptionsProvider = {
      provideOptions: async () => []
    };
    
    DynamicOptionsProviderRegistry.register('test.provider', provider);
    DynamicOptionsProviderRegistry.unregister('test.provider');
    
    const retrieved = DynamicOptionsProviderRegistry.getProvider('test.provider');
    assert.strictEqual(retrieved, undefined);
  });
});
