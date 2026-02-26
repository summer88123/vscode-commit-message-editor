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

  test('should timeout when provider takes too long', async () => {
    const provider: DynamicOptionsProvider = {
      provideOptions: async () => {
        // 模拟慢速 provider
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return [{ label: 'Option 1' }];
      },
    };

    DynamicOptionsProviderRegistry.register('test.slow-provider', provider);

    const result = await DynamicOptionsLoader.load(
      {
        tokenName: 'testToken',
        providerId: 'test.slow-provider',
        context: { tokenValues: {} },
      },
      100 // 设置 100ms 超时
    );

    assert.strictEqual(result.tokenName, 'testToken');
    assert.ok(result.error);
    assert.ok(result.error!.includes('超时'));
  });

  test('should handle provider throwing error', async () => {
    const provider: DynamicOptionsProvider = {
      provideOptions: async () => {
        throw new Error('Provider internal error');
      },
    };

    DynamicOptionsProviderRegistry.register('test.error-provider', provider);

    const result = await DynamicOptionsLoader.load({
      tokenName: 'testToken',
      providerId: 'test.error-provider',
      context: { tokenValues: {} },
    });

    assert.strictEqual(result.tokenName, 'testToken');
    assert.ok(result.error);
    assert.strictEqual(result.error, 'Provider internal error');
  });

  test('should complete successfully before timeout', async () => {
    const provider: DynamicOptionsProvider = {
      provideOptions: async () => {
        // 快速完成
        await new Promise((resolve) => setTimeout(resolve, 10));
        return [{ label: 'Fast Option' }];
      },
    };

    DynamicOptionsProviderRegistry.register('test.fast-provider', provider);

    const result = await DynamicOptionsLoader.load(
      {
        tokenName: 'testToken',
        providerId: 'test.fast-provider',
        context: { tokenValues: {} },
      },
      1000 // 1 秒超时，足够完成
    );

    assert.strictEqual(result.tokenName, 'testToken');
    assert.strictEqual(result.error, undefined);
    assert.strictEqual(result.options?.length, 1);
    assert.strictEqual(result.options![0].label, 'Fast Option');
  });
});
