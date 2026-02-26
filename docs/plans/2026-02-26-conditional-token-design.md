# Conditional Token Expression Design

## Goal
Upgrade conditional tokens so linkedToken stores a token name string and matchValue supports VSCode When Clause-style expressions in addition to direct value matching.

## Non-Goals
- Backward compatibility for linkedToken as an object.
- Full VSCode When Clause coverage.
- Server-side evaluation.

## Current State
- linkedToken is stored as a Token object.
- matchValue is a string and used for direct equality checks.
- Conditional logic is duplicated in the form renderer and template compiler.

## Proposed Data Model
```ts
interface Token {
  isConditionalToken?: boolean;
  linkedToken?: string; // token name
  matchValue?: string; // direct value or expression
}
```

## Expression Semantics
- If matchValue is a plain literal (no operators), treat as `value == matchValue`.
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

## Evaluation Flow
- FormBuilder and TemplateCompiler use a shared evaluator:
  - Find linked value by name.
  - If matchValue is literal, do direct equality.
  - Else evaluate expression with context { value }.

## Testing Strategy
- Unit tests for expression evaluator.
- Update form/template tests for string linkedToken and expression usage.
