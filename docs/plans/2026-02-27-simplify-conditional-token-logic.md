# 简化条件 Token 逻辑 - 移除 isConditionalToken

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标：** 简化条件 token 的判断逻辑，移除冗余的 `isConditionalToken` 字段，仅依赖 `linkedToken` 和 `shown` 来确定条件渲染行为。

**架构：**

- 移除 `isConditionalToken` 字段，改为仅检查 `linkedToken` 是否存在
- `shown` 为空或未定义时，token 不显示（条件不匹配）
- 更新 FormBuilder、TemplateCompiler、UI 组件和所有测试

**技术栈：** TypeScript, Lit, Web Test Runner, Mocha

---

## 任务 1: 更新类型定义

**文件：**

- Modify: `frontend/src/global.d.ts:82-84`

**步骤 1: 从 Token 接口移除 isConditionalToken**

```typescript
// 将这几行：
isConditionalToken?: boolean;
linkedToken?: string;
shown?: string;

// 改为：
linkedToken?: string;
shown?: string;
```

**步骤 2: 提交更改**

```bash
git add frontend/src/global.d.ts
git commit -m "refactor(types): 移除冗余的 isConditionalToken 字段"
```

---

## 任务 2: 更新 FormBuilder 条件逻辑

**文件：**

- Modify: `frontend/src/components/cme-form-view/FormBuilder.ts:46-51`

**步骤 1: 简化条件判断逻辑**

将：

```typescript
if (token.isConditionalToken && token.linkedToken && token.shown) {
  const linkedValue = this.tokenValues?.[token.linkedToken];
  if (!evaluateWhenClause(token.shown, { value: linkedValue })) {
    return html`${nothing}`;
  }
}
```

改为：

```typescript
if (token.linkedToken) {
  const linkedValue = this.tokenValues?.[token.linkedToken];
  // shown 为空时，token 不显示
  if (
    !token.shown ||
    !evaluateWhenClause(token.shown, { value: linkedValue })
  ) {
    return html`${nothing}`;
  }
}
```

**步骤 2: 编译前端代码验证语法**

```bash
cd frontend
npm run build:ts
```

预期：编译成功，无 TypeScript 错误

**步骤 3: 提交更改**

```bash
git add frontend/src/components/cme-form-view/FormBuilder.ts
git commit -m "refactor(form): 简化条件判断，仅依赖 linkedToken"
```

---

## 任务 3: 更新 TemplateCompiler 条件逻辑

**文件：**

- Modify: `frontend/src/components/cme-form-view/TemplateCompiler.ts:23-30`

**步骤 1: 简化条件判断逻辑**

将：

```typescript
this._tokens.forEach(
  ({
    name,
    prefix = '',
    suffix = '',
    isConditionalToken,
    linkedToken,
    shown,
  }) => {
    let value = this._tokenValues[name] || '';
    let canShowConditionallyRendered = true;

    if (isConditionalToken && linkedToken && shown) {
      const linkedValue = this._tokenValues[linkedToken];
      canShowConditionallyRendered = evaluateWhenClause(shown, {
        value: linkedValue,
      });
    }

    value =
      value && canShowConditionallyRendered ? prefix + value + suffix : '';
    compiled = compiled.replace(new RegExp(`{${name}}`, 'g'), value);
  }
);
```

改为：

```typescript
this._tokens.forEach(
  ({ name, prefix = '', suffix = '', linkedToken, shown }) => {
    let value = this._tokenValues[name] || '';
    let canShowConditionallyRendered = true;

    if (linkedToken) {
      // shown 为空时，条件不匹配
      canShowConditionallyRendered =
        !!shown &&
        evaluateWhenClause(shown, { value: this._tokenValues[linkedToken] });
    }

    value =
      value && canShowConditionallyRendered ? prefix + value + suffix : '';
    compiled = compiled.replace(new RegExp(`{${name}}`, 'g'), value);
  }
);
```

**步骤 2: 编译前端代码验证语法**

```bash
cd frontend
npm run build:ts
```

预期：编译成功，无 TypeScript 错误

**步骤 3: 提交更改**

```bash
git add frontend/src/components/cme-form-view/TemplateCompiler.ts
git commit -m "refactor(compiler): 简化条件判断，仅依赖 linkedToken"
```

---

## 任务 4: 更新 Token 编辑器组件

**文件：**

- Modify: `frontend/src/components/cme-token-item-edit/cme-token-item-edit.ts`

**步骤 1: 移除 \_isConditionalToken 状态和相关逻辑**

需要修改的位置：

