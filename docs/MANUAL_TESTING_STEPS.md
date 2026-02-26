# Manual Testing Guide for Dynamic Enum Provider

本指南将指导您完成 Dynamic Enum Provider 功能的手动测试。

## 前提条件

- 已完成功能实现并编译成功
- 在 `.worktrees/feat/dynamic-enum-provider` 分支上

## 步骤 1: 创建测试提供者扩展

### 1.1 创建测试扩展目录

```bash
mkdir -p ~/vscode-test-dynamic-enum
cd ~/vscode-test-dynamic-enum
```

### 1.2 初始化项目

```bash
npm init -y
npm install --save-dev @types/vscode@^1.60.0 typescript@^4.5.0
```

### 1.3 创建 package.json

```bash
cat > package.json << 'EOF'
{
  "name": "test-dynamic-enum-provider",
  "displayName": "Test Dynamic Enum Provider",
  "description": "Test extension for dynamic enum provider",
  "version": "0.0.1",
  "engines": {
    "vscode": "^1.60.0"
  },
  "categories": ["Other"],
  "activationEvents": ["*"],
  "main": "./out/extension.js",
  "scripts": {
    "compile": "tsc -p ./"
  },
  "devDependencies": {
    "@types/vscode": "^1.60.0",
    "typescript": "^4.5.0"
  }
}
EOF
```

### 1.4 创建 tsconfig.json

```bash
cat > tsconfig.json << 'EOF'
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
  "exclude": ["node_modules"]
}
EOF
```

### 1.5 创建扩展代码

