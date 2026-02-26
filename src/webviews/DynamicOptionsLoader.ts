import * as vscode from 'vscode';
import { DynamicOptionsProviderRegistry } from '../providers/DynamicOptionsProviderRegistry';
import { DynamicOptionsContext } from '../providers/DynamicOptionsProvider';

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
      const cancellationTokenSource = new vscode.CancellationTokenSource();

      const timeoutHandle = setTimeout(() => {
        cancellationTokenSource.cancel();
      }, timeout);

      const options = await provider.provideOptions({
        ...context,
        cancellationToken: cancellationTokenSource.token,
      });

      clearTimeout(timeoutHandle);
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