- Line 42: 移除参数解构中的 `isConditionalToken`
- Line 66: 移除 `this._isConditionalToken = isConditionalToken ?? false;`
- Line 134-138: 简化 token 数据构建逻辑
- Line 201: 移除 `private _isConditionalToken = false;`
- Line 290-296: 移除 `_onIsConditionalTokenChange` 方法
- Line 293: 在 `_onLinkedTokenChange` 中，移除 linkedToken 清空逻辑
- Line 696-756: 移除 isConditionalToken 复选框 UI

**步骤 1.1: 移除参数解构和初始化**

在 `open` 方法中 (Line 42, 66)，将：

```typescript
const {
  // ... 其他字段
  isConditionalToken,
  linkedToken,
  shown,
} = tokenData;

// ...
this._isConditionalToken = isConditionalToken ?? false;
this._linkedToken = linkedToken;
this._shown = shown ?? '';
```

改为：

```typescript
const {
  // ... 其他字段
  linkedToken,
  shown,
} = tokenData;

// ...
this._linkedToken = linkedToken;
this._shown = shown ?? '';
```

**步骤 1.2: 简化 token getter**

在 `get token()` 方法中 (Line 134-138)，将：

```typescript
if (this._isConditionalToken) {
  retval.isConditionalToken = true;
  retval.linkedToken = this._linkedToken;
  retval.shown = this._shown;
}
```

改为：

```typescript
if (this._linkedToken) {
  retval.linkedToken = this._linkedToken;
  retval.shown = this._shown;
}
```

**步骤 1.3: 移除 \_isConditionalToken 私有状态 (Line 201)**

删除：

```typescript
@state()
private _isConditionalToken = false;
```

**步骤 1.4: 简化 linkedToken 变更处理 (Line 298-303)**

将：

```typescript
private _onLinkedTokenChange(ev: CustomEvent) {
  const val = (ev.detail.value as string);

  this._linkedToken = val;
  this._shown = '';
}
```

保持不变（这个逻辑是合理的）

**步骤 1.5: 移除 isConditionalToken 变更处理 (Line 290-296)**

删除整个方法：

```typescript
private _onIsConditionalTokenChange(ev: CustomEvent) {
  this._isConditionalToken = ev.detail.checked;
  if (!ev.detail.checked) {
    this._linkedToken = undefined;
    this._shown = '';
  }
}
```

**步骤 1.6: 更新 UI 渲染逻辑 (Line 696-757)**

移除 `isConditionalTokenWidget` 定义 (Line 696-706)：

```typescript
const isConditionalTokenWidget = html`
  <vscode-form-group variant="settings-group">
    <vscode-label for="isConditionalToken">Conditional Token</vscode-label>
    <vscode-checkbox
      id="isConditionalToken"
      label=""
      value="isConditionalToken"
      ?checked="${this._isConditionalToken}"
      @vsc-change="${this._onIsConditionalTokenChange}"
    ></vscode-checkbox>
  </vscode-form-group>
`;
```

更新 `linkedTokenWidget` (Line 709-722) 移除 required 标记：

```typescript
const linkedTokenWidget = html`
  <vscode-form-group variant="settings-group">
    <vscode-label for="linkedToken">Linked Token</vscode-label>
    <vscode-single-select
      id="linkedToken"
      name="linkedToken"
      @vsc-change="${this._onLinkedTokenChange}"
      class="vscode-select"
    >
      ${this.tokens
        .filter((t) => t.name !== this._name)
        .map(
          (token) => html`
            <vscode-option ?selected="${this._linkedToken === token.name}">
              ${token.name}
            </vscode-option>
          `
        )}
    </vscode-single-select>
  </vscode-form-group>
`;
```

更新 `_shownWidget` 条件 (Line 743)，将：

```typescript
const _shownWidget =
  !this._isConditionalToken || !this._linkedToken ? nothing : shownTextWidget;
```

改为：

```typescript
const _shownWidget = !this._linkedToken ? nothing : shownTextWidget;
```

在渲染部分 (Line 755-757)，将：

```typescript
${isConditionalTokenWidget}
${this._isConditionalToken ? linkedTokenWidget : nothing}
${_shownWidget}
```

改为：

```typescript
${linkedTokenWidget}
${_shownWidget}
```

**步骤 2: 编译前端代码验证语法**

```bash
cd frontend
npm run build:ts
```

预期：编译成功，无 TypeScript 错误

**步骤 3: 提交更改**

```bash
git add frontend/src/components/cme-token-item-edit/cme-token-item-edit.ts
git commit -m "refactor(token-edit): 移除 isConditionalToken UI 和逻辑"
```

