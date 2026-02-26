# Dynamic Enum Provider API

## 概述

Dynamic Enum Provider API 允许其他 VSCode 扩展注册提供者（Provider），从外部来源（API、Git 信息、文件系统等）动态获取枚举类型的选项，而不是使用静态配置。

## 核心概念

### DynamicOptionsProvider

提供者是一个实现 `DynamicOptionsProvider` 接口的对象：

```typescript
export interface DynamicOptionsProvider {
  /**
   * 提供者的唯一标识符
   */
  readonly id: string;

  /**
   * 提供者的显示名称
   */
  readonly displayName: string;

  /**
   * 获取动态选项
   * @param context 上下文信息，包括仓库路径、token 名称等
   * @param token 可选的取消令牌
   * @returns 选项数组的 Promise
   */
  provideOptions(
    context: DynamicOptionsContext,
    token?: vscode.CancellationToken
  ): Promise<DynamicOptionItem[]>;
}
```

### DynamicOptionItem

每个选项项包含：

```typescript
export interface DynamicOptionItem {
  /**
   * 选项的唯一标识符
   */
  value: string;

  /**
   * 显示给用户的标签
   */
  label: string;

  /**
   * 可选的描述文本
   */
  description?: string;
}
```

### DynamicOptionsContext

提供者会收到以下上下文信息：

```typescript
export interface DynamicOptionsContext {
  /**
   * 当前 Git 仓库的绝对路径
   */
  repositoryPath: string;

  /**
   * token 的名称（来自配置）
   */
  tokenName: string;
}
```

## 使用示例

### 示例 1: Jira Issue Provider

从 Jira API 获取当前 Sprint 的问题：