```bash
mkdir -p src
cat > src/extension.ts << 'EOF'
import * as vscode from 'vscode';

// 模拟 Jira Issues
const mockJiraIssues = [
  { key: 'PROJ-101', summary: 'Implement user authentication' },
  { key: 'PROJ-102', summary: 'Fix login page styling' },
  { key: 'PROJ-103', summary: 'Add password reset feature' },
  { key: 'PROJ-104', summary: 'Update API documentation' },
  { key: 'PROJ-105', summary: 'Optimize database queries' },
];

// 模拟 Git Branch 信息提取
function extractIssueFromBranch(branchName: string): string | null {
  const match = branchName.match(/([A-Z]+-\d+)/);
  return match ? match[1] : null;
}

export async function activate(context: vscode.ExtensionContext) {
  console.log('Test Dynamic Enum Provider extension is activating...');

  // 获取 Commit Message Editor 扩展
  const cmeExtension = vscode.extensions.getExtension(
    'adam-bender.commit-message-editor'
  );

  if (!cmeExtension) {
    vscode.window.showErrorMessage(
      'Commit Message Editor extension not found. Please install it first.'
    );
    return;
  }

  // 激活并获取 API
  let cmeAPI: any;
  try {
    cmeAPI = await cmeExtension.activate();
  } catch (error) {
    vscode.window.showErrorMessage(
      `Failed to activate Commit Message Editor: ${error}`
    );
    return;
  }

  if (!cmeAPI || typeof cmeAPI.registerDynamicOptionsProvider !== 'function') {
    vscode.window.showErrorMessage(
      'Commit Message Editor API not available or incompatible version'
    );
    return;
  }

  // ===== Provider 1: Mock Jira Issues =====
  const jiraProvider = {
    async provideOptions(context: any) {
      console.log('[Jira Provider] Called with context:', context);
      
      // 模拟 API 延迟
      await new Promise(resolve => setTimeout(resolve, 500));

      // 检查取消
      if (context.cancellationToken?.isCancellationRequested) {
        console.log('[Jira Provider] Request cancelled');
        return [];
      }

      // 返回 mock 数据
      const options = mockJiraIssues.map(issue => ({
        value: issue.key,
        label: issue.key,
        description: issue.summary,
      }));

      console.log('[Jira Provider] Returning options:', options);
      return options;
    },
  };

  const jiraDisposable = cmeAPI.registerDynamicOptionsProvider(
    'test-jira-issues',
    jiraProvider
  );
  context.subscriptions.push(jiraDisposable);
  console.log('[Jira Provider] Registered successfully');

  // ===== Provider 2: Git Branch Info =====
  const gitBranchProvider = {
    async provideOptions(context: any) {
      console.log('[Git Branch Provider] Called with context:', context);

      try {
        // 获取当前 Git 仓库
        const gitExtension = vscode.extensions.getExtension('vscode.git');
        if (!gitExtension) {
          return [];
        }

        const git = gitExtension.exports.getAPI(1);
        if (!git || git.repositories.length === 0) {
          return [];
        }

        // 获取当前分支
        const repo = git.repositories[0];
        const branchName = repo.state.HEAD?.name || '';
        
        console.log('[Git Branch Provider] Current branch:', branchName);

        // 提取 issue 编号
        const issueNumber = extractIssueFromBranch(branchName);
        
        if (issueNumber) {
          const option = {
            value: issueNumber,
            label: issueNumber,
            description: `Extracted from branch: ${branchName}`,
          };
          console.log('[Git Branch Provider] Returning option:', option);
          return [option];
        }

        return [];
      } catch (error) {
        console.error('[Git Branch Provider] Error:', error);
        return [];
      }
    },
  };

  const gitBranchDisposable = cmeAPI.registerDynamicOptionsProvider(
    'test-git-branch-info',
    gitBranchProvider
  );
  context.subscriptions.push(gitBranchDisposable);
  console.log('[Git Branch Provider] Registered successfully');

  // ===== Provider 3: Slow Provider (for timeout testing) =====
  const slowProvider = {
    async provideOptions(context: any) {
      console.log('[Slow Provider] Called, will delay 35 seconds...');
      
      // 延迟超过 30 秒超时限制
      await new Promise(resolve => setTimeout(resolve, 35000));
      
      return [{ value: 'slow', label: 'Slow Option' }];
    },
  };

  const slowDisposable = cmeAPI.registerDynamicOptionsProvider(
    'test-slow-provider',
    slowProvider
  );
  context.subscriptions.push(slowDisposable);
  console.log('[Slow Provider] Registered successfully');

  // ===== Provider 4: Error Provider =====
  const errorProvider = {
    async provideOptions(context: any) {
      console.log('[Error Provider] Called, will throw error...');
      throw new Error('Simulated provider error for testing');
    },
  };

  const errorDisposable = cmeAPI.registerDynamicOptionsProvider(
    'test-error-provider',
    errorProvider
  );
  context.subscriptions.push(errorDisposable);
  console.log('[Error Provider] Registered successfully');

  // 显示成功消息
  vscode.window.showInformationMessage(
    'Test Dynamic Enum Providers registered! (4 providers: jira, git-branch, slow, error)'
  );
}

export function deactivate() {
  console.log('Test Dynamic Enum Provider extension is deactivating...');
}
EOF
```

### 1.6 编译测试扩展

```bash
npm install
npm run compile
```

检查是否生成了 `out/extension.js` 文件。

## 步骤 2: 创建测试配置文件

在测试扩展目录中创建配置文件：