---

## 任务 5: 更新 TemplateCompiler 测试

**文件：**

- Modify: `frontend/src/test/components/cme-form-view/TemplateCompiler.test.ts`

**步骤 1: 移除测试数据中的 isConditionalToken 字段**

在 `createTokens` 函数中 (Line 136-148)，将：

```typescript
{
  label: 'Root cause',
  name: 'root_cause',
  prefix: 'Root cause: ',
  type: 'text',
  isConditionalToken: true,
  linkedToken: 'issue_type',
  shown: 'bug',
},
{
  label: 'Fix',
  name: 'fix',
  prefix: 'Fix: ',
  type: 'text',
  isConditionalToken: true,
  linkedToken: 'issue_type',
  shown: 'bug',
}
```

改为：

```typescript
{
  label: 'Root cause',
  name: 'root_cause',
  prefix: 'Root cause: ',
  type: 'text',
  linkedToken: 'issue_type',
  shown: 'bug',
},
{
  label: 'Fix',
  name: 'fix',
  prefix: 'Fix: ',
  type: 'text',
  linkedToken: 'issue_type',
  shown: 'bug',
}
```

在表达式测试中 (Line 230-240)，将：

```typescript
...createTokens().filter(t => !t.isConditionalToken),
issueTypeToken,
{
  label: 'Root cause',
  name: 'root_cause',
  prefix: 'Root cause: ',
  type: 'text',
  isConditionalToken: true,
  linkedToken: 'issue_type',
  shown: "value == 'bug'",
}
```

改为：

```typescript
...createTokens().filter(t => !t.linkedToken),
issueTypeToken,
{
  label: 'Root cause',
  name: 'root_cause',
  prefix: 'Root cause: ',
  type: 'text',
  linkedToken: 'issue_type',
  shown: "value == 'bug'",
}
```

**步骤 2: 运行测试验证**

```bash
cd frontend
npm run test -- --files dist/test/components/cme-form-view/TemplateCompiler.test.js
```

预期：所有测试通过

**步骤 3: 提交更改**

```bash
git add frontend/src/test/components/cme-form-view/TemplateCompiler.test.ts
git commit -m "test(compiler): 更新测试移除 isConditionalToken"
```

---

## 任务 6: 更新 FormView 测试

**文件：**

- Modify: `frontend/src/test/components/cme-form-view/cme-form-view.test.ts`

**步骤 1: 移除测试数据中的 isConditionalToken 字段**

在测试数据中 (Line 147-158)，将：

```typescript
{
  label: 'Root cause',
  name: 'root_cause',
  type: 'text',
  isConditionalToken: true,
  linkedToken: 'issue_type',
  shown: 'bug',
},
{
  label: 'Fix',
  name: 'fix',
  type: 'text',
  isConditionalToken: true,
  linkedToken: 'issue_type',
  shown: 'bug',
}
```

改为：

```typescript
{
  label: 'Root cause',
  name: 'root_cause',
  type: 'text',
  linkedToken: 'issue_type',
  shown: 'bug',
},
{
  label: 'Fix',
  name: 'fix',
  type: 'text',
  linkedToken: 'issue_type',
  shown: 'bug',
}
```

**步骤 2: 运行测试验证**

```bash
cd frontend
npm run test -- --files dist/test/components/cme-form-view/cme-form-view.test.js
```

预期：所有测试通过

**步骤 3: 提交更改**

```bash
git add frontend/src/test/components/cme-form-view/cme-form-view.test.ts
git commit -m "test(form-view): 更新测试移除 isConditionalToken"
```

---

## 任务 7: 更新 TokenItemEdit 测试

**文件：**

- Modify: `frontend/src/test/components/cme-token-item-edit/cme-token-item-edit.test.ts`

**步骤 1: 移除 isConditionalToken 相关测试**

需要修改的测试用例：

- Line 233-258: 移除 isConditionalToken checkbox 交互测试
- Line 274, 285-290: 移除 UI 存在性检查
- Line 306-307, 342-343, 371-372: 移除测试数据中的 isConditionalToken

**步骤 1.1: 更新 "should save the form data" 测试 (Line 233-258)**

将测试重点从 isConditionalToken 切换改为直接测试 linkedToken：

