# Conditional Token Expression Design

## Goal

Upgrade conditional tokens so linkedToken stores a token name string and shown supports VSCode When Clause-style expressions in addition to direct value matching.

## Non-Goals

- Backward compatibility for linkedToken as an object.
- Full VSCode When Clause coverage.
- Server-side evaluation.

## Current State

- linkedToken is stored as a Token object.
- shown is a string and used for direct equality checks.
- Conditional logic is duplicated in the form renderer and template compiler.

## Proposed Data Model

```ts
interface Token {
  linkedToken?: string; // token name, presence indicates conditional token
  shown?: string; // direct value or expression, empty = no match
}
```

**语义说明：**

- `linkedToken` 存在 = 这是条件 token
- `shown` 为空或未定义 = 条件不匹配，token 不显示

## Expression Semantics

- If shown is a plain literal (no operators), treat as `value == shown`.
- Otherwise parse as a When Clause expression.
- Context:
  - `value`: linked token's current value

## Supported When Clause Subset

- Logic: `&&`, `||`, `!`
- Compare: `==`, `!=`, `>`, `>=`, `<`, `<=`
- Collection: `in`
- Regex: `=~` (e.g., `value =~ /bug/i`)
- Grouping: parentheses
- Literals: string, number, boolean, array, regex

Invalid expressions evaluate to false and surface a UI hint.

## UI Changes

- Linked Token dropdown keeps token.name display and stores name string.
- Match Value becomes a single text input for direct value or expression.
- Add helper text with example expressions.
- No separate checkbox needed (linkedToken presence indicates conditional token).

## Evaluation Flow

- FormBuilder and TemplateCompiler use a shared evaluator:
  - Find linked value by name.
  - If shown is literal, do direct equality.
  - Else evaluate expression with context { value }.

## Testing Strategy

- Unit tests for expression evaluator.
- Update form/template tests for string linkedToken and expression usage.

## 2026-02-27 简化更新

移除了 `isConditionalToken` 字段，简化了条件判断逻辑：

- **判断依据：** 仅检查 `linkedToken` 是否存在
- **空 shown 语义：** 条件不匹配，token 不显示
- **优势：**
  - 减少冗余字段
  - 语义更清晰（linkedToken 存在即为条件 token）
  - UI 更简洁（无需额外 checkbox）
