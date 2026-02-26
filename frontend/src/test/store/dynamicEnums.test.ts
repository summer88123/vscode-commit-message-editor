import {expect} from '@esm-bundle/chai';
import {rootReducer, createInitialState} from '../../store/reducers';
import {
  loadDynamicOptionsStart,
  loadDynamicOptionsSuccess,
  loadDynamicOptionsFailure,
  clearDynamicOptions,
  clearAllDynamicOptions,
} from '../../store/actions';

describe('Dynamic Enums Reducers', () => {
  it('should handle loadDynamicOptionsStart', () => {
    const initialState = createInitialState();
    const action = loadDynamicOptionsStart({tokenName: 'testToken'});
    const newState = rootReducer(initialState, action);

    expect(newState.dynamicEnums.testToken).to.deep.equal({
      loading: true,
      options: [],
    });
  });

  it('should handle loadDynamicOptionsSuccess', () => {
    const initialState = createInitialState();
    initialState.dynamicEnums.testToken = {
      loading: true,
      options: [],
    };

    const options = [
      {label: 'Option 1', value: 'opt1'},
      {label: 'Option 2', value: 'opt2'},
    ];
    const action = loadDynamicOptionsSuccess({tokenName: 'testToken', options});
    const newState = rootReducer(initialState, action);

    expect(newState.dynamicEnums.testToken.loading).to.equal(false);
    expect(newState.dynamicEnums.testToken.options).to.deep.equal(options);
    expect(newState.dynamicEnums.testToken.lastLoadedAt).to.be.a('number');
  });

  it('should handle loadDynamicOptionsFailure', () => {
    const initialState = createInitialState();
    initialState.dynamicEnums.testToken = {
      loading: true,
      options: [],
    };

    const action = loadDynamicOptionsFailure({
      tokenName: 'testToken',
      error: 'Provider not found',
    });
    const newState = rootReducer(initialState, action);

    expect(newState.dynamicEnums.testToken.loading).to.equal(false);
    expect(newState.dynamicEnums.testToken.error).to.equal('Provider not found');
    expect(newState.dynamicEnums.testToken.options).to.deep.equal([]);
  });

  it('should handle clearDynamicOptions', () => {
    const initialState = createInitialState();
    initialState.dynamicEnums.testToken = {
      loading: false,
      options: [{label: 'Option 1', value: 'opt1'}],
    };

    const action = clearDynamicOptions({tokenName: 'testToken'});
    const newState = rootReducer(initialState, action);

    expect(newState.dynamicEnums.testToken).to.be.undefined;
  });

  it('should handle clearAllDynamicOptions', () => {
    const initialState = createInitialState();
    initialState.dynamicEnums.token1 = {
      loading: false,
      options: [{label: 'Option 1'}],
    };
    initialState.dynamicEnums.token2 = {
      loading: false,
      options: [{label: 'Option 2'}],
    };

    const action = clearAllDynamicOptions();
    const newState = rootReducer(initialState, action);

    expect(newState.dynamicEnums).to.deep.equal({});
  });
});