```typescript
import * as vscode from 'vscode';

interface CommitMessageEditorAPI {
  registerDynamicOptionsProvider(
    provider: DynamicOptionsProvider
  ): vscode.Disposable;
}

export function activate(context: vscode.ExtensionContext) {
  // 获取 Commit Message Editor 的 API
  const cmeExtension = vscode.extensions.getExtension(
    'adam-bender.commit-message-editor'
  );

  if (!cmeExtension) {
    console.error('Commit Message Editor extension not found');
    return;
  }

  const cmeAPI = cmeExtension.exports as CommitMessageEditorAPI;

  // 创建 Jira Provider
  const jiraProvider: DynamicOptionsProvider = {
    id: 'jira-issues',
    displayName: 'Jira Issues',

    async provideOptions(
      context: DynamicOptionsContext,
      token?: vscode.CancellationToken
    ): Promise<DynamicOptionItem[]> {
      try {
        // 从配置中获取 Jira 设置
        const config = vscode.workspace.getConfiguration('myExtension.jira');
        const apiUrl = config.get<string>('apiUrl');
        const apiToken = config.get<string>('apiToken');
        const projectKey = config.get<string>('projectKey');

        if (!apiUrl || !apiToken || !projectKey) {
          return [];
        }

        // 检查是否已取消
        if (token?.isCancellationRequested) {
          return [];
        }

        // 调用 Jira API
        const response = await fetch(
          `${apiUrl}/rest/api/3/search?jql=project=${projectKey} AND sprint in openSprints()`,
          {
            headers: {
              Authorization: `Bearer ${apiToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Jira API error: ${response.statusText}`);
        }

        const data = await response.json();

        // 转换为选项格式
        return data.issues.map((issue: any) => ({
          value: issue.key,
          label: issue.key,
          description: issue.fields.summary,
        }));
      } catch (error) {
        console.error('Failed to fetch Jira issues:', error);
        return [];
      }
    },
  };

  // 注册提供者
  const disposable = cmeAPI.registerDynamicOptionsProvider(jiraProvider);

  // 添加到扩展的 subscriptions
  context.subscriptions.push(disposable);
}
```

### 示例 2: Git Branch Provider

从当前仓库提取分支名称中的信息：

```typescript
import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as util from 'util';

const exec = util.promisify(cp.exec);

const gitBranchProvider: DynamicOptionsProvider = {
  id: 'git-branch-info',
  displayName: 'Git Branch Info',

  async provideOptions(
    context: DynamicOptionsContext,
    token?: vscode.CancellationToken
  ): Promise<DynamicOptionItem[]> {
    try {
      // 获取当前分支名称
      const { stdout } = await exec('git branch --show-current', {
        cwd: context.repositoryPath,
      });

      const branchName = stdout.trim();

      // 检查是否已取消
      if (token?.isCancellationRequested) {
        return [];
      }

      // 从分支名称中提取信息
      // 例如: feature/JIRA-123-add-login-page -> JIRA-123
      const match = branchName.match(/([A-Z]+-\d+)/);

      if (match) {
        return [
          {
            value: match[1],
            label: match[1],
            description: `From branch: ${branchName}`,
          },
        ];
      }

      return [];
    } catch (error) {
      console.error('Failed to get branch info:', error);
      return [];
    }
  },
};
```

### 示例 3: 文件系统 Provider

从项目中的文件读取选项：

```typescript
import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';

const fileSystemProvider: DynamicOptionsProvider = {
  id: 'project-components',
  displayName: 'Project Components',

  async provideOptions(
    context: DynamicOptionsContext,
    token?: vscode.CancellationToken
  ): Promise<DynamicOptionItem[]> {
    try {
      // 读取项目中的组件列表
      const componentsPath = path.join(
        context.repositoryPath,
        'src',
        'components'
      );

      // 检查目录是否存在
      try {
        await fs.access(componentsPath);
      } catch {
        return [];
      }

      // 检查是否已取消
      if (token?.isCancellationRequested) {
        return [];
      }

      // 读取目录
      const entries = await fs.readdir(componentsPath, {
        withFileTypes: true,
      });

      // 过滤出目录
      const components = entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => ({
          value: entry.name,
          label: entry.name,
          description: `Component from src/components/`,
        }));

      return components;
    } catch (error) {
      console.error('Failed to read components:', error);
      return [];
    }
  },
};
```

## 配置 Dynamic Enum Token

在 Commit Message Editor 的配置中，使用 `dynamic-enum` 类型和 `provider` 字段：

```json
{
  "$schema": "https://bendera.github.io/vscode-commit-message-editor/schemas/config-v1.schema.json",
  "configVersion": "1",
  "staticTemplate": [
    "{type}: {emoji} {subject}",
    "",
    "{body}",
    "",
    "Issue: {issue}"
  ],
  "dynamicTemplate": [
    "{type}: {emoji} {subject}",
    "",
    "{body}",
    "",
    "Issue: {issue}"
  ],
  "tokens": [
    {
      "label": "Type",
      "name": "type",
      "type": "enum",
      "options": [
        { "label": "feat", "description": "A new feature" },
        { "label": "fix", "description": "A bug fix" }
      ]
    },
    {
      "label": "Issue",
      "name": "issue",
      "type": "dynamic-enum",
      "provider": "jira-issues",
      "description": "Select an issue from Jira",
      "combobox": true
    },
    {
      "label": "Subject",
      "name": "subject",
      "type": "text",
      "description": "Brief description"
    }
  ]
}
```

### Token 配置说明

| 字段 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `type` | string | 是 | 必须设置为 `"dynamic-enum"` |
| `provider` | string | 是 | 提供者的 ID（对应 `DynamicOptionsProvider.id`） |
| `label` | string | 是 | 表单字段的标签 |
| `name` | string | 是 | Token 在模板中的名称 |
| `description` | string | 否 | 字段描述 |
| `combobox` | boolean | 否 | 是否允许过滤选项（默认 false） |
| `multiple` | boolean | 否 | 是否允许多选（默认 false） |
| `separator` | string | 否 | 多选时的分隔符（默认 `", "`） |
| `prefix` | string | 否 | 值前缀 |
| `suffix` | string | 否 | 值后缀 |

## 加载流程

1. 用户打开提交消息编辑器
2. 前端检测到 `dynamic-enum` 类型的 token
3. 前端发送消息到后端请求加载选项
4. 后端调用注册的提供者的 `provideOptions()` 方法
5. 提供者返回选项数组
6. 后端将选项发送回前端
7. 前端更新 Redux 状态并渲染下拉列表

## 超时和取消

- 提供者有 **30 秒**的超时限制
- 如果用户关闭编辑器或切换仓库，请求会被取消
- 提供者应该检查 `CancellationToken.isCancellationRequested` 并及早返回

## 错误处理

- 如果提供者抛出错误或返回空数组，token 会回退到普通文本输入框
- 错误会记录到 VSCode 输出面板（"Commit Message Editor" 频道）
- 用户仍然可以手动输入值

## 最佳实践

1. **性能**：尽快返回结果，避免长时间的 API 调用
2. **缓存**：考虑缓存频繁请求的数据
3. **错误处理**：优雅地处理网络错误和 API 限制
4. **取消支持**：检查取消令牌以避免不必要的工作
5. **用户反馈**：使用描述字段提供上下文信息
6. **配置**：允许用户配置 API 端点、令牌等
7. **权限**：仅在必要时请求用户凭据

## 类型定义

完整的 TypeScript 类型定义可以在扩展的导出 API 中找到：

```typescript
import type {
  DynamicOptionsProvider,
  DynamicOptionItem,
  DynamicOptionsContext,
} from 'vscode-commit-message-editor';
```

## 故障排除

### 提供者未注册

- 确保在 Commit Message Editor 激活后再注册提供者
- 检查提供者 ID 是否唯一
- 查看 VSCode 开发者工具控制台的错误信息

### 选项未显示

- 确认配置中 `provider` 字段与提供者 ID 匹配
- 检查 `provideOptions()` 是否返回了非空数组
- 查看 VSCode 输出面板（"Commit Message Editor"）的错误日志

### 性能问题

- 检查 API 调用是否超时
- 考虑添加缓存机制
- 限制返回的选项数量（建议 < 100）

## 示例扩展

完整的示例扩展可以在以下位置找到：
- `example-configs/dynamic-enum-jira-example.json` - Jira 集成示例
- `example-configs/dynamic-enum-git-example.json` - Git 分支信息示例

## API 版本

- 当前版本：1.0.0
- 最小 Commit Message Editor 版本：0.19.0