```typescript
it('should save the form data', async () => {
  el.tokens = [
    { name: 'test token', label: 'Test Token', type: 'text' },
    { name: 'another', label: 'Another', type: 'text' },
  ];
  await el.updateComplete;

  el.open({
    name: 'test',
    label: 'Test',
    type: 'text',
  });
  await el.updateComplete;

  const linkedToken = el.shadowRoot?.getElementById('linkedToken');

  linkedToken?.dispatchEvent(
    new CustomEvent('vsc-change', {
      detail: { value: 'test token' },
    })
  );
  await el.updateComplete;

  const shown = el.shadowRoot?.getElementById('shown');

  shown?.dispatchEvent(
    new CustomEvent('vsc-change', {
      detail: 'test value',
    })
  );

  const saveBtn = el.shadowRoot?.querySelector('[label="Save"]');
  const eventSpy = new EventSpy('save', el);
  saveBtn?.dispatchEvent(new Event('click'));

  expect(eventSpy.called).to.be.true;
  expect(eventSpy.detail.data).to.deep.include({
    linkedToken: 'test token',
    shown: 'test value',
  });
});
```

**步骤 1.2: 移除 "conditional token UI" 测试 (Line 274, 285-290)**

删除这个测试：

```typescript
it('conditional token UI', async () => {
  // ...
  expect(el.shadowRoot?.getElementById('isConditionalToken')).to.exist;
  // ...
});
```

**步骤 1.3: 更新其他测试数据 (Line 306-307, 342-343, 371-372)**

移除所有测试用例中的 `isConditionalToken: true`，保留 `linkedToken` 和 `shown`：

```typescript
// 例如 Line 306-307
{
  // ...其他字段
  linkedToken: 'test token',
  // 移除 isConditionalToken: true
}
```

**步骤 2: 运行测试验证**

```bash
cd frontend
npm run test -- --files dist/test/components/cme-token-item-edit/cme-token-item-edit.test.js
```

预期：所有测试通过

**步骤 3: 提交更改**

```bash
git add frontend/src/test/components/cme-token-item-edit/cme-token-item-edit.test.ts
git commit -m "test(token-edit): 更新测试移除 isConditionalToken"
```

---

## 任务 8: 添加 shown 为空的测试用例

**文件：**

- Modify: `frontend/src/test/components/cme-form-view/TemplateCompiler.test.ts`

**步骤 1: 添加测试用例验证 shown 为空时的行为**

在文件末尾添加新测试：

```typescript
it('conditional token with empty shown should not render', () => {
  const template = createTemplate();
  const tokens = createTokens();
  // 添加一个 shown 为空的条件 token
  const tokensWithEmpty = [
    ...tokens,
    {
      label: 'Empty Match',
      name: 'empty_match',
      prefix: 'Empty: ',
      type: 'text',
      linkedToken: 'issue_type',
      shown: '', // 空 shown
    },
  ];
  const tokenValues = {
    ...createTokenValues(),
    issue_type: 'bug',
    empty_match: 'Should not appear',
  };

  const compiler = new TemplateCompiler(template, tokensWithEmpty, tokenValues);
  const result = compiler.compile();

  // empty_match 不应该出现在结果中
  expect(result).to.not.include('Empty: Should not appear');
});

it('conditional token with undefined shown should not render', () => {
  const template = createTemplate();
  const tokens = createTokens();
  // 添加一个 shown 为 undefined 的条件 token
  const tokensWithUndefined = [
    ...tokens,
    {
      label: 'Undefined Match',
      name: 'undefined_match',
      prefix: 'Undefined: ',
      type: 'text',
      linkedToken: 'issue_type',
      // shown 未定义
    },
  ];
  const tokenValues = {
    ...createTokenValues(),
    issue_type: 'bug',
    undefined_match: 'Should not appear',
  };

  const compiler = new TemplateCompiler(
    template,
    tokensWithUndefined,
    tokenValues
  );
  const result = compiler.compile();

  // undefined_match 不应该出现在结果中
  expect(result).to.not.include('Undefined: Should not appear');
});
```

**步骤 2: 运行测试验证**

```bash
cd frontend
npm run test -- --files dist/test/components/cme-form-view/TemplateCompiler.test.js
```

预期：所有测试通过，包括新增的两个测试

**步骤 3: 提交更改**

```bash
git add frontend/src/test/components/cme-form-view/TemplateCompiler.test.ts
git commit -m "test(compiler): 添加 shown 为空的测试用例"
```

---

## 任务 9: 运行完整测试套件

**步骤 1: 编译整个项目**

```bash
npm run compile
```

预期：编译成功，无错误

**步骤 2: 运行前端所有测试**

```bash
cd frontend
npm run test
```

预期：所有测试通过

**步骤 3: 运行后端测试（如果有）**

```bash
npm test
```

预期：所有测试通过（如果后端没有相关测试，应该也通过）

