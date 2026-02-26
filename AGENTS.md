# VSCode Commit Message Editor - 代码开发指南

本文档为在此仓库中工作的 AI 代码助手提供指导。

## 项目概览

这是一个 VSCode 扩展，用于在便捷的界面中编辑 Git 提交消息。项目包含两部分：
- **后端扩展** (`src/`): TypeScript，使用 VSCode API 和 Git 扩展 API
- **前端界面** (`frontend/`): Lit 元素（Web Components），使用 Redux 进行状态管理

## 构建与测试命令

### 后端扩展

```bash
# 编译整个项目（扩展 + 前端）
npm run compile

# 仅编译扩展
npm run compile:extension

# 监视模式（开发）
npm run watch

# 运行扩展测试（Mocha + vscode-test）
npm run pretest  # 先编译
npm test         # 运行所有测试

# 运行 E2E 测试（WebdriverIO）
npm run wdio
```

### 前端

```bash
cd frontend

# 编译 TypeScript
npm run build:ts

# 打包（Rollup）
npm run build:bundle

# 监视模式
npm run build:watch

# 运行前端单元测试
npm run test                    # 运行所有测试
npm run test:watch              # 监视模式
npm run test:coverage           # 带覆盖率

# 运行单个测试文件
npx wtr dist/test/components/cme-form-view/cme-form-view.test.js --watch

# Lint
npm run lint:eslint

# 格式化代码
npm run format
```

**注意**：前端测试使用 Web Test Runner，测试文件需要先编译为 JS 才能运行。

## 代码风格指南

### TypeScript 配置

#### 后端 (根目录)
- **目标**: ES6
- **模块**: CommonJS
- **严格模式**: 已启用
- **源映射**: 已启用
- **输出目录**: `out/`

#### 前端 (frontend/)
- **目标**: ES2019
- **模块**: ES2020
- **严格模式**: 已启用，包含 `noUnusedLocals`、`noUnusedParameters`、`noImplicitReturns`
- **装饰器**: 已启用 `experimentalDecorators`（用于 Lit）
- **输出目录**: `dist/`

### 格式化规则（Prettier）

```json
{
  "trailingComma": "es5",
  "tabWidth": 2,
  "semi": true,
  "singleQuote": true
}
```

- **缩进**: 2 空格
- **分号**: 必须使用
- **引号**: 单引号
- **尾随逗号**: ES5 风格（对象和数组）

### TSLint 规则

- 必须使用分号
- 必须使用花括号（`curly`）
- 必须使用三等号（`===`）
- 类名使用 PascalCase
- 禁止重复变量声明
- 禁止未使用的表达式

### 命名约定

#### 类与接口
- **类名**: PascalCase，例如 `GitService`、`EditorController`
- **接口**: PascalCase，例如 `RepositoryInfo`、`ViewColumnMap`
- **类型别名**: PascalCase，例如 `ViewColumnKey`
- **枚举**: PascalCase，成员也用 PascalCase

#### 变量与方法
- **公共属性/方法**: camelCase，例如 `getSelectedRepository`、`numberOfRepositories`
- **私有属性/方法**: 以下划线开头，例如 `_primaryEditorPanel`、`_handleRepositoryDidChange`
- **常量**: camelCase（对于对象/映射），例如 `editorGroupNameMap`

#### 文件命名
- **类文件**: PascalCase，例如 `GitService.ts`、`EditorController.ts`
- **组件文件**: kebab-case，例如 `cme-editor.ts`、`cme-form-view.ts`
- **工具函数**: camelCase，例如 `createPostMessage.ts`、`getNonce.ts`

### 导入规范

#### 导入顺序
1. 外部库（例如 `vscode`、`lit`）
2. 本地类型定义（例如 `../definitions`、`../@types/git`）
3. 本地工具/服务（例如 `../utils/GitService`）
4. 本地组件（例如 `./cme-text-view`）

