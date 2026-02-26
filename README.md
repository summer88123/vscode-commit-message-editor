# Hecom Commit Message Editor

以便捷的方式编辑 Git 提交信息。

## 特性亮点

- 提交信息可以在可自定义的表单中编辑。这有助于你使用标准化的格式。
- 可移植的配置，可与团队成员共享设置。
- 在专用标签页中提供大型文本编辑区域。
- 简洁的界面，基于 [Vscode Webview Elements](https://github.com/bendera/vscode-webview-elements)

![预览](preview1.gif)

默认设置遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范。

![预览](preview2.gif)

### 更多截图

- [配置编辑器](https://bendera.github.io/vscode-commit-message-editor/screenshots/configuration-editor.png)
- [常规文本编辑器](https://bendera.github.io/vscode-commit-message-editor/screenshots/regular-text-editor.png)
- [等宽文本编辑器](https://bendera.github.io/vscode-commit-message-editor/screenshots/monospace-text-editor.png)

## 自定义提交信息表单

自定义提交信息表单最简单的方法是使用配置编辑器。要打开配置编辑器，请从命令面板中选择 `Commit Message Editor: Open Settings Page` 命令，或点击提交信息编辑器标签页右上角的齿轮图标。在这里，你可以导出当前配置或导入其他配置。加载的配置可以保存到用户或工作区设置。

为可移植配置文件格式创建了 JSON schema。这意味着你可以使用 [VSCode 工具集](https://code.visualstudio.com/docs/languages/json)手动编辑配置文件。只需创建一个包含以下内容的新 JSON 文件并开始编辑：

```json
{
  "$schema": "https://bendera.github.io/vscode-commit-message-editor/schemas/config-v1.schema.json"
}
```

### 可移植配置文件的结构

#### configVersion

当前版本：`"1"`。将来可能会更改。

#### staticTemplate

文本视图的模板，字符串数组。数组中的每个项都是单独的一行。

#### dynamicTemplate

表单视图的模板，字符串数组。数组中的每个项都是单独的一行。
表单字段（见下一节）可以在模板中使用 `{token_name}` 格式引用。

#### tokens

token 对象数组。它定义了表单字段。下表显示了 token 对象的结构：

| 名称                       | 类型    | 描述                                                                                                                                                            | 适用范围 |
| -------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| label                      | string  | 表单项的标签。                                                                                                                                                    | 所有       |
| name                       | string  | 模板中的 token 名称。                                                                                                                                             | 所有       |
| value                      | string  | 布尔 token 为 true 时的值                                                                                                                                         | boolean   |
| type                       | enum    | token 的类型。有效值为：<br> **text**: 显示为文本输入<br>**boolean**: 显示为复选框<br>**enum**: 显示为下拉选择器<br>**dynamic-enum**: 显示为从提供者加载选项的下拉选择器 | 所有       |
| description                | string  | 表单项下方的较长文本                                                                                                                                              | 所有       |
| prefix                     | string  | 值之前的文本。仅在值不为空时应用                                                                                                                                  | 所有       |
| suffix                     | string  | 值之后的文本。仅在值不为空时应用                                                                                                                                  | 所有       |
| multiline                  | boolean | 多行文本输入                                                                                                                                                      | text      |
| monospace                  | boolean | 在多行模式下使用等宽编辑器                                                                                                                                        | text      |
| lines                      | number  | 文本区域初始高度（行数）                                                                                                                                          | text      |
| maxLines                   | number  | 文本区域最大高度（行数）                                                                                                                                          | text      |
| maxLength                  | number  | 值的最大长度                                                                                                                                                      | text      |
| maxLineLength              | number  | 使用等宽编辑器时垂直标尺的位置                                                                                                                                    | text      |
| multiple                   | boolean | 多个选项                                                                                                                                                          | enum      |
| separator                  | string  | 选择多个选项时的分隔符                                                                                                                                            | enum      |
| combobox                   | boolean | 选择器是否可过滤                                                                                                                                                  | enum, dynamic-enum      |
| options                    | array   | 可用选项                                                                                                                                                          | enum      |
| options[_{n}_].label       | string  | 选项的值                                                                                                                                                          | enum      |
| options[_{n}_].description | string  | 选项的详细描述                                                                                                                                                    | enum      |
| provider                   | string  | 动态选项提供者的 ID（dynamic-enum 必需）                                                                                                                          | dynamic-enum |

### 示例配置

- [默认配置](example-configs/default.json)
- [Gitmojis](example-configs/gitmojis.json)
- [Gitmojis - 简体中文描述](example-configs/gitmojis_zh-CN.json)
- [动态枚举 - Jira 集成](example-configs/dynamic-enum-jira-example.json)
- [动态枚举 - Git 分支信息](example-configs/dynamic-enum-git-example.json)

你可以使用 `scripts/gitmoji-config.js` 脚本自定义 Gitmoji 配置

## 动态枚举提供者 API

从 0.19.0 版本开始，此扩展提供了一个 API，允许其他 VSCode 扩展注册**动态选项提供者**。这些提供者可以从外部源（API、Git 信息、文件系统等）动态获取枚举选项，而不是使用静态配置。

### 使用场景

- 从项目管理系统获取 Jira/GitHub 问题
- 从 Git 分支名称中提取问题编号
- 从代码库中列出项目组件
- 从组织目录加载用户列表
- 任何其他动态数据源

### 快速示例

```typescript
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  const cmeExtension = vscode.extensions.getExtension(
    'adam-bender.commit-message-editor'
  );
  
  if (cmeExtension) {
    const cmeAPI = cmeExtension.exports;
    
    const disposable = cmeAPI.registerDynamicOptionsProvider({
      id: 'my-provider',
      displayName: 'My Provider',
      async provideOptions(context, token) {
        // 从数据源获取选项
        return [
          { value: 'option1', label: 'Option 1', description: 'First option' },
          { value: 'option2', label: 'Option 2', description: 'Second option' }
        ];
      }
    });
    
    context.subscriptions.push(disposable);
  }
}
```

### 文档

完整的文档、示例和最佳实践，请参阅：
- [动态枚举提供者 API 指南](docs/dynamic-enum-provider.md)

### 示例提供者

文档包含以下完整实现示例：
- **Jira Provider**: 从当前 sprint 获取问题
- **Git Branch Provider**: 从分支名称中提取问题编号
- **File System Provider**: 从项目结构中列出组件
