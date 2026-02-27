# 解耦 linkedToken 与 shown：删除 linkedToken，更新 shown 语义 实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 完全删除 `linkedToken` 字段，将 `shown` 的条件显示逻辑改为从全量 tokenValues 中取上下文，使 `shown` 成为独立的条件显示控制字段。

**Architecture:** 分三层改动——(1) 类型定义层删除字段，(2) 核心逻辑层（FormBuilder/TemplateCompiler）更新求值上下文，(3) UI 编辑组件层删除 linkedToken 下拉框及相关状态。测试同步更新，移除 linkedToken、以 shown 单独驱动条件显示。

**Tech Stack:** TypeScript, Lit, Redux, Mocha/Chai (Web Test Runner)

---

## 新语义总结

| 情况 | 行为 |
|------|------|
| `shown` 不存在（`undefined`） | token 始终显示 |
| `shown` 存在（含空字符串） | 对表达式求值，`true` 显示，`false` 隐藏 |
| `shown` 的求值 context | 来自全量 `tokenValues`（所有 token 的当前值） |

---

### Task 1: 删除 Token 接口中的 linkedToken 字段

**Files:**
- Modify: `frontend/src/global.d.ts:82`

**Step 1: 删除 `linkedToken` 字段**

在 `frontend/src/global.d.ts` 中，将：
```typescript
    linkedToken?: string | string[];
    shown?: string;
```
改为：
```typescript
    shown?: string;
```

**Step 2: 编译检查**

```bash
cd frontend && npm run build:ts 2>&1 | head -50
```

预期：编译报错，显示所有引用了 `linkedToken` 的地方（这是预期的，后续 task 逐一修复）。

---

### Task 2: 更新 TemplateCompiler 逻辑

**Files:**
- Modify: `frontend/src/components/cme-form-view/TemplateCompiler.ts`

**Step 1: 更新 compile() 方法**

将当前的：
```typescript
  compile(): string {
    let compiled = this._template;

    this._tokens.forEach(
      ({name, prefix = '', suffix = '', linkedToken, shown}) => {
        let value = this._tokenValues[name] || '';
        let canShowConditionallyRendered = true;

        if (linkedToken) {
          // shown 为空时，条件不匹配
          if (!shown) {
            canShowConditionallyRendered = false;
          } else {
            // 构建上下文：收集所有 linkedToken 的值
            const context: Record<string, string | string[]> = {};
            const tokens = Array.isArray(linkedToken)
              ? linkedToken
              : [linkedToken];

            tokens.forEach((tokenName) => {
              context[tokenName] = this._tokenValues[tokenName] || '';
            });

            canShowConditionallyRendered = evaluateWhenClause(shown, context);
          }
        }

        value =
          value && canShowConditionallyRendered ? prefix + value + suffix : '';
        compiled = compiled.replace(new RegExp(`{${name}}`, 'g'), value);
      }
    );
```

改为：
```typescript
  compile(): string {
    let compiled = this._template;

    this._tokens.forEach(({name, prefix = '', suffix = '', shown}) => {
      let value = this._tokenValues[name] || '';
      let canShowConditionallyRendered = true;

      if (shown !== undefined) {
        canShowConditionallyRendered = evaluateWhenClause(
          shown,
          this._tokenValues
        );
      }

      value =
        value && canShowConditionallyRendered ? prefix + value + suffix : '';
      compiled = compiled.replace(new RegExp(`{${name}}`, 'g'), value);
    });
```

**Step 2: 编译检查**

```bash
cd frontend && npm run build:ts 2>&1 | grep "TemplateCompiler"
```

预期：TemplateCompiler 相关错误消失。

---

### Task 3: 更新 FormBuilder 逻辑

**Files:**
- Modify: `frontend/src/components/cme-form-view/FormBuilder.ts`

**Step 1: 更新 build() 方法中的条件显示逻辑**

