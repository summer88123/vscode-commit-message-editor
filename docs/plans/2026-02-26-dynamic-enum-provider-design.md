# 动态 Enum Provider 设计文档

**日期**: 2026-02-26  
**状态**: 已批准  
**作者**: AI Assistant

## 概述

为 VSCode Commit Message Editor 扩展添加动态获取 enum token options 的能力。通过可扩展的 Provider 注册系统，允许用户从外部 API、Git 信息、文件系统等任意数据源动态加载选项。

## 设计目标

- ✅ 保持现有静态 token 配置的向后兼容性
- ✅ 提供灵活可扩展的 Provider 架构
- ✅ 支持延迟加载以优化性能
- ✅ 实现会话级缓存机制
- ✅ 提供完善的错误处理和用户反馈
- ✅ 允许用户在加载失败时手动输入（fallback）

## 核心架构

### 方案选择

从以下三个方案中选择了**方案一：Provider 注册系统**：

1. **Provider 注册系统**（已选择）- 高度灵活，符合 VSCode 生态习惯
2. 内置 HTTP Provider + 自定义 Provider - 降低门槛但增加复杂度
3. 纯配置驱动的 HTTP 方案 - 简单但灵活性受限

**选择理由**：
- 符合 VSCode 扩展生态的设计模式（类似 CompletionProvider）
- 最大化灵活性，支持任意复杂的业务逻辑
- 更好的安全性（敏感信息不暴露在配置文件中）
- 可独立测试和版本控制

## 详细设计

### 1. 类型定义

#### Provider 接口

```typescript
// src/providers/DynamicOptionsProvider.ts

export interface DynamicOptionItem {
  label: string;
  value?: string;
  description?: string;
}

export interface DynamicOptionsProvider {
  /**
   * 提供选项数据
   * @param context 上下文信息，包含当前仓库信息、其他 token 值等
   * @returns 返回选项数组或 Promise
   */
  provideOptions(context: DynamicOptionsContext): 
    DynamicOptionItem[] | Promise<DynamicOptionItem[]>;
}

export interface DynamicOptionsContext {
  /** 当前 Git 仓库路径 */
  repositoryPath?: string;
  /** 其他 token 的当前值，支持联动 */
  tokenValues: Record<string, string>;
  /** 取消令牌，用于处理长时间请求 */
  cancellationToken?: vscode.CancellationToken;
}
```

#### Token 类型扩展

```typescript
// frontend/src/global.d.ts

type TokenType = 'text' | 'boolean' | 'enum' | 'dynamic-enum';

interface Token {
  // ... 现有字段保持不变
  
  // 用于 dynamic-enum 类型
  provider?: string;  // provider ID，如 'my-extension.jira-issues'
  
  // enum 类型的静态 options（兼容现有配置）
  options?: EnumTokenOption[];
}
```

### 2. Provider 注册机制

```typescript
// src/utils/DynamicOptionsProviderRegistry.ts

export class DynamicOptionsProviderRegistry {
  private static _providers = new Map<string, DynamicOptionsProvider>();

  static register(id: string, provider: DynamicOptionsProvider): void {
    this._providers.set(id, provider);
  }

  static getProvider(id: string): DynamicOptionsProvider | undefined {
    return this._providers.get(id);
  }

  static unregister(id: string): void {
    this._providers.delete(id);
  }
}
```

### 3. 前端状态管理

#### Redux State 扩展

```typescript
// frontend/src/store/state.ts

interface DynamicEnumState {
  [tokenName: string]: {
    loading: boolean;
    error?: string;
    options: EnumTokenOption[];
    lastLoadedAt?: number;  // 用于会话级缓存
  };
}

interface RootState {
  // ... 现有状态
  dynamicEnums: DynamicEnumState;
}
```

#### 渲染逻辑

