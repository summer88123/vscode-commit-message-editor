import * as vscode from 'vscode';
import {
  DynamicOptionsProvider,
  DynamicOptionItem,
  DynamicOptionsContext,
} from '../../providers';

/**
 * 测试用的动态选项提供者
 * 用于验证端到端流程
 */
export class TestDynamicOptionsProvider implements DynamicOptionsProvider {
  private _options: DynamicOptionItem[] = [
    { value: 'test1', label: 'Test Option 1', description: 'First test option' },
    { value: 'test2', label: 'Test Option 2', description: 'Second test option' },
    { value: 'test3', label: 'Test Option 3', description: 'Third test option' },
  ];

  public async provideOptions(
    context: DynamicOptionsContext
  ): Promise<DynamicOptionItem[]> {
    // 模拟网络延迟
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 检查取消令牌
    if (context.cancellationToken?.isCancellationRequested) {
      return [];
    }

    // 返回选项（可以根据 context 定制）
    return this._options.map((option) => ({
      ...option,
      description: `${option.description} (from ${context.repositoryPath || 'unknown'})`,
    }));
  }

  /**
   * 用于测试：设置选项
   */
  public setOptions(options: DynamicOptionItem[]): void {
    this._options = options;
  }

  /**
   * 用于测试：获取当前选项
   */
  public getOptions(): DynamicOptionItem[] {
    return [...this._options];
  }
}