```bash
cat > test-config-jira.json << 'EOF'
{
  "$schema": "https://bendera.github.io/vscode-commit-message-editor/schemas/config-v1.schema.json",
  "configVersion": "1",
  "staticTemplate": [
    "feat: Short description",
    "",
    "Body text",
    "",
    "Issue: PROJ-101"
  ],
  "dynamicTemplate": [
    "{type}{scope}: {description}",
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
        { "label": "fix", "description": "A bug fix" },
        { "label": "docs", "description": "Documentation changes" }
      ]
    },
    {
      "label": "Scope",
      "name": "scope",
      "type": "text",
      "prefix": "(",
      "suffix": ")"
    },
    {
      "label": "Description",
      "name": "description",
      "type": "text",
      "description": "Short description"
    },
    {
      "label": "Body",
      "name": "body",
      "type": "text",
      "multiline": true,
      "lines": 5
    },
    {
      "label": "Jira Issue",
      "name": "issue",
      "type": "dynamic-enum",
      "provider": "test-jira-issues",
      "description": "Select a Jira issue (dynamically loaded)",
      "combobox": true
    }
  ]
}
EOF

cat > test-config-git.json << 'EOF'
{
  "$schema": "https://bendera.github.io/vscode-commit-message-editor/schemas/config-v1.schema.json",
  "configVersion": "1",
  "staticTemplate": [
    "feat: Short description",
    "",
    "Related to: PROJ-123"
  ],
  "dynamicTemplate": [
    "{type}: {description}",
    "",
    "Related to: {issue}"
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
      "label": "Issue from Branch",
      "name": "issue",
      "type": "dynamic-enum",
      "provider": "test-git-branch-info",
      "description": "Issue extracted from current Git branch name"
    }
  ]
}
EOF

cat > test-config-error.json << 'EOF'
{
  "$schema": "https://bendera.github.io/vscode-commit-message-editor/schemas/config-v1.schema.json",
  "configVersion": "1",
  "staticTemplate": ["feat: test"],
  "dynamicTemplate": ["{type}: {description}"],
  "tokens": [
    {
      "label": "Type",
      "name": "type",
      "type": "enum",
      "options": [{ "label": "feat" }]
    },
    {
      "label": "Description",
      "name": "description",
      "type": "text"
    },
    {
      "label": "Error Test",
      "name": "error",
      "type": "dynamic-enum",
      "provider": "test-error-provider",
      "description": "This provider will throw an error"
    }
  ]
}
EOF

cat > test-config-timeout.json << 'EOF'
{
  "$schema": "https://bendera.github.io/vscode-commit-message-editor/schemas/config-v1.schema.json",
  "configVersion": "1",
  "staticTemplate": ["feat: test"],
  "dynamicTemplate": ["{type}: {description}"],
  "tokens": [
    {
      "label": "Type",
      "name": "type",
      "type": "enum",
      "options": [{ "label": "feat" }]
    },
    {
      "label": "Description",
      "name": "description",
      "type": "text"
    },
    {
      "label": "Timeout Test",
      "name": "timeout",
      "type": "dynamic-enum",
      "provider": "test-slow-provider",
      "description": "This provider will timeout (35s delay)"
    }
  ]
}
EOF
```

## 步骤 3: 在 VSCode 中加载测试扩展

### 3.1 在主 VSCode 窗口中打开 Commit Message Editor 项目

```bash
cd /Users/summer/Documents/GitHub/vscode-commit-message-editor/.worktrees/feat/dynamic-enum-provider
code .
```

### 3.2 按 F5 启动扩展开发主机

- 这将打开一个新的 VSCode 窗口（Extension Development Host）
- 在这个窗口中，您的功能分支版本的 Commit Message Editor 已经加载

### 3.3 在扩展开发主机中加载测试扩展

在新打开的 Extension Development Host 窗口中：

1. 按 `Cmd+Shift+P` 打开命令面板
2. 输入 `Developer: Install Extension from Location`
3. 选择测试扩展目录：`~/vscode-test-dynamic-enum`

或者，直接在 Extension Development Host 中：

```
File -> Open Folder -> 选择 ~/vscode-test-dynamic-enum
```

然后按 F5 在测试扩展中再启动一个嵌套的 Extension Development Host。

**更简单的方法：** 在第一个 Extension Development Host 中打开终端，运行：

```bash
code --install-extension ~/vscode-test-dynamic-enum
```

### 3.4 验证扩展已加载

在 Extension Development Host 中：

1. 打开开发者工具：`Help -> Toggle Developer Tools`
2. 在控制台中查找：
   ```
   Test Dynamic Enum Provider extension is activating...
   [Jira Provider] Registered successfully
   [Git Branch Provider] Registered successfully
   [Slow Provider] Registered successfully
   [Error Provider] Registered successfully
   ```

应该看到成功消息通知："Test Dynamic Enum Providers registered! (4 providers...)"

## 步骤 4: 测试场景