将当前的：
```typescript
  build(): TemplateResult[] {
    const formElements = this._tokens.map((token) => {
      if (token.linkedToken) {
        // shown 为空时，token 不显示
        if (!token.shown) {
          return html`${nothing}`;
        }

        // 构建上下文：收集所有 linkedToken 的值
        const context: Record<string, string | string[]> = {};
        const tokens = Array.isArray(token.linkedToken)
          ? token.linkedToken
          : [token.linkedToken];

        tokens.forEach((tokenName) => {
          context[tokenName] = this.tokenValues?.[tokenName] || '';
        });

        if (!evaluateWhenClause(token.shown, context)) {
          return html`${nothing}`;
        }
      }
```

改为：
```typescript
  build(): TemplateResult[] {
    const formElements = this._tokens.map((token) => {
      if (token.shown !== undefined) {
        if (!evaluateWhenClause(token.shown, this._tokenValues)) {
          return html`${nothing}`;
        }
      }
```

**Step 2: 编译检查**

```bash
cd frontend && npm run build:ts 2>&1 | grep "FormBuilder"
```

预期：FormBuilder 相关错误消失。

---

### Task 4: 更新 cme-token-item-edit 组件

**Files:**
- Modify: `frontend/src/components/cme-token-item-edit/cme-token-item-edit.ts`

**Step 1: 删除 import 中不再需要的 vscode-multi-select 和 vscode-option**

检查这两个 import 是否仅用于 linkedToken 下拉框，若是则删除：
```typescript
// 删除这两行（如果只用于 linkedToken）：
import '@bendera/vscode-webview-elements/dist/vscode-multi-select';
import '@bendera/vscode-webview-elements/dist/vscode-option';
```

注意：先确认这两个组件是否在其他地方使用，若有其他用途则保留。

**Step 2: 从 token setter 中删除 linkedToken**

将：
```typescript
    const {
      label,
      name,
      type,
      description,
      prefix,
      suffix,
      maxLength,
      maxLines,
      maxLineLength,
      multiline,
      monospace,
      multiple,
      separator,
      combobox,
      options,
      lines,
      value,
      linkedToken,
      shown,
    } = val;
    // ...
    this._linkedToken = linkedToken;
    this._shown = shown ?? '';
```

改为：
```typescript
    const {
      label,
      name,
      type,
      description,
      prefix,
      suffix,
      maxLength,
      maxLines,
      maxLineLength,
      multiline,
      monospace,
      multiple,
      separator,
      combobox,
      options,
      lines,
      value,
      shown,
    } = val;
    // ...
    this._shown = shown ?? '';
```

**Step 3: 从 token getter 中删除 linkedToken 相关逻辑**

将：
```typescript
    if (
      this._linkedToken &&
      (Array.isArray(this._linkedToken) ? this._linkedToken.length > 0 : true)
    ) {
      retval.linkedToken = this._linkedToken;
      retval.shown = this._shown;
    }
```

改为（`shown` 始终写入，只要有值）：
```typescript
    if (this._shown.length > 0) {
      retval.shown = this._shown;
    }
```

**Step 4: 删除 `_linkedToken` 状态和 `tokenOptions` getter**

删除：
```typescript
  @state()
  private _linkedToken?: string | string[];

  get tokenOptions() {
    return this.tokens?.filter((t) => t.name !== this._name) ?? [];
  }
```

**Step 5: 删除 `_onLinkedTokenChange` 事件处理器**

删除：
```typescript
  private _onLinkedTokenChange(ev: CustomEvent) {
    const val = ev.detail.value as string | string[];

    this._linkedToken = val;
    this._shown = '';
  }
```

**Step 6: 更新 render() 方法**

删除 `linkedTokenWidget` 的定义（第 686–709 行），以及修改 `_shownWidget` 的可见性逻辑：

将：
```typescript
    const _shownWidget = !this._linkedToken ? nothing : shownTextWidget;
```

改为（shown 始终显示）：
```typescript
    const _shownWidget = shownTextWidget;
```

