# 设计文档：解耦 linkedToken 与 shown，简化条件显示语义

**日期：** 2026-02-27  
**状态：** 已批准

## 背景

当前实现中，`linkedToken` 和 `shown` 两个字段存在语义耦合：

- `linkedToken` 承担双重职责：声明关联关系 + 为 `shown` 提供求值上下文（context）
- `shown` 的条件表达式只能引用 `linkedToken` 中列出的 token 变量
- 当 `linkedToken` 存在但 `shown` 为空时，token 不显示——这是隐式行为，不够直观

这导致：用户若想使用条件显示，必须同时维护两个字段，且 `linkedToken` 的语义不清晰。

## 决策

### 1. 完全删除 `linkedToken` 字段

从 `Token` 接口、所有组件、工具函数、测试及文档中彻底移除 `linkedToken`。

理由：
- `linkedToken` 当前唯一被使用的场景是为 `shown` 提供 context，该职责由全量 tokenValues 接管
- 未来若需要声明关联关系（如级联选项），应设计语义更明确的新字段
- 现有用户配置中的 `linkedToken` 字段将被静默忽略（JSON 额外字段不影响运行）

### 2. shown 语义更新

**新语义：**
- `shown` 不存在（`undefined`）：token 始终显示
- `shown` 存在（任意字符串，包括空字符串）：对表达式求值，`true` 则显示，`false` 则隐藏
- `shown` 的求值 context 来自**全量 tokenValues**，可自由引用任意 token 变量

**旧语义（废弃）：**
- `linkedToken` 存在 + `shown` 非空：对 `shown` 求值，context 仅限 `linkedToken` 列出的 token
- `linkedToken` 存在 + `shown` 为空：不显示
- `linkedToken` 不存在：始终显示

## 影响范围

| 文件 | 变更内容 |
|------|----------|
| `frontend/src/global.d.ts` | 删除 `Token.linkedToken` 字段 |
| `frontend/src/components/cme-form-view/FormBuilder.ts` | 移除 `linkedToken` 判断，`shown` 的 context 改为全量 tokenValues |
| `frontend/src/components/cme-form-view/TemplateCompiler.ts` | 同上 |
| `frontend/src/components/cme-token-item-edit/cme-token-item-edit.ts` | 删除 `_linkedToken` 状态、linkedToken 下拉框 UI、相关事件处理 |
| 相关测试文件（3 个） | 更新测试数据，移除 `linkedToken` 字段，更新条件显示测试逻辑 |
| `README.md` | 更新 `shown` 字段说明，删除 `linkedToken` 说明 |

## 新配置示例

```json
{
  "tokens": [
    {
      "label": "类型",
      "name": "type",
      "type": "enum",
      "options": [
        { "label": "feat", "value": "feat" },
        { "label": "fix", "value": "fix" }
      ]
    },
    {
      "label": "根本原因",
      "name": "root_cause",
      "type": "text",
      "shown": "type == 'fix'"
    },
    {
      "label": "功能描述",
      "name": "feature_desc",
      "type": "text",
      "shown": "type == 'feat'"
    }
  ]
}
```

## shown 表达式语法（保持不变）

```
==, !=, <, >, <=, >=       比较操作符
&&, ||, !                  逻辑操作符
in                         集合检查：type in ['fix', 'hotfix']
=~                         正则匹配：type =~ /^fix/
()                         括号分组
```
