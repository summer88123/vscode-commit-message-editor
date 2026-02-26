# 动态 Enum Provider 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标:** 为 VSCode Commit Message Editor 添加动态获取 enum token options 的能力，通过可扩展的 Provider 系统实现

**架构:** 采用 Provider 注册模式，后端定义接口并管理注册表，前端通过消息通信延迟加载选项，实现会话级缓存，失败时降级为手动输入

**技术栈:** TypeScript, VSCode Extension API, Lit, Redux, Web Test Runner, Mocha

---

## 实施概览

本计划包含 12 个主要任务，采用 TDD 方法：

1. 定义 Provider 核心接口
2. 实现 Provider 注册管理器
3. 扩展 Extension API 导出
4. 扩展前端 Token 类型定义
5. 添加前端 Redux State 管理
6. 实现后端消息处理逻辑
7. 集成到 Webview 控制器
8. 实现前端加载和渲染逻辑
9. 添加前端单元测试
10. 更新文档和示例配置
11. 端到端测试和验证
12. 最终验证和清理

详细设计参考：`docs/plans/2026-02-26-dynamic-enum-provider-design.md`

---

## Task 1: 定义 Provider 核心接口

**Files:**
- Create: `src/providers/DynamicOptionsProvider.ts`
- Create: `src/providers/index.ts`

**Step 1: 创建 Provider 接口文件**

创建 `src/providers/DynamicOptionsProvider.ts`:

```typescript
import * as vscode from 'vscode';

export interface DynamicOptionItem {
  label: string;
  value?: string;
  description?: string;
}

export interface DynamicOptionsContext {
  repositoryPath?: string;
  tokenValues: Record<string, string>;
  cancellationToken?: vscode.CancellationToken;
}

export interface DynamicOptionsProvider {
  provideOptions(
    context: DynamicOptionsContext
  ): DynamicOptionItem[] | Promise<DynamicOptionItem[]>;
}
```

**Step 2: 创建导出文件**

创建 `src/providers/index.ts`:

```typescript
export {
  DynamicOptionsProvider,
  DynamicOptionsContext,
  DynamicOptionItem,
} from './DynamicOptionsProvider';
```

**Step 3: 编译验证**

```bash
npm run compile:extension
```

预期：编译成功，无错误

**Step 4: 提交**

```bash
git add src/providers/
git commit -m "feat: add DynamicOptionsProvider interface"
```

---

## Task 2: 实现 Provider 注册管理器

**Files:**
- Create: `src/providers/DynamicOptionsProviderRegistry.ts`
- Modify: `src/providers/index.ts`
- Create: `src/test/suite/providers/DynamicOptionsProviderRegistry.test.ts`

**Step 1: 编写单元测试**

创建 `src/test/suite/providers/DynamicOptionsProviderRegistry.test.ts`:

```typescript
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
```

**Step 2: 运行测试确认失败**

```bash
npm run pretest
npm test -- --grep "DynamicOptionsProviderRegistry"
```

预期：测试失败，模块未找到

**Step 3: 实现注册管理器**

创建 `src/providers/DynamicOptionsProviderRegistry.ts`:

```typescript
import { DynamicOptionsProvider } from './DynamicOptionsProvider';

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

  static clear(): void {
    this._providers.clear();
  }
}
```

**Step 4: 更新导出**

修改 `src/providers/index.ts`，添加:

```typescript
export { DynamicOptionsProviderRegistry } from './DynamicOptionsProviderRegistry';
```

**Step 5: 运行测试确认通过**

```bash
npm run pretest
npm test -- --grep "DynamicOptionsProviderRegistry"
```

预期：所有测试通过

**Step 6: 提交**

```bash
git add src/providers/ src/test/suite/providers/
git commit -m "feat: implement DynamicOptionsProviderRegistry"
```

---

## Task 3: 扩展 Extension API 导出

**Files:**
- Modify: `src/extension.ts`

**Step 1: 修改扩展激活函数导出 API**

在 `src/extension.ts` 的 `activate` 函数中，在返回值处添加（如果没有返回值，则创建返回对象）:

```typescript
import { DynamicOptionsProviderRegistry } from './providers/DynamicOptionsProviderRegistry';
import type { DynamicOptionsProvider } from './providers/DynamicOptionsProvider';

export function activate(context: vscode.ExtensionContext) {
  // ... 现有激活逻辑保持不变
  
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
    },
  };
}

// 导出类型定义
export type {
  DynamicOptionsProvider,
  DynamicOptionsContext,
  DynamicOptionItem,
} from './providers';
```

**Step 2: 编译验证**

```bash
npm run compile:extension
```

预期：编译成功

**Step 3: 提交**

```bash
git add src/extension.ts
git commit -m "feat: export registerDynamicOptionsProvider API"
```

---

## Task 4: 扩展前端 Token 类型定义

**Files:**
- Modify: `frontend/src/global.d.ts`

**Step 1: 扩展 TokenType 和 Token 接口**

修改 `frontend/src/global.d.ts`，找到 TokenType 定义，修改为:

```typescript
type TokenType = 'text' | 'boolean' | 'enum' | 'dynamic-enum';
```

在 Token 接口中添加 provider 字段:

```typescript
interface Token {
  // ... 现有字段
  provider?: string;  // 用于 dynamic-enum 类型
  // ... 其他字段
}
```

**Step 2: 编译前端验证**

```bash
cd frontend
npm run build:ts
```

预期：编译成功

**Step 3: 提交**