并从 `activeView` 的模板中删除 `${linkedTokenWidget}`：
```typescript
          ${nameWidget} ${labelWidget} ${valueWidget} ${typeWidget}
          ${descriptionWidget} ${prefixWidget} ${suffixWidget}
          ${multilineWidget} ${monospaceWidget} ${linesWidget} ${maxLinesWidget}
          ${maxLengthWidget} ${maxLineLengthWidget} ${multipleWidget}
          ${separatorWidget} ${comboboxWidget} ${optionsWidget}
          ${_shownWidget}
```

**Step 7: 检查 `tokens` 属性是否还有其他用途**

若 `tokens` 属性只用于 `tokenOptions`（linkedToken 下拉框的选项来源），则也可删除该属性。检查 `tokens` 的其他引用，若无则删除：
```typescript
  @property({type: Array})
  tokens: Token[] = [];
```

**Step 8: 编译检查**

```bash
cd frontend && npm run build:ts 2>&1
```

预期：无错误。

---

### Task 5: 更新 TemplateCompiler 测试

**Files:**
- Modify: `frontend/src/test/components/cme-form-view/TemplateCompiler.test.ts`

**变更原则：**
- 删除所有测试数据中的 `linkedToken` 字段
- 测试逻辑不变（`shown` 仍然控制条件显示）
- 更新用于过滤的 `.filter((t) => !t.linkedToken)` 逻辑（改为其他过滤条件或直接重写）

**Step 1: 更新 createTokens() 中的条件 token 数据**

将：
```typescript
    {
      label: 'Root cause',
      name: 'root_cause',
      prefix: 'Root cause: ',
      type: 'text',
      linkedToken: 'issue_type',
      shown: "issue_type == 'bug'",
    },
    {
      label: 'Fix',
      name: 'fix',
      prefix: 'Fix: ',
      type: 'text',
      linkedToken: 'issue_type',
      shown: "issue_type == 'bug'",
    },
```

改为：
```typescript
    {
      label: 'Root cause',
      name: 'root_cause',
      prefix: 'Root cause: ',
      type: 'text',
      shown: "issue_type == 'bug'",
    },
    {
      label: 'Fix',
      name: 'fix',
      prefix: 'Fix: ',
      type: 'text',
      shown: "issue_type == 'bug'",
    },
```

**Step 2: 更新 "conditional fields with expression" 测试（第 207–257 行）**

将过滤逻辑：
```typescript
      const tokens: Token[] = [
        ...createTokens().filter((t) => !t.linkedToken),
        issueTypeToken,
        {
          label: 'Root cause',
          name: 'root_cause',
          prefix: 'Root cause: ',
          type: 'text',
          linkedToken: 'issue_type',
          shown: "issue_type == 'bug'",
        },
      ];
```

改为：
```typescript
      const tokens: Token[] = [
        ...createTokens().filter((t) => !t.shown),
        issueTypeToken,
        {
          label: 'Root cause',
          name: 'root_cause',
          prefix: 'Root cause: ',
          type: 'text',
          shown: "issue_type == 'bug'",
        },
      ];
```

**Step 3: 更新 "empty shown" 测试（第 337–371 行）**

将：
```typescript
      {
        label: 'Conditional field',
        name: 'conditional_field',
        type: 'text',
        linkedToken: 'type',
        shown: '',
      },
```

改为：
```typescript
      {
        label: 'Conditional field',
        name: 'conditional_field',
        type: 'text',
        shown: '',
      },
```

**Step 4: 更新 "undefined shown" 测试（第 373–407 行）**

将：
```typescript
      {
        label: 'Conditional field',
        name: 'conditional_field',
        type: 'text',
        linkedToken: 'type',
        // shown is undefined
      },
```

改为（无需修改，`linkedToken` 字段已不存在于接口，但可保留注释）：
```typescript
      {
        label: 'Conditional field',
        name: 'conditional_field',
        type: 'text',
        // shown is undefined - token should always be visible
      },
```

