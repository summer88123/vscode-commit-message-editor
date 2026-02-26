import {html, TemplateResult, nothing} from 'lit';
import {ifDefined} from 'lit/directives/if-defined.js';
import '@bendera/vscode-webview-elements/dist/vscode-checkbox';
import '@bendera/vscode-webview-elements/dist/vscode-form-group';
import '@bendera/vscode-webview-elements/dist/vscode-form-helper';
import '@bendera/vscode-webview-elements/dist/vscode-inputbox';
import '@bendera/vscode-webview-elements/dist/vscode-label';
import '@bendera/vscode-webview-elements/dist/vscode-multi-select';
import '@bendera/vscode-webview-elements/dist/vscode-option';
import '@bendera/vscode-webview-elements/dist/vscode-single-select';
import noop from '../../utils/noop';
import type {DynamicEnumsState} from '../../store/store';

class FormBuilder {
  set tokens(val: Token[]) {
    this._tokens = val;
  }

  get tokens(): Token[] {
    return this._tokens;
  }

  set tokenValues(val: { [name: string]: string | string[] }) {
    this._tokenValues = val;
  }

  get tokenValues(): { [name: string]: string | string[] } {
    return this._tokenValues;
  }

  set dynamicEnums(val: DynamicEnumsState) {
    this._dynamicEnums = val;
  }

  get dynamicEnums(): DynamicEnumsState {
    return this._dynamicEnums;
  }

  set formItemChangeHandler(fn: () => void) {
    this._handleFormItemChange = fn;
  }

  build(): TemplateResult[] {
    const formElements = this._tokens.map((token) => {
      if (token.isConditionalToken && token.linkedToken && token.matchValue && this.tokenValues?.[token.linkedToken.name] !== token.matchValue) {
        return html`${nothing}`;
      }
      switch (token.type) {
        case 'enum':
          return this._renderEnumTypeWidget(token);
        case 'dynamic-enum':
          return this._renderDynamicEnumTypeWidget(token);
        case 'text':
          return this._renderTextTypeWidget(token);
        case 'boolean':
          return this._renderBooleanTypeWidget(token);
        default:
          return html`${nothing}`;
      }
    });

    return formElements;
  }

  private _tokens: Token[] = [];

  private _tokenValues: { [name: string]: string | string[] } = {};

  private _dynamicEnums: DynamicEnumsState = {};

  private _handleFormItemChange: () => void = noop;

  private _renderFormItem(
    widget: TemplateResult,
    label: string,
    description = ''
  ) {
    let desc: TemplateResult = html`${nothing}`;

    if (description) {
      desc = html`<vscode-form-helper>${description}</vscode-form-helper>`;
    }

    return html`
      <vscode-form-group variant="settings-group">
        <vscode-label>${label}</vscode-label>
        ${desc} ${widget}
      </vscode-form-group>
    `;
  }

  private _renderEnumTypeWidget(token: Token) {
    const {description, label, name, multiple, combobox} = token;
    const selectComboboxMode = combobox || false;

    const options = token.options?.map((op) => {
      const {label, value, description} = op;

      return html`
        <vscode-option
          value="${ifDefined(value)}"
          description="${ifDefined(description)}"
          >${label}</vscode-option
        >
      `;
    });

    const select = multiple
      ? html`
          <vscode-multi-select
            name="${name}"
            @vsc-change="${this._handleFormItemChange}"
            .combobox="${selectComboboxMode}"
            class="vscode-select"
            >${options}</vscode-multi-select
          >
        `
      : html`
          <vscode-single-select
            data-name="${name}"
            name="${name}"
            @vsc-change="${this._handleFormItemChange}"
            .combobox="${selectComboboxMode}"
            class="vscode-select"
            >${options}</vscode-single-select
          >
        `;

    return this._renderFormItem(select, label, description);
  }

  private _renderDynamicEnumTypeWidget(token: Token) {
    const {description, label, name} = token;
    const dynamicState = this._dynamicEnums[token.name];

    // 如果正在加载，显示加载状态
    if (dynamicState?.loading) {
      const loadingWidget = html`
        <div style="padding: 8px; color: var(--vscode-descriptionForeground);">
          正在加载选项...
        </div>
      `;
      return this._renderFormItem(loadingWidget, label, description);
    }

    // 如果加载失败，显示错误和 fallback 输入框
    if (dynamicState?.error) {
      const errorWidget = html`
        <div>
          <div style="color: var(--vscode-errorForeground); margin-bottom: 8px;">
            ${dynamicState.error}
          </div>
          <vscode-inputbox
            data-name="${name}"
            name="${name}"
            @vsc-change="${this._handleFormItemChange}"
            placeholder="手动输入..."
            style="width: 100%;"
          ></vscode-inputbox>
        </div>
      `;
      return this._renderFormItem(errorWidget, label, description);
    }

    // 如果有动态加载的选项，使用它们
    if (dynamicState?.options && dynamicState.options.length > 0) {
      const tokenWithOptions = {...token, options: dynamicState.options};
      return this._renderEnumTypeWidget(tokenWithOptions);
    }

    // 如果有静态 options，显示它们（向后兼容）
    if (token.options && token.options.length > 0) {
      return this._renderEnumTypeWidget(token);
    }

    // Fallback：显示普通输入框
    const inputbox = html`
      <vscode-inputbox
        data-name="${name}"
        name="${name}"
        @vsc-change="${this._handleFormItemChange}"
        placeholder="等待选项加载或手动输入..."
        style="width: 100%;"
      ></vscode-inputbox>
    `;

    return this._renderFormItem(inputbox, label, description);
  }

  private _renderTextTypeWidget(token: Token) {
    const {
      description,
      label,
      multiline,
      monospace,
      name,
      lines,
      maxLines,
      maxLength,
      maxLineLength,
    } = token;
    let inputbox: TemplateResult;

    if (multiline && monospace) {
      inputbox = html`
        <cme-code-editor
          data-name="${name}"
          name="${name}"
          @vsc-change="${this._handleFormItemChange}"
          lines="${ifDefined(lines)}"
          .rulers=${maxLineLength ? [maxLineLength] : []}
        ></cme-code-editor>
      `;
    } else {
      inputbox = html`
        <vscode-inputbox
          data-name="${name}"
          name="${name}"
          ?multiline="${multiline}"
          @vsc-change="${this._handleFormItemChange}"
          lines="${ifDefined(lines)}"
          maxLines="${ifDefined(maxLines)}"
          maxLength="${ifDefined(maxLength)}"
          style="width: 100%;"
        ></vscode-inputbox>
      `;
    }

    return this._renderFormItem(inputbox, label, description);
  }

  private _renderBooleanTypeWidget(token: Token) {
    const {description, label, name, value} = token;

    const checkbox = html`
      <vscode-checkbox
        data-name="${name}"
        name="${name}"
        label="${label}"
        value="${ifDefined(value)}"
        @vsc-change="${this._handleFormItemChange}"
      ></vscode-checkbox>
    `;

    return this._renderFormItem(checkbox, label, description);
  }
}

export default FormBuilder;