### 场景 1: 测试 Jira Provider（正常流程）

1. 在 Extension Development Host 中打开一个 Git 仓库
2. 打开命令面板 (`Cmd+Shift+P`)
3. 运行 `Commit Message Editor: Open Settings Page`
4. 点击 "Import" 按钮
5. 选择 `test-config-jira.json`
6. 点击 "Save to Workspace Settings"
7. 关闭设置页面
8. 运行 `Commit Message Editor: Open Editor` 命令

**预期结果：**
- ✅ Form View 显示所有字段
- ✅ "Jira Issue" 字段显示为下拉列表（combobox）
- ✅ 点击下拉列表，显示 5 个选项：PROJ-101 到 PROJ-105
- ✅ 每个选项都有描述文本
- ✅ 可以通过输入过滤选项（combobox 功能）
- ✅ 选择一个选项后，预览中显示正确的提交消息

**控制台验证：**
```
[Jira Provider] Called with context: { repositoryPath: "...", tokenValues: {...} }
[Jira Provider] Returning options: [...]
```

### 场景 2: 测试 Git Branch Provider

1. 创建一个包含 issue 编号的分支：
   ```bash
   git checkout -b feature/PROJ-999-test-dynamic-enum
   ```

2. 导入 `test-config-git.json`
3. 打开 Commit Message Editor

**预期结果：**
- ✅ "Issue from Branch" 字段显示为下拉列表
- ✅ 自动显示选项 "PROJ-999"
- ✅ 描述显示："Extracted from branch: feature/PROJ-999-test-dynamic-enum"

**控制台验证：**
```
[Git Branch Provider] Current branch: feature/PROJ-999-test-dynamic-enum
[Git Branch Provider] Returning option: { value: "PROJ-999", ... }
```

### 场景 3: 测试错误处理

1. 导入 `test-config-error.json`
2. 打开 Commit Message Editor

**预期结果：**
- ✅ "Error Test" 字段回退到普通文本输入框（不是下拉列表）
- ✅ 可以手动输入文本
- ✅ 没有 UI 崩溃或错误弹窗

**控制台验证：**
```
[Error Provider] Called, will throw error...
Error: Simulated provider error for testing
```

**输出面板验证：**
1. 打开 `View -> Output`
2. 选择 "Commit Message Editor" 频道
3. 应该看到错误日志

### 场景 4: 测试超时

1. 导入 `test-config-timeout.json`
2. 打开 Commit Message Editor
3. 观察 "Timeout Test" 字段

**预期结果：**
- ✅ 字段显示为下拉列表
- ✅ 等待约 30 秒
- ✅ 30 秒后，字段回退到文本输入框
- ✅ 没有 UI 冻结

**控制台验证：**
```
[Slow Provider] Called, will delay 35 seconds...
(30 seconds later)
Request timed out or cancelled
```

### 场景 5: 测试取消令牌

1. 导入 `test-config-jira.json`
2. 打开 Commit Message Editor
3. 在选项加载过程中（500ms 延迟内）快速关闭编辑器标签页

**预期结果：**
- ✅ 请求被取消
- ✅ 没有内存泄漏或挂起的请求

**控制台验证：**
```
[Jira Provider] Request cancelled
```

### 场景 6: 测试多选和分隔符

修改 `test-config-jira.json`，在 issue token 中添加：

```json
{
  "label": "Jira Issue",
  "name": "issue",
  "type": "dynamic-enum",
  "provider": "test-jira-issues",
  "description": "Select Jira issues (multiple)",
  "combobox": true,
  "multiple": true,
  "separator": ", "
}
```

重新导入配置并打开编辑器。

**预期结果：**
- ✅ 可以选择多个选项
- ✅ 预览中显示用 ", " 分隔的值（例如 "PROJ-101, PROJ-102"）

### 场景 7: 测试 prefix 和 suffix

修改配置：

```json
{
  "label": "Jira Issue",
  "name": "issue",
  "type": "dynamic-enum",
  "provider": "test-jira-issues",
  "combobox": true,
  "prefix": "Fixes: #",
  "suffix": " (resolved)"
}
```

