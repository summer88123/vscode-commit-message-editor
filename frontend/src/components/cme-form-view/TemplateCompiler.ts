import evaluateWhenClause from '../../utils/evaluateWhenClause';
import {TokenValueDTO} from './types';

class TemplateCompiler {
  private _template = '';
  private _tokens: Token[] = [];
  private _tokenValues: TokenValueDTO = {};
  private _reduceEmptyLines = true;

  constructor(template: string[], tokens: Token[], tokenValues: TokenValueDTO) {
    this._template = template.join('\n');
    this._tokens = tokens;
    this._tokenValues = tokenValues;
  }

  set reduceEmptyLines(val: boolean) {
    this._reduceEmptyLines = val;
  }

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

    if (this._reduceEmptyLines) {
      compiled = compiled.replace(/\n{3,}/g, '\n\n');
      compiled = compiled.replace(/\n+$/g, '');
    }

    return compiled;
  }
}

export default TemplateCompiler;