```typescript
// frontend/src/components/cme-form-view/FormBuilder.ts

private _renderDynamicEnumWidget(token: Token): TemplateResult {
  const state = this._getDynamicEnumState(token.name);
  
  if (state.loading) {
    // 显示加载状态
    return html`
      <vscode-progress-ring></vscode-progress-ring>
      <span>正在加载选项...</span>
    `;
  }
  
  if (state.error) {
    // 显示错误 + 允许手动输入（fallback）
    return html`
      <div class="error-message">${state.error}</div>
      <vscode-text-field 
        placeholder="手动输入或重试"
        value="${token.value || ''}"
        @input="${(e: Event) => this._handleManualInput(token, e)}">
      </vscode-text-field>
      <vscode-button @click="${() => this._retryLoad(token)}">
        重试
      </vscode-button>
    `;
  }
  
  // 渲染选项列表（与静态 enum 一致）
  return this._renderEnumTypeWidget(token, state.options);
}
```

### 4. 后端消息处理

```typescript
// src/webviews/EditorPanel.ts

private async _loadDynamicOptions(data: any): Promise<void> {
  const { tokenName, providerId, context } = data;
  
  const provider = DynamicOptionsProviderRegistry.getProvider(providerId);
  
  if (!provider) {
    this._sendToWebview({
      command: 'dynamicOptionsLoaded',
      data: {
        tokenName,
        error: `Provider "${providerId}" 未找到，请确保相关扩展已安装并激活`
      }
    });
    return;
  }
  
  try {
    // 创建取消令牌（超时 30 秒）
    const cancellationTokenSource = new vscode.CancellationTokenSource();
    const timeout = setTimeout(() => {
      cancellationTokenSource.cancel();
    }, 30000);
    
    // 调用 provider
    const options = await provider.provideOptions({
      ...context,
      cancellationToken: cancellationTokenSource.token
    });
    
    clearTimeout(timeout);
    cancellationTokenSource.dispose();
    
    // 发送结果到前端
    this._sendToWebview({
      command: 'dynamicOptionsLoaded',
      data: { tokenName, options }
    });
    
  } catch (error: any) {
    this._sendToWebview({
      command: 'dynamicOptionsLoaded',
      data: {
        tokenName,
        error: error.message || '加载选项失败'
      }
    });
  }
}
```

### 5. 缓存机制

实现会话级缓存，在编辑器会话期间保留已加载的数据：

```typescript
// frontend/src/utils/DynamicOptionsCache.ts

export class DynamicOptionsCache {
  private static _cache = new Map<string, CachedOptions>();
  
  static set(tokenName: string, options: EnumTokenOption[]): void {
    this._cache.set(tokenName, {
      options,
      loadedAt: Date.now()
    });
  }
  
  static get(tokenName: string): EnumTokenOption[] | null {
    return this._cache.get(tokenName)?.options || null;
  }
  
  static clear(): void {
    this._cache.clear();
  }
}
```

### 6. API 导出

```typescript
// src/extension.ts

export function activate(context: vscode.ExtensionContext) {
  // ... 现有激活逻辑
  
  // 返回公共 API
  return {
    registerDynamicOptionsProvider(
      id: string, 
      provider: DynamicOptionsProvider
    ): vscode.Disposable {
      DynamicOptionsProviderRegistry.register(id, provider);
      
      return new vscode.Disposable(() => {
        DynamicOptionsProviderRegistry.unregister(id);
      });
    }
  };
}

// 导出类型定义
export { 
  DynamicOptionsProvider, 
  DynamicOptionsContext, 
  DynamicOptionItem 
} from './providers/DynamicOptionsProvider';
```

## 使用示例

### 示例 1：从 Jira API 获取 Issues

```typescript
// 用户扩展代码
import * as vscode from 'vscode';
import type { DynamicOptionsProvider, DynamicOptionsContext } from 'vscode-commit-message-editor';

export class JiraIssuesProvider implements DynamicOptionsProvider {
  async provideOptions(context: DynamicOptionsContext) {
    const config = vscode.workspace.getConfiguration('myExtension.jira');
    const jiraUrl = config.get<string>('url');
    const apiToken = config.get<string>('apiToken');
    
    const response = await fetch(
      `${jiraUrl}/rest/api/3/search?jql=project=PROJ&maxResults=50`,
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(apiToken).toString('base64')}`,
        }
      }
    );
    
    const data = await response.json();
    
    return data.issues.map((issue: any) => ({
      label: `${issue.key}: ${issue.fields.summary}`,
      value: issue.key,
      description: `${issue.fields.issuetype.name} - ${issue.fields.status.name}`
    }));
  }
}