注意：此测试用例名称需要更新，因为"undefined shown"现在代表"始终显示"，而非"不显示"。

**Step 5: 重写 "undefined shown" 测试为两个测试**

旧测试：`shown` 为 `undefined` 时不渲染（依赖 `linkedToken` 的存在才触发条件逻辑）

新逻辑：`shown` 为 `undefined` 时始终显示；`shown` 为空字符串时表达式求值为 `false` 不显示

将此测试更新为：
```typescript
  it('conditional token without shown should always render', () => {
    const template = ['{type}: {description}', '', '{always_visible}'];
    const tokens: Token[] = [
      {
        label: 'Type',
        name: 'type',
        type: 'text',
      },
      {
        label: 'Description',
        name: 'description',
        type: 'text',
      },
      {
        label: 'Always visible',
        name: 'always_visible',
        type: 'text',
        // shown is undefined - should always render
      },
    ];
    const tokenValues = {
      type: 'feat',
      description: 'test description',
      always_visible: 'I should appear',
    };

    const compiler = new TemplateCompiler(template, tokens, tokenValues);
    const result = compiler.compile();

    let expected = '';
    expected += 'feat: test description\n';
    expected += '\n';
    expected += 'I should appear';

    expect(result).to.eq(expected);
  });
```

**Step 6: 更新两个 multiple linkedTokens 测试（第 409–509 行）**

将所有 `linkedToken: ['issue', 'type']` 删除：
```typescript
      {
        label: 'Conditional field',
        name: 'conditional_field',
        type: 'text',
        shown: "issue =~ /客户反馈/ && type == 'fix'",
      },
```

**Step 7: 运行测试**

```bash
cd frontend && npm run build:ts && npm run test 2>&1 | tail -30
```

预期：TemplateCompiler 相关测试全部通过。

---

### Task 6: 更新 cme-form-view 测试

**Files:**
- Modify: `frontend/src/test/components/cme-form-view/cme-form-view.test.ts`

**Step 1: 删除测试数据中的 linkedToken**

将：
```typescript
      {
        label: 'Root cause',
        name: 'root_cause',
        prefix: 'Root cause: ',
        type: 'text',
        linkedToken: 'issue_type',
        shown: "issue_type == 'bug'",
      },
      {
        label: 'Fix',
        name: 'fix',
        prefix: 'Fix: ',
        type: 'text',
        linkedToken: 'issue_type',
        shown: "issue_type == 'bug'",
      },
```

改为：
```typescript
      {
        label: 'Root cause',
        name: 'root_cause',
        prefix: 'Root cause: ',
        type: 'text',
        shown: "issue_type == 'bug'",
      },
      {
        label: 'Fix',
        name: 'fix',
        prefix: 'Fix: ',
        type: 'text',
        shown: "issue_type == 'bug'",
      },
```

**Step 2: 运行测试**

```bash
cd frontend && npm run test 2>&1 | grep -A5 "cme-form-view"
```

---

### Task 7: 更新 cme-token-item-edit 测试

**Files:**
- Modify: `frontend/src/test/components/cme-token-item-edit/cme-token-item-edit.test.ts`

**Step 1: 重写 "conditional tokens" describe 块**

旧测试依赖 linkedToken 下拉框交互，新测试改为直接测试 `shown` 输入框：

将整个 `describe('conditional tokens', ...)` 块（第 218–367 行）替换为：

