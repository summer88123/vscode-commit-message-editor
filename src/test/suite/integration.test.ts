import * as assert from 'assert';
import * as vscode from 'vscode';
import { TestDynamicOptionsProvider } from './TestDynamicOptionsProvider';

suite('Dynamic Enum Provider Integration Tests', () => {
  let testProvider: TestDynamicOptionsProvider;
  let disposable: vscode.Disposable | undefined;

  setup(() => {
    testProvider = new TestDynamicOptionsProvider();
  });

  teardown(() => {
    if (disposable) {
      disposable.dispose();
      disposable = undefined;
    }
  });

  test('should register provider through extension API', async () => {
    // 获取扩展
    const extension = vscode.extensions.getExtension(
      'adam-bender.commit-message-editor'
    );
    assert.ok(extension, 'Extension should be available');

    // 激活扩展
    const api = await extension.activate();
    assert.ok(api, 'Extension API should be available');
    assert.ok(
      typeof api.registerDynamicOptionsProvider === 'function',
      'registerDynamicOptionsProvider should be a function'
    );

    // 注册提供者
    disposable = api.registerDynamicOptionsProvider('test-provider', testProvider);
    assert.ok(disposable, 'Should return a disposable');
  });

  test('should be able to provide options', async () => {
    const context = {
      repositoryPath: '/test/repo',
      tokenValues: {},
    };

    const options = await testProvider.provideOptions(context);

    assert.strictEqual(options.length, 3, 'Should return 3 options');
    assert.strictEqual(options[0].value, 'test1');
    assert.strictEqual(options[1].value, 'test2');
    assert.strictEqual(options[2].value, 'test3');

    // 验证描述包含仓库路径
    assert.ok(
      options[0].description?.includes('/test/repo'),
      'Description should include repository path'
    );
  });

  test('should respect cancellation token', async () => {
    const cancellationTokenSource = new vscode.CancellationTokenSource();
    cancellationTokenSource.cancel();

    const context = {
      repositoryPath: '/test/repo',
      tokenValues: {},
      cancellationToken: cancellationTokenSource.token,
    };

    const options = await testProvider.provideOptions(context);

    assert.strictEqual(
      options.length,
      0,
      'Should return empty array when cancelled'
    );
  });

  test('should dispose provider correctly', async () => {
    const extension = vscode.extensions.getExtension(
      'adam-bender.commit-message-editor'
    );
    assert.ok(extension);

    const api = await extension.activate();
    disposable = api.registerDynamicOptionsProvider('test-provider', testProvider);

    // Dispose 应该正常工作
    assert.ok(disposable);
    disposable.dispose();
    disposable = undefined;

    // 可以再次注册
    disposable = api.registerDynamicOptionsProvider('test-provider-2', testProvider);
    assert.ok(disposable, 'Should be able to register again after dispose');
  });
});