// 注册
export function activate(context: vscode.ExtensionContext) {
  const cmeApi = vscode.extensions.getExtension('bendera.commit-message-editor')?.exports;
  
  if (cmeApi) {
    cmeApi.registerDynamicOptionsProvider(
      'my-company.jira-issues',
      new JiraIssuesProvider()
    );
  }
}
```

### 示例 2：从 Git 分支名提取信息

```typescript
export class BranchIssueProvider implements DynamicOptionsProvider {
  async provideOptions(context: DynamicOptionsContext) {
    if (!context.repositoryPath) return [];
    
    const git = require('simple-git')(context.repositoryPath);
    const branch = await git.branchLocal();
    const currentBranch = branch.current;
    
    const match = currentBranch.match(/([A-Z]+-\d+)/);
    
    if (match) {
      return [{
        label: match[1],
        value: match[1],
        description: `从分支 ${currentBranch} 提取`
      }];
    }
    
    return [];
  }
}
```

### 配置使用

```json
{
  "commit-message-editor.tokens": [
    {
      "label": "Related Issue",
      "name": "issue",
      "type": "dynamic-enum",
      "provider": "my-company.jira-issues",
      "description": "选择关联的 Jira Issue"
    }
  ]
}
```

## 错误处理策略

### 错误场景

1. **Provider 未找到**
   - 显示：`Provider "xxx" 未找到，请确保相关扩展已安装并激活`
   - 降级为文本输入框

2. **加载超时（30秒）**
   - 自动取消请求
   - 显示错误 + 重试按钮

3. **Provider 抛出异常**
   - 捕获并显示错误消息
   - 允许手动输入

4. **网络错误**
   - Provider 内部处理
   - 返回空数组或抛出异常

### Fallback 机制

当加载失败时，自动切换到文本输入模式，允许用户手动输入值，确保编辑器始终可用。

## 性能优化

### 延迟加载

- 用户点击下拉框时才触发加载
- 避免在编辑器启动时加载所有动态数据

### 会话级缓存

- 首次加载后缓存结果
- 编辑器会话期间重复使用
- 下次打开编辑器时重新加载

### 超时控制

- 默认 30 秒超时
- 支持 CancellationToken 取消长时间请求

## 用户体验

### 加载状态

- 显示 progress ring 和"正在加载选项..."文本
- 提供视觉反馈

### 错误反馈

- 清晰的错误消息
- 提供重试按钮
- 自动降级为手动输入

### 键盘支持

- 继承现有 enum 的 combobox 搜索功能
- 支持键盘导航

## 向后兼容性

- 现有静态 `enum` 类型配置完全不受影响
- 新增 `dynamic-enum` 类型，避免混淆
- 如果 `provider` 字段为空或未定义，行为与静态 enum 一致

## 安全考虑

- Provider 代码在扩展沙箱中运行
- 敏感信息（API token）通过代码管理，不暴露在配置文件中
- 支持从环境变量读取凭证
- 建议使用 VSCode SecretStorage API 存储敏感信息

## 测试策略

### 单元测试

- Provider 注册和获取
- 缓存机制
- 错误处理逻辑

### 集成测试

- 完整的加载流程（前端 → 后端 → Provider → 前端）
- 超时和取消机制
- Fallback 机制

### E2E 测试

- 模拟真实 Provider 实现
- 测试用户交互流程
- 测试错误场景的用户体验

## 实施计划

将在独立的实施计划文档中详细说明（通过 writing-plans skill 生成）。

## 未来扩展可能性

1. **内置常用 Provider**
   - GitHub Issues Provider
   - GitLab Issues Provider
   - 通用 HTTP Provider

2. **Provider 配置选项**
   - 自定义超时时间
   - 重试策略
   - 缓存策略（持久化、TTL）

3. **Provider 依赖链**
   - 支持一个 token 的 provider 依赖另一个 token 的值
   - 实现级联选择

4. **Provider Marketplace**
   - 社区共享 Provider 实现
   - 一键安装常用 Provider

## 总结

本设计通过 Provider 注册系统为 VSCode Commit Message Editor 提供了灵活、可扩展的动态 enum 支持。设计遵循 VSCode 生态的最佳实践，提供了完善的错误处理和用户体验，同时保持了向后兼容性和系统的简洁性。
