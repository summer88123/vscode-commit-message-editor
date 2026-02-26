# 测试 Dynamic Enum Provider

本文档说明如何手动测试 Dynamic Enum Provider 功能。

## 创建测试提供者扩展

为了测试功能，您需要创建一个简单的 VSCode 扩展来注册一个测试提供者。

### 步骤 1: 创建测试扩展目录

```bash
mkdir -p ~/test-dynamic-enum-provider
cd ~/test-dynamic-enum-provider
npm init -y
```

### 步骤 2: 创建 package.json

```json
{
  "name": "test-dynamic-enum-provider",
  "version": "0.0.1",
  "engines": {
    "vscode": "^1.60.0"
  },
  "activationEvents": [
    "*"
  ],
  "main": "./out/extension.js",
  "devDependencies": {
    "@types/vscode": "^1.60.0",
    "typescript": "^4.5.0"
  }
}
```

### 步骤 3: 创建 tsconfig.json

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "es6",
    "outDir": "out",
    "lib": ["es6"],
    "sourceMap": true,
    "rootDir": "src",
    "strict": true
  },
  "exclude": ["node_modules", ".vscode-test"]
}
```

### 步骤 4: 创建 src/extension.ts

```typescript
import * as vscode from 'vscode';

export async function activate(context: vscode.ExtensionContext) {
  console.log('Test Dynamic Enum Provider is activating...');

  // 获取 Commit Message Editor 扩展
  const cmeExtension = vscode.extensions.getExtension(
    'adam-bender.commit-message-editor'
  );

  if (!cmeExtension) {
    vscode.window.showErrorMessage(
      'Commit Message Editor extension not found'
    );
    return;
  }

  // 激活并获取 API
  const cmeAPI = await cmeExtension.activate();

  // 注册测试提供者
  const testProvider = {
    async provideOptions(context: any) {
      console.log('Test provider called with context:', context);

      // 返回一些测试选项
      return [
        {
          value: 'TEST-001',
          label: 'TEST-001',
          description: 'First test issue',
        },
        {
          value: 'TEST-002',
          label: 'TEST-002',
          description: 'Second test issue',
        },
        {
          value: 'TEST-003',
          label: 'TEST-003',
          description: 'Third test issue',
        },
      ];
    },
  };

  const disposable = cmeAPI.registerDynamicOptionsProvider(
    'test-provider',
    testProvider
  );

  context.subscriptions.push(disposable);

  vscode.window.showInformationMessage(
    'Test Dynamic Enum Provider registered successfully!'
  );
}

export function deactivate() {}
```

### 步骤 5: 编译

```bash
npm install
npx tsc
```

### 步骤 6: 测试配置

创建一个测试配置文件 `test-config.json`:

```json
{
  "$schema": "https://bendera.github.io/vscode-commit-message-editor/schemas/config-v1.schema.json",
  "configVersion": "1",
  "staticTemplate": [
    "feat: Short description",
    "",
    "Issue: TEST-001"
  ],
  "dynamicTemplate": [
    "{type}: {description}",
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
      "label": "Description",
      "name": "description",
      "type": "text"
    },
    {
      "label": "Test Issue",
      "name": "issue",
      "type": "dynamic-enum",
      "provider": "test-provider",
      "description": "Select a test issue",
      "combobox": true
    }
  ]
}
```

### 步骤 7: 在 VSCode 中测试

1. 在 VSCode 中打开测试扩展目录
2. 按 F5 启动扩展开发主机
3. 在扩展开发主机中，打开一个 Git 仓库
4. 打开 Commit Message Editor 配置页面
5. 导入 `test-config.json` 配置文件
6. 打开 Commit Message Editor
7. 检查 "Test Issue" 字段是否显示为下拉列表
8. 确认下拉列表中有 TEST-001, TEST-002, TEST-003 三个选项

## 验证清单

- [ ] 测试提供者成功注册
- [ ] dynamic-enum token 显示为下拉列表
- [ ] 下拉列表中显示正确的选项
- [ ] 选项包含正确的 label 和 description
- [ ] combobox 功能正常（可过滤）
- [ ] 选择选项后，值正确插入到提交消息中
- [ ] 如果提供者返回错误，回退到文本输入框
- [ ] 取消令牌功能正常（关闭编辑器后请求被取消）
- [ ] 超时功能正常（30 秒后超时）

## 手动测试场景

### 场景 1: 正常加载

1. 打开 Commit Message Editor
2. 验证 dynamic-enum 字段显示为下拉列表
3. 验证选项正确加载

### 场景 2: 错误处理

修改测试提供者，使其抛出错误：

```typescript
async provideOptions(context: any) {
  throw new Error('Test error');
}
```

验证:
- 字段回退到文本输入框
- 错误消息显示在 VSCode 输出面板

### 场景 3: 空选项

修改测试提供者，使其返回空数组：

```typescript
async provideOptions(context: any) {
  return [];
}
```

验证:
- 字段回退到文本输入框

### 场景 4: 超时

修改测试提供者，使其延迟超过 30 秒：

```typescript
async provideOptions(context: any) {
  await new Promise(resolve => setTimeout(resolve, 35000));
  return [...];
}
```

验证:
- 30 秒后请求被取消
- 字段回退到文本输入框

### 场景 5: 取消令牌

1. 打开 Commit Message Editor
2. 在选项加载过程中关闭编辑器
3. 验证请求被取消（通过控制台日志）

## 预期结果

所有测试场景都应按预期工作，没有错误或异常行为。
