# Conditional Token Expressions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement conditional token evaluation using linkedToken as a token name string and shown as either a literal or VSCode When Clause-style expression.

**Architecture:** Add a shared expression evaluator utility in the frontend and route both FormBuilder and TemplateCompiler through it. Update the token editor to store linkedToken as a string and allow shown to be a freeform expression.

**Tech Stack:** TypeScript, Lit, Web Test Runner (WTR)

---

### Task 1: Update token model and editor to use linkedToken string

**Files:**

- Modify: `frontend/src/global.d.ts`
- Modify: `frontend/src/components/cme-token-item-edit/cme-token-item-edit.ts`
- Test: `frontend/src/test/components/cme-token-item-edit/cme-token-item-edit.test.ts`

**Step 1: Write failing test for linkedToken string storage**

Update the conditional token test to expect linkedToken as a string name.

```ts
expect(ev.detail.data).to.deep.include({
  isConditionalToken: true,
  linkedToken: 'issueType',
  shown: 'bug',
});
```

**Step 2: Run test to verify it fails**

Run (from `frontend/`): `npm run build:ts && npx wtr dist/test/components/cme-token-item-edit/cme-token-item-edit.test.js`

Expected: FAIL because linkedToken is still an object.

**Step 3: Update types and editor storage**

- In `frontend/src/global.d.ts`, change `linkedToken?: Token;` to `linkedToken?: string;`.
- In `frontend/src/components/cme-token-item-edit/cme-token-item-edit.ts`:
  - Store `_linkedToken` as `string | undefined`.
  - On linked token change, assign the selected token name string.
  - Ensure `token` getter writes `linkedToken` string.

**Step 4: Run test to verify it passes**

Run: `npm run build:ts && npx wtr dist/test/components/cme-token-item-edit/cme-token-item-edit.test.js`

Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/global.d.ts frontend/src/components/cme-token-item-edit/cme-token-item-edit.ts frontend/src/test/components/cme-token-item-edit/cme-token-item-edit.test.ts
git commit -m "refactor: 调整条件 token 关联字段"
```

---

### Task 2: Add When Clause evaluator utility and tests

**Files:**

- Create: `frontend/src/utils/evaluateWhenClause.ts`
- Test: `frontend/src/test/utils/evaluateWhenClause.test.ts`

**Step 1: Write failing evaluator tests**

```ts
import { expect } from '@esm-bundle/chai';
import evaluateWhenClause from '../../utils/evaluateWhenClause';

describe('evaluateWhenClause', () => {
  it('supports literal match fallback', () => {
    expect(evaluateWhenClause('bug', { value: 'bug' })).to.equal(true);
  });

  it('supports comparisons and logic', () => {
    expect(
      evaluateWhenClause("value == 'bug' && value != 'task'", { value: 'bug' })
    ).to.equal(true);
  });

  it('supports in operator', () => {
    expect(
      evaluateWhenClause("value in ['bug','task']", { value: 'task' })
    ).to.equal(true);
  });

  it('supports regex', () => {
    expect(evaluateWhenClause('value =~ /fix/i', { value: 'HotFix' })).to.equal(
      true
    );
  });

  it('returns false on invalid expression', () => {
    expect(evaluateWhenClause('value ==', { value: 'bug' })).to.equal(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run (from `frontend/`): `npm run build:ts && npx wtr dist/test/utils/evaluateWhenClause.test.js`

Expected: FAIL because evaluator is missing.

**Step 3: Implement evaluator**

Create `frontend/src/utils/evaluateWhenClause.ts` with:

- Literal fallback: if expression has no operators or whitespace, treat as `value == expr`.
- Tokenizer and parser for the supported subset: `&&`, `||`, `!`, comparison operators, `in`, `=~`, parentheses, literals, arrays, regex.
- Return `false` on parse or evaluation errors.

**Step 4: Run test to verify it passes**

Run: `npm run build:ts && npx wtr dist/test/utils/evaluateWhenClause.test.js`

Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/utils/evaluateWhenClause.ts frontend/src/test/utils/evaluateWhenClause.test.ts
git commit -m "feat: 添加条件表达式解析器"
```

---

### Task 3: Wire evaluator into FormBuilder and TemplateCompiler

**Files:**

- Modify: `frontend/src/components/cme-form-view/FormBuilder.ts`
- Modify: `frontend/src/components/cme-form-view/TemplateCompiler.ts`
- Test: `frontend/src/test/components/cme-form-view/TemplateCompiler.test.ts`
- Test: `frontend/src/test/components/cme-form-view/cme-form-view.test.ts`

**Step 1: Write failing tests for string linkedToken**

Update tests to use `linkedToken: 'issueType'` and add an expression case:

```ts
{ isConditionalToken: true, linkedToken: 'issueType', shown: "value == 'bug'" }
```

**Step 2: Run tests to verify they fail**

Run (from `frontend/`):

`npm run build:ts && npx wtr dist/test/components/cme-form-view/TemplateCompiler.test.js`

Expected: FAIL due to evaluator missing in FormBuilder/TemplateCompiler.

**Step 3: Update FormBuilder and TemplateCompiler**

- Import and use `evaluateWhenClause`.
- Replace `token.linkedToken.name` with `token.linkedToken`.
- Determine `linkedValue` from `tokenValues[linkedToken]`.
- Decide visibility by evaluator result.

**Step 4: Run tests to verify they pass**

Run:

`npm run build:ts && npx wtr dist/test/components/cme-form-view/TemplateCompiler.test.js`

Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/components/cme-form-view/FormBuilder.ts frontend/src/components/cme-form-view/TemplateCompiler.ts frontend/src/test/components/cme-form-view/TemplateCompiler.test.ts frontend/src/test/components/cme-form-view/cme-form-view.test.ts
git commit -m "feat: 条件 token 支持表达式判断"
```

---

### Task 4: Update token editor UI for expression input

**Files:**

- Modify: `frontend/src/components/cme-token-item-edit/cme-token-item-edit.ts`
- Test: `frontend/src/test/components/cme-token-item-edit/cme-token-item-edit.test.ts`

**Step 1: Write failing UI test**

Ensure the shown control is a text input even when linked token is enum/boolean.

```ts
const shownInput = el.shadowRoot?.getElementById('shown');
expect(shownInput?.tagName.toLowerCase()).to.eq('vscode-inputbox');
```

**Step 2: Run test to verify it fails**

Run (from `frontend/`): `npm run build:ts && npx wtr dist/test/components/cme-token-item-edit/cme-token-item-edit.test.js`

Expected: FAIL because enum/boolean uses selects.

**Step 3: Simplify shown UI and add helper text**

- Replace enum/boolean selects with a single text input.
- Add a short helper text with example expressions.

**Step 4: Run test to verify it passes**

Run: `npm run build:ts && npx wtr dist/test/components/cme-token-item-edit/cme-token-item-edit.test.js`

Expected: PASS.

**Step 5: Commit**

```bash
git add frontend/src/components/cme-token-item-edit/cme-token-item-edit.ts frontend/src/test/components/cme-token-item-edit/cme-token-item-edit.test.ts
git commit -m "feat: 条件 token 支持表达式输入"
```

---

### Task 5: Documentation update

**Files:**

- Modify: `README.md`

**Step 1: Add conditional token examples**

Include examples for linkedToken as name string and When Clause expressions.

**Step 2: Run markdown check (optional)**

No automated check required unless the repo already uses one.

**Step 3: Commit**

```bash
git add README.md
git commit -m "docs: 说明条件 token 表达式"
```