```bash
git add frontend/src/global.d.ts
git commit -m "feat: add dynamic-enum token type support"
```

---

## Task 5: 添加前端 Redux State 管理

**Files:**
- Modify: `frontend/src/store/state.ts`
- Create: `frontend/src/store/dynamicEnumsSlice.ts`
- Modify: `frontend/src/store/store.ts`

**Step 1: 扩展 RootState**

修改 `frontend/src/store/state.ts`，添加:

```typescript
export interface DynamicEnumTokenState {
  loading: boolean;
  error?: string;
  options: EnumTokenOption[];
  lastLoadedAt?: number;
}

export interface DynamicEnumsState {
  [tokenName: string]: DynamicEnumTokenState;
}
```

在 RootState 中添加:

```typescript
export interface RootState {
  // ... 现有字段
  dynamicEnums: DynamicEnumsState;
}
```

**Step 2: 创建 dynamicEnums slice**

创建 `frontend/src/store/dynamicEnumsSlice.ts`:

```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DynamicEnumsState } from './state';

const initialState: DynamicEnumsState = {};

const dynamicEnumsSlice = createSlice({
  name: 'dynamicEnums',
  initialState,
  reducers: {
    loadDynamicOptionsStart(state, action: PayloadAction<{ tokenName: string }>) {
      const { tokenName } = action.payload;
      state[tokenName] = {
        loading: true,
        options: [],
      };
    },

    loadDynamicOptionsSuccess(
      state,
      action: PayloadAction<{
        tokenName: string;
        options: Array<{ label: string; value?: string; description?: string }>;
      }>
    ) {
      const { tokenName, options } = action.payload;
      state[tokenName] = {
        loading: false,
        options,
        lastLoadedAt: Date.now(),
      };
    },

    loadDynamicOptionsFailure(
      state,
      action: PayloadAction<{ tokenName: string; error: string }>
    ) {
      const { tokenName, error } = action.payload;
      state[tokenName] = {
        loading: false,
        error,
        options: [],
      };
    },

    clearDynamicOptions(state, action: PayloadAction<{ tokenName: string }>) {
      const { tokenName } = action.payload;
      delete state[tokenName];
    },

    clearAllDynamicOptions() {
      return initialState;
    },
  },
});

export const {
  loadDynamicOptionsStart,
  loadDynamicOptionsSuccess,
  loadDynamicOptionsFailure,
  clearDynamicOptions,
  clearAllDynamicOptions,
} = dynamicEnumsSlice.actions;

export default dynamicEnumsSlice.reducer;
```

**Step 3: 注册到 store**

修改 `frontend/src/store/store.ts`，添加:

```typescript
import dynamicEnumsReducer from './dynamicEnumsSlice';

// 在 configureStore 中添加
const store = configureStore({
  reducer: {
    // ... 现有 reducers
    dynamicEnums: dynamicEnumsReducer,
  },
});
```

**Step 4: 编译验证**

```bash
cd frontend
npm run build:ts
```

预期：编译成功

**Step 5: 提交**

```bash
git add frontend/src/store/
git commit -m "feat: add Redux state management for dynamic enums"
```

---

## Task 6: 实现后端消息处理逻辑

**Files:**
- Create: `src/webviews/DynamicOptionsLoader.ts`
- Create: `src/test/suite/webviews/DynamicOptionsLoader.test.ts`

**Step 1: 创建动态选项加载器**

创建 `src/webviews/DynamicOptionsLoader.ts`:

```typescript
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
```

**Step 2: 编写单元测试**

创建 `src/test/suite/webviews/DynamicOptionsLoader.test.ts`:

```typescript
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
```

**Step 3: 运行测试**

```bash
npm run pretest
npm test -- --grep "DynamicOptionsLoader"
```

预期：所有测试通过

**Step 4: 提交**

```bash
git add src/webviews/ src/test/suite/webviews/
git commit -m "feat: implement DynamicOptionsLoader"
```

---

## Task 7-12 概要

由于文档长度限制，剩余任务的详细步骤请参考设计文档中的对应章节：

- **Task 7**: 集成到 Webview 控制器（在 EditorController 中添加消息处理）
- **Task 8**: 实现前端加载和渲染逻辑（FormBuilder 中添加 dynamic-enum 渲染）
- **Task 9**: 添加前端单元测试（测试 Redux slice）
- **Task 10**: 更新文档和示例配置
- **Task 11**: 端到端测试和验证
- **Task 12**: 最终验证和清理

每个任务都遵循相同的模式：
1. 编写测试（TDD）
2. 实现功能
3. 运行测试验证
4. 编译检查
5. 提交代码

---

## 验收标准

完成所有任务后，功能应满足：

### 功能性
- ✅ 其他扩展可以通过 API 注册 DynamicOptionsProvider
- ✅ Token 配置支持 `dynamic-enum` 类型
- ✅ 前端延迟加载动态选项
- ✅ 显示加载状态
- ✅ 错误时降级为手动输入
- ✅ 实现会话级缓存

### 代码质量
- ✅ 所有测试通过
- ✅ 无编译错误
- ✅ 无 lint 错误

### 文档
- ✅ 提供使用指南
- ✅ 包含实际示例
- ✅ 更新 README

---

## 执行建议

1. **按顺序执行任务 1-6**，这些是核心基础设施
2. **Task 7-8** 需要仔细查看现有的 EditorController 和 FormBuilder 代码结构
3. **Task 9-11** 确保质量
4. **Task 12** 最终验证

建议使用 `executing-plans` 技能逐任务执行，在关键点暂停审查。
