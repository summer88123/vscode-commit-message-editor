import * as vscode from 'vscode';
import { DynamicOptionsContext } from '../providers/DynamicOptionsProvider';
import { DynamicOptionsProviderRegistry } from '../providers/DynamicOptionsProviderRegistry';

export interface LoadDynamicOptionsRequest {
  tokenName: string;
  providerId: string;
  context: DynamicOptionsContext;
}

export interface LoadDynamicOptionsResponse {
  tokenName: string;
  options?: Array<{ label: string; value?: string; description?: string }>;
  error?: string;
}

export class DynamicOptionsLoader {
  static async load(
    request: LoadDynamicOptionsRequest,
    timeout: number = 30000
  ): Promise<LoadDynamicOptionsResponse> {
    const { tokenName, providerId, context } = request;

    const provider = DynamicOptionsProviderRegistry.getProvider(providerId);

    if (!provider) {
      return {
        tokenName,
        error: `Provider "${providerId}" 未找到，请确保相关扩展已安装并激活`,
      };
    }

    try {
      // 创建超时 Promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`加载选项超时（${timeout}ms）`));
        }, timeout);
      });

      // 创建 cancellation token 供 provider 使用（可选）
      const cancellationTokenSource = new vscode.CancellationTokenSource();

      // 创建加载 Promise
      const loadPromise = provider.provideOptions({
        ...context,
        cancellationToken: cancellationTokenSource.token,
      });

      // 使用 Promise.race 实现硬超时控制
      const options = await Promise.race([loadPromise, timeoutPromise]);

      // 清理资源
      cancellationTokenSource.dispose();

      return {
        tokenName,
        options,
      };
    } catch (error: any) {
      return {
        tokenName,
        error: error.message || '加载选项失败',
      };
    }
  }
}
