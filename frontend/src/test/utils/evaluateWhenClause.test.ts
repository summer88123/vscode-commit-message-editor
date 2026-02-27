import {expect} from '@esm-bundle/chai';
import evaluateWhenClause from '../../utils/evaluateWhenClause';

describe('evaluateWhenClause', () => {
  it('supports comparisons and logic', () => {
    expect(evaluateWhenClause("value == 'bug' && value != 'task'", {value: 'bug'})).to.equal(true);
  });

  it('supports in operator', () => {
    expect(evaluateWhenClause("value in ['bug','task']", {value: 'task'})).to.equal(true);
  });

  it('supports regex', () => {
    expect(evaluateWhenClause('value =~ /fix/i', {value: 'HotFix'})).to.equal(true);
  });

  it('returns false on invalid expression', () => {
    expect(evaluateWhenClause('value ==', {value: 'bug'})).to.equal(false);
  });
});
