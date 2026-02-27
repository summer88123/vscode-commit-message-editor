import {TokenValueDTO} from './types';
import evaluateWhenClause from '../../utils/evaluateWhenClause';

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

    this._tokens.forEach(({ name, prefix = '', suffix = '', isConditionalToken, linkedToken, matchValue }) => {
      let value = this._tokenValues[name] || '';
      let canShowConditionallyRendered = true;
      
      if (isConditionalToken && linkedToken && matchValue) {
        const linkedValue = this._tokenValues[linkedToken];
        canShowConditionallyRendered = evaluateWhenClause(matchValue, { value: linkedValue });
      }
      
      value = value && canShowConditionallyRendered ? prefix + value + suffix : '';
      compiled = compiled.replace(new RegExp(`{${name}}`, 'g'), value);
    });

    if (this._reduceEmptyLines) {
      compiled = compiled.replace(/\n{3,}/g, '\n\n');
      compiled = compiled.replace(/\n+$/g, '');
    }

    return compiled;
  }
}

export default TemplateCompiler;
