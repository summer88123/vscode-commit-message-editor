import {LitElement, html, css, CSSResult, TemplateResult} from 'lit';
import {customElement, state, query, queryAll} from 'lit/decorators.js';
import {connect} from 'pwa-helpers';
import '@bendera/vscode-webview-elements/dist/vscode-button';
import '@bendera/vscode-webview-elements/dist/vscode-form-container';
import {VscodeFormContainer} from '@bendera/vscode-webview-elements/dist/vscode-form-container';
import {VscodeInputbox} from '@bendera/vscode-webview-elements/dist/vscode-inputbox';
import store, {RootState, DynamicEnumsState} from '../../store/store';
import {
  confirmAmend,
  closeTab,
  copyToSCMInputBox,
  updateTokenValues,
  recentCommitsRequest,
  loadDynamicOptionsStart,
} from '../../store/actions';
import {triggerInputboxRerender} from '../helpers';
import '../cme-repo-selector';
import FormBuilder from './FormBuilder';
import TemplateCompiler from './TemplateCompiler';
import evaluateWhenClause from '../../utils/evaluateWhenClause';
import {CodeEditor} from '../cme-code-editor/cme-code-editor';
import {RepoSelector} from '../cme-repo-selector';
import {getAPI} from '../../utils/VSCodeAPIService';

const vscode = getAPI();

@customElement('cme-form-view')
export class FormView extends connect(store)(LitElement) {
  visibleCallback(): void {
    const inputs = this.shadowRoot?.querySelectorAll(
      'vscode-inputbox[multiline]'
    );

    triggerInputboxRerender(inputs as NodeListOf<VscodeInputbox>);

    const monospaceEditors =
      this.shadowRoot?.querySelectorAll('cme-code-editor');

    if (monospaceEditors?.length) {
      monospaceEditors.forEach((m) => m.connectedCallback());
    }
  }

  @query('#form-container')
  private _formContainer!: VscodeFormContainer;

  @queryAll('cme-code-editor')
  private _codeEditors!: NodeListOf<CodeEditor>;

  @state()
  private _saveAndClose = false;

  @state()
  private _tokens: Token[] = [];

  @state()
  private _amendCbChecked = false;

  @state()
  private _tokenValues: {[name: string]: string | string[]} = {};

  @state()
  private _dynamicTemplate: string[] = [];

  @state()
  private _dynamicEnums: DynamicEnumsState = {};

  @query('#form-view-repo-selector')
  private _repoSelector!: RepoSelector;

  private _reduceEmptyLines = true;

  private _dynamicOptionsLoaded = new Set<string>();

  connectedCallback(): void {
    super.connectedCallback();

    this.updateComplete.then(() => {
      requestAnimationFrame(() => {
        this._updateTokenValues();
      });
    });
  }

  stateChanged(state: RootState): void {
    const {config, tokenValues, dynamicEnums} = state;
    const {view, tokens, dynamicTemplate, reduceEmptyLines} = config;

    this._saveAndClose = view.saveAndClose;
    this._tokens = tokens;
    this._tokenValues = tokenValues;
    this._dynamicTemplate = dynamicTemplate;
    this._reduceEmptyLines = reduceEmptyLines;
    this._dynamicEnums = dynamicEnums;

    // 触发 dynamic-enum tokens 的加载
    this._loadDynamicOptionsIfNeeded();
  }

  private _updateTokenValues() {
    const formData = this._formContainer.data;
    const payload: {[key: string]: string} = {};

    if (this._codeEditors.length > 0) {
      this._codeEditors.forEach((e) => {
        if (e.dataset.name) {
          formData[e.dataset.name] = e.value;
        }
      });
    }

    this._tokens.forEach((t) => {
      const {name, type, separator = ''} = t;
      const rawValue = formData[name];

      switch (type) {
        case 'enum':
        case 'dynamic-enum':
          payload[name] = Array.isArray(rawValue)
            ? rawValue.join(separator)
            : (rawValue || '');
          break;
        case 'text':
          // Handle 'undefined' string from conditional tokens
          payload[name] = (rawValue && rawValue !== 'undefined') ? String(rawValue) : '';
          break;
        case 'boolean':
          if (Array.isArray(rawValue) && rawValue[0]) {
            payload[name] = rawValue[0];
          } else {
            payload[name] = '';
          }
          break;
        default:
      }
    });
    
    // Post-process all conditional tokens after all values are collected
    this._tokens.forEach((t) => {
      if (t.isConditionalToken && t.linkedToken && t.matchValue) {
        const {name} = t;
        // Read linkedToken value from the new payload, not from old state
        const linkedValue = payload[t.linkedToken];
        const conditionMet = evaluateWhenClause(t.matchValue, { value: linkedValue });
        
        if (!conditionMet) {
          // Condition not met: set to 'undefined'
          payload[name] = 'undefined';
        }
        // If condition is met and value is '', keep it as ''
      }
    });

    store.dispatch(updateTokenValues(payload));
  }

