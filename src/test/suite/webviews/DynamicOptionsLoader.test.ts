import * as assert from 'assert';
import { DynamicOptionsLoader } from '../../../webviews/DynamicOptionsLoader';
import { DynamicOptionsProviderRegistry } from '../../../providers/DynamicOptionsProviderRegistry';
import { DynamicOptionsProvider } from '../../../providers/DynamicOptionsProvider';

suite('DynamicOptionsLoader Test Suite', () => {
  setup(() => {
    DynamicOptionsProviderRegistry.clear();
  });

  test('should load options successfully', async () => {
    const provider: DynamicOptionsProvider = {
      provideOptions: async () => [
        { label: 'Option 1', value: 'opt1' },
        { label: 'Option 2', value: 'opt2' },
      ],
    };

    DynamicOptionsProviderRegistry.register('test.provider', provider);

    const result = await DynamicOptionsLoader.load({
      tokenName: 'testToken',
      providerId: 'test.provider',
      context: { tokenValues: {} },
    });

    assert.strictEqual(result.tokenName, 'testToken');
    assert.strictEqual(result.error, undefined);
    assert.strictEqual(result.options?.length, 2);
  });

  test('should return error when provider not found', async () => {
    const result = await DynamicOptionsLoader.load({
      tokenName: 'testToken',
      providerId: 'non.existent',
      context: { tokenValues: {} },
    });

    assert.strictEqual(result.tokenName, 'testToken');
    assert.ok(result.error);
    assert.ok(result.error!.includes('未找到'));
  });
});