**步骤 4: 提交确认**

如果所有测试通过，记录测试结果。如果有测试失败，修复后再提交。

---

## 任务 10: 更新 README 文档

**文件：**

- Modify: `README.md:77-92`

**步骤 1: 更新条件 Token 文档**

将文档中的说明更新为新的简化逻辑：

```markdown
### 条件 Token

条件 token 允许你根据其他 token 的值动态显示或隐藏表单字段。这对于创建基于上下文的动态表单非常有用。

#### 基本用法

要创建条件 token，需要设置以下属性：

- `linkedToken: "token_name"` - 指定关联的 token 名称（字符串）
- `shown: "expression"` - 定义条件表达式

**注意：** 如果 `linkedToken` 存在但 `shown` 为空或未定义，该 token 将不会显示（条件视为不匹配）。

#### shown 表达式语法
```

移除所有提到 `isConditionalToken: true` 的示例，更新为：

```json
{
  "label": "破坏性变更说明",
  "name": "breaking",
  "type": "text",
  "multiline": true,
  "linkedToken": "type",
  "shown": "value == 'feat' || value == 'fix'"
}
```

**步骤 2: 更新 Token 属性表 (Line 77-79)**

移除 `isConditionalToken` 行：

```markdown
| isConditionalToken | boolean | 标记此 token 为条件 token，其可见性由关联 token 的值决定 | 所有 |
```

更新 `linkedToken` 行的描述：

```markdown
| linkedToken | string | 关联 token 的名称。设置此字段后，该 token 成为条件 token | 所有 |
```

**步骤 3: 提交更改**

```bash
git add README.md
git commit -m "docs: 更新条件 token 文档，移除 isConditionalToken"
```

---

## 任务 11: 更新设计文档

**文件：**

- Modify: `docs/plans/2026-02-26-conditional-token-design.md`

**步骤 1: 更新数据模型部分**

将：

````markdown
## Proposed Data Model

```ts
interface Token {
  isConditionalToken?: boolean;
  linkedToken?: string; // token name
  shown?: string; // direct value or expression
}
```
````

````

改为：
```markdown
## Proposed Data Model
```ts
interface Token {
  linkedToken?: string; // token name, presence indicates conditional token
  shown?: string; // direct value or expression, empty = no match
}
````

**语义说明：**

- `linkedToken` 存在 = 这是条件 token
- `shown` 为空或未定义 = 条件不匹配，token 不显示

````

**步骤 2: 更新 UI Changes 部分**

移除对 isConditionalToken checkbox 的提及。

**步骤 3: 添加简化说明**

在文档末尾添加：

```markdown
## 2026-02-27 简化更新

移除了 `isConditionalToken` 字段，简化了条件判断逻辑：

- **判断依据：** 仅检查 `linkedToken` 是否存在
- **空 shown 语义：** 条件不匹配，token 不显示
- **优势：**
  - 减少冗余字段
  - 语义更清晰（linkedToken 存在即为条件 token）
  - UI 更简洁（无需额外 checkbox）
````

**步骤 4: 提交更改**

```bash
git add docs/plans/2026-02-26-conditional-token-design.md
git commit -m "docs: 更新设计文档反映简化后的逻辑"
```

---

## 任务 12: 更新示例配置文件（如果有）

**步骤 1: 查找示例配置文件**

```bash
find . -name "*.json" -path "*/example-configs/*" -type f
```

**步骤 2: 对于每个示例配置文件**

如果文件中包含 `isConditionalToken`，移除该字段，保留 `linkedToken` 和 `shown`。

**步骤 3: 提交更改**

```bash
git add example-configs/
git commit -m "docs: 更新示例配置移除 isConditionalToken"
```

注意：这一步骤取决于是否有示例配置文件包含条件 token。

---

## 验证清单

完成所有任务后，验证：

- [ ] TypeScript 编译无错误：`npm run compile`
- [ ] 前端测试全部通过：`cd frontend && npm run test`
- [ ] 后端测试全部通过：`npm test`
- [ ] README 文档已更新
- [ ] 设计文档已更新
- [ ] 示例配置已更新（如果存在）
- [ ] 所有更改已提交

---

## 回归风险

**低风险：**

- 这是纯逻辑简化，不改变对外行为
- 现有配置文件中的 `isConditionalToken` 字段会被忽略（向后兼容）
- 核心条件判断逻辑更严格（空 shown 不匹配），但这是合理的语义

**测试覆盖：**

- 所有现有测试已更新
- 添加了空 shown 的测试用例
- 表单渲染和模板编译都有测试覆盖