  private _handleFormItemChange() {
    this._updateTokenValues();
  }

  private _handleRepositoryChange(ev: CustomEvent<string>) {
    store.dispatch(recentCommitsRequest(ev.detail));
  }

  private _handleSuccessButtonClick() {
    const compiler = new TemplateCompiler(
      this._dynamicTemplate,
      this._tokens,
      this._tokenValues
    );
    compiler.reduceEmptyLines = this._reduceEmptyLines;
    const compiled = compiler.compile();

    const {selectedRepositoryPath} = this._repoSelector;

    if (this._amendCbChecked) {
      store.dispatch(confirmAmend(compiled));
    } else if (this._saveAndClose) {
      store.dispatch(
        copyToSCMInputBox({
          commitMessage: compiled,
          selectedRepositoryPath,
        })
      );
      store.dispatch(closeTab());
    } else {
      store.dispatch(
        copyToSCMInputBox({
          commitMessage: compiled,
          selectedRepositoryPath,
        })
      );
    }
  }

  private _handleCancelButtonClick() {
    store.dispatch(closeTab());
  }

  private _handleCheckBoxChange(ev: CustomEvent) {
    const {checked} = ev.detail;

    this._amendCbChecked = checked;
  }

  private _loadDynamicOptionsIfNeeded() {
    this._tokens.forEach((token) => {
      if (token.type === 'dynamic-enum' && token.provider) {
        const tokenName = token.name;
        
        // 检查是否已经触发过加载
        if (this._dynamicOptionsLoaded.has(tokenName)) {
          return;
        }
        
        // 检查是否已经有状态（正在加载或已加载）
        if (this._dynamicEnums[tokenName]) {
          return;
        }
        
        // 标记为已触发加载
        this._dynamicOptionsLoaded.add(tokenName);
        
        // 发起加载请求
        store.dispatch(loadDynamicOptionsStart({tokenName}));
        
        vscode.postMessage({
          command: 'loadDynamicOptions',
          payload: {
            tokenName,
            providerId: token.provider,
            context: {
              tokenValues: this._tokenValues,
            },
          },
        });
      }
    });
  }

  static get styles(): CSSResult {
    return css`
      .edit-form {
        margin: 0 auto;
      }

      .edit-form vscode-form-container {
        max-width: none;
        width: 100%;
      }

      .edit-form vscode-form-group {
        max-width: none;
        padding-left: 0;
        padding-right: 0;
      }

      .vscode-select {
        display: block;
      }

      cme-code-editor {
        margin-top: 9px;
      }

      .buttons {
        align-items: center;
        display: flex;
        margin-top: 10px;
      }

      .buttons .cb-amend {
        margin-left: 20px;
      }

      .buttons vscode-button {
        margin-right: 10px;
      }
    `;
  }

  render(): TemplateResult {
    const formBuilder = new FormBuilder();

    formBuilder.formItemChangeHandler = this._handleFormItemChange;
    formBuilder.tokens = this._tokens;
    formBuilder.tokenValues = this._tokenValues;
    formBuilder.dynamicEnums = this._dynamicEnums;

    const formElements = formBuilder.build();

    return html`
      <div id="edit-form" class="edit-form">
        <vscode-form-container id="form-container">
          ${formElements}
        </vscode-form-container>
      </div>
      <cme-repo-selector
        id="form-view-repo-selector"
        @cme-change=${this._handleRepositoryChange}
      ></cme-repo-selector>
      <div class="buttons">
        <vscode-button
          id="success-button-form"
          @click="${this._handleSuccessButtonClick}"
          >${this._saveAndClose ? 'Save and close' : 'Save'}</vscode-button
        >
        <vscode-button
          id="cancel-button-form"
          @click="${this._handleCancelButtonClick}"
          secondary
          >Cancel</vscode-button
        >
        <vscode-checkbox
          label="Amend previous commit"
          class="cb-amend"
          id="form-amend-checkbox"
          @vsc-change="${this._handleCheckBoxChange}"
        ></vscode-checkbox>
      </div>
    `;
  }
}