#### 示例
```typescript
import * as vscode from 'vscode';
import { ViewType, Command } from './definitions';
import GitService from './utils/GitService';
import EditorController from './commands/EditorController';
```

### 类型定义

- **始终使用显式类型**：对于参数、返回值和公共 API
- **接口优于类型别名**：用于对象形状
- **使用 `readonly`**：对于不可变属性
- **避免 `any`**：使用 `unknown` 或具体类型

```typescript
// 好的例子
public getNumberOfRepositories(): number {
  return this.api?.repositories.length || 0;
}

private _getTimestamp(): string {
  const now = new Date();
  // ...
  return `${y}-${m}-${d} ${h}:${mi}:${s}.${ms}`;
}

// 回调类型定义
export type RepositoryChangeCallback = (repositoryInfo: {
  numberOfRepositories: number;
  selectedRepositoryPath: string;
  availableRepositories: string[];
}) => void;
```

### 错误处理

- **使用 try-catch**：对于可能失败的异步操作
- **早期返回**：对于无效状态
- **日志记录**：使用 `Logger` 类记录重要事件和错误

```typescript
// 早期返回模式
constructor() {
  this.gitExtension = vscode.extensions.getExtension('vscode.git');
  
  if (!this.gitExtension) {
    return;  // 早期返回
  }
  
  this.isGitAvailable = true;
  this.api = this.gitExtension.exports.getAPI(1);
}

// try-catch 示例
async function main() {
  try {
    await runTests({ extensionDevelopmentPath, extensionTestsPath });
  } catch (err) {
    console.error('Failed to run tests');
    process.exit(1);
  }
}
```

## 架构模式

### 后端

- **命令模式**：命令类在 `src/commands/` 中
- **服务层**：工具类在 `src/utils/` 中（例如 `GitService`、`Logger`）
- **视图控制器**：在 `src/webviews/` 和 `src/commands/` 中管理 Webview
- **依赖注入**：通过构造函数注入（例如 `EditorController` 接收 `GitService`、`Logger`）

### 前端

- **Web Components**：使用 Lit 元素
- **状态管理**：Redux（`store/`）
- **装饰器**：`@customElement`、`@state`、`@property` 用于 Lit 组件
- **连接到 Store**：使用 `connect(store)(LitElement)` 混入

```typescript
@customElement('cme-editor')
export class Editor extends connect(store)(LitElement) {
  @state()
  private _selectedIndex = 0;

  stateChanged(state: RootState): void {
    this._selectedIndex = state.config.view.defaultView === 'text' ? 0 : 1;
  }
}
```

## 提交信息规范

遵循 Conventional Commits 规范：
- `feat`: 新功能
- `fix`: 错误修复
- `refactor`: 重构
- `docs`: 文档变更
- `test`: 测试相关
- `chore`: 构建/工具变更
- `style`: 代码格式变更

提交信息请使用中文，例如：`feat(editor): 添加多行 token 支持`

## 调试

### 扩展调试
使用 VSCode 调试配置 "Extension"（`.vscode/launch.json`）：
- 按 F5 启动扩展开发主机
- 源映射已启用

### 前端调试
使用 VSCode 调试配置 "Frontend"：
- 在 `frontend/` 中运行 `npm run serve`
- 在 Chrome 中打开 `http://localhost:8000/dev/`

## 常见陷阱

1. **前端测试**：必须先运行 `npm run build:ts` 才能测试
2. **路径**：后端使用 CommonJS，前端使用 ES 模块
3. **API 可用性**：始终检查 Git 扩展可用性（`GitService.isAvailable()`）
4. **Webview 生命周期**：使用 `retainContextWhenHidden: true` 避免状态丢失
5. **私有字段**：以 `_` 开头，但不影响 TypeScript 的 `private` 关键字

## 有用的参考

- VSCode Extension API: https://code.visualstudio.com/api
- Lit 文档: https://lit.dev
- Redux Toolkit: https://redux-toolkit.js.org
- 项目仓库: https://github.com/bendera/vscode-commit-message-editor