```typescript
  describe('shown field', () => {
    it('should always render the shown input box', async () => {
      const el = (await fixture(
        html`<cme-token-item-edit></cme-token-item-edit>`
      )) as TokenItemEdit;

      el.active = true;
      await el.updateComplete;

      expect(el.shadowRoot?.getElementById('shown')).to.exist;
    });

    it('should properly update shown field', async () => {
      const el = (await fixture(
        html`<cme-token-item-edit></cme-token-item-edit>`
      )) as TokenItemEdit;

      el.active = true;
      await el.updateComplete;

      const shown = el.shadowRoot?.getElementById('shown');
      shown?.dispatchEvent(
        new CustomEvent('vsc-input', {detail: "type == 'feat'"})
      );

      await el.updateComplete;

      expect(el.token.shown).to.eq("type == 'feat'");
    });

    it('should not include shown in token output when input is empty', async () => {
      const el = (await fixture(
        html`<cme-token-item-edit></cme-token-item-edit>`
      )) as TokenItemEdit;

      el.active = true;
      await el.updateComplete;

      expect(el.token.shown).to.be.undefined;
    });

    it('should initialize shown from token property', async () => {
      const el = (await fixture(
        html`<cme-token-item-edit></cme-token-item-edit>`
      )) as TokenItemEdit;

      el.active = true;
      el.token = {
        ...el.token,
        shown: "type == 'fix'",
      };

      await el.updateComplete;

      const shownInput = el.shadowRoot?.getElementById('shown') as any;
      expect(shownInput?.value).to.eq("type == 'fix'");
    });

    it('should render helper text with expression examples', async () => {
      const el = (await fixture(
        html`<cme-token-item-edit></cme-token-item-edit>`
      )) as TokenItemEdit;

      el.active = true;
      await el.updateComplete;

      const shownInput = el.shadowRoot?.getElementById('shown');
      const helperText = shownInput?.nextElementSibling;
      expect(helperText?.tagName.toLowerCase()).to.eq('p');
      expect(helperText?.textContent).to.include('Examples:');
    });
  });
```

**Step 2: 运行测试**

```bash
cd frontend && npm run test 2>&1 | tail -40
```

预期：所有测试通过。

---

### Task 8: 更新 README 文档

**Files:**
- Modify: `README.md`

**Step 1: 找到并更新 token 属性表**

删除 `linkedToken` 行，更新 `shown` 的说明：

旧说明：
```
| linkedToken | string \| string[] | optional | 关联的 token 名称，设置后该 token 变为条件 token |
| shown | string | optional | 条件表达式，仅在 linkedToken 存在且此表达式为 true 时显示 |
```

新说明：
```
| shown | string | optional | 条件显示表达式。不存在时始终显示；存在时，表达式为 true 才显示。可引用任意其他 token 的值 |
```

**Step 2: 更新 shown 字段的详细说明**

删除原本说明 `linkedToken` 为前提的段落，更新为：

```markdown
### shown 条件表达式

`shown` 字段控制 token 是否在表单中显示：

- **不设置 `shown`**：token 始终显示
- **设置 `shown`**：对表达式求值，`true` 则显示，`false` 则隐藏

表达式中可以直接引用其他任意 token 的名称作为变量：

```json
{
  "tokens": [
    { "name": "type", "type": "enum", ... },
    { "name": "root_cause", "type": "text", "shown": "type == 'fix'" }
  ]
}
```

支持的操作符：

| 操作符 | 说明 | 示例 |
|--------|------|------|
| `==` | 等于 | `type == 'feat'` |
| `!=` | 不等于 | `type != 'chore'` |
| `&&` | 逻辑与 | `type == 'fix' && scope != ''` |
| `\|\|` | 逻辑或 | `type == 'fix' \|\| type == 'hotfix'` |
| `!` | 逻辑非 | `!type == 'chore'` |
| `in` | 集合检查 | `type in ['fix', 'hotfix']` |
| `=~` | 正则匹配 | `scope =~ /^feat/` |
```

---

### Task 9: 全量编译和测试验证

**Step 1: 全量编译**

```bash
cd frontend && npm run build:ts && npm run build:bundle
```

预期：无错误。

**Step 2: 运行全部前端测试**

```bash
cd frontend && npm run test
```

预期：全部通过。

**Step 3: 提交**

```bash
git add -A && git commit -m "refactor: 删除 linkedToken，shown 独立控制条件显示（context 来自全量 tokenValues）"
```