**预期结果：**
- ✅ 选择 "PROJ-101" 后，预览显示："Fixes: #PROJ-101 (resolved)"

### 场景 8: 测试空 repositoryPath

在没有 Git 仓库的文件夹中打开 VSCode Extension Development Host，然后打开 Commit Message Editor。

**预期结果：**
- ✅ Provider 被调用，context.repositoryPath 为 undefined 或空字符串
- ✅ Provider 应该优雅处理（返回空数组或默认选项）
- ✅ 没有崩溃

## 步骤 5: 验证清单

使用以下清单确保所有功能正常：

### 基本功能
- [ ] 测试提供者扩展成功加载
- [ ] 4 个提供者成功注册
- [ ] dynamic-enum token 显示为下拉列表
- [ ] 下拉列表显示正确的选项
- [ ] 选项包含 label 和 description
- [ ] 选择选项后值正确插入

### Combobox 功能
- [ ] combobox=true 时可以过滤选项
- [ ] 输入文本过滤有效
- [ ] combobox=false 时不能过滤

### 多选功能
- [ ] multiple=true 时可以选择多个选项
- [ ] 分隔符正确应用
- [ ] 预览显示所有选定值

### 前缀/后缀
- [ ] prefix 正确添加到值前面
- [ ] suffix 正确添加到值后面
- [ ] 值为空时不显示 prefix/suffix

### 错误处理
- [ ] Provider 抛出错误时回退到文本输入
- [ ] 错误记录到输出面板
- [ ] UI 没有崩溃
- [ ] 可以手动输入值

### 超时处理
- [ ] 30 秒后请求超时
- [ ] 超时后回退到文本输入
- [ ] UI 没有冻结

### 取消处理
- [ ] 关闭编辑器时请求被取消
- [ ] 控制台显示取消消息
- [ ] 没有内存泄漏

### Redux 状态
打开 Redux DevTools Extension（如果已安装）：
- [ ] LOAD_DYNAMIC_OPTIONS_START action 被 dispatch
- [ ] LOAD_DYNAMIC_OPTIONS_SUCCESS action 被 dispatch
- [ ] 状态正确更新
- [ ] 选择选项时 SET_DYNAMIC_OPTION_VALUE 被 dispatch

### 性能
- [ ] 加载选项不阻塞 UI
- [ ] 多个 dynamic-enum token 同时加载正常
- [ ] 切换仓库时状态正确重置

## 步骤 6: 清理

测试完成后：

```bash
# 删除测试扩展
rm -rf ~/vscode-test-dynamic-enum

# 切回 Git 主分支（如果需要）
cd /Users/summer/Documents/GitHub/vscode-commit-message-editor/.worktrees/feat/dynamic-enum-provider
git checkout -
```

## 故障排除

### 问题 1: 测试扩展未加载

**解决方案：**
- 检查 `out/extension.js` 是否存在
- 重新编译：`npm run compile`
- 重启 Extension Development Host

### 问题 2: Provider 未注册

**解决方案：**
- 打开开发者工具控制台查看错误
- 确认 Commit Message Editor API 可用
- 检查 provider ID 是否正确

### 问题 3: 下拉列表不显示选项

**解决方案：**
- 检查控制台是否有 provider 调用日志
- 检查 provider 是否返回了非空数组
- 查看输出面板的错误日志
- 确认配置中 provider 字段与注册的 ID 匹配

### 问题 4: 超时测试太慢

**解决方案：**
- 修改 `DynamicOptionsLoader.ts` 中的超时时间（临时）：
  ```typescript
  static async load(request: LoadDynamicOptionsRequest, timeout: number = 5000)
  ```
- 重新编译扩展

## 预期测试时间

- 设置：15 分钟
- 测试所有场景：30 分钟
- 总计：约 45 分钟

## 成功标准

所有 8 个测试场景通过，验证清单中所有项目都勾选。

---

**准备好开始测试了吗？按照步骤逐一执行即可！** 🚀
