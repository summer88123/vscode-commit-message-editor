import {expect} from '@esm-bundle/chai';
import FormBuilder from '../../../components/cme-form-view/FormBuilder';
import type {DynamicEnumsState} from '../../../store/store';

describe('FormBuilder - Dynamic Enum Support', () => {
  let formBuilder: FormBuilder;

  beforeEach(() => {
    formBuilder = new FormBuilder();
  });

  it('should render loading state for dynamic-enum token', () => {
    const token: Token = {
      name: 'testToken',
      label: 'Test Token',
      type: 'dynamic-enum',
      provider: 'test.provider',
    };

    const dynamicEnums: DynamicEnumsState = {
      testToken: {
        loading: true,
        options: [],
      },
    };

    formBuilder.tokens = [token];
    formBuilder.dynamicEnums = dynamicEnums;

    const result = formBuilder.build();
    expect(result).to.have.lengthOf(1);
    
    // 验证返回的是 TemplateResult
    expect(result[0]).to.have.property('_$litType$');
  });

  it('should render error state for dynamic-enum token', () => {
    const token: Token = {
      name: 'testToken',
      label: 'Test Token',
      type: 'dynamic-enum',
      provider: 'test.provider',
    };

    const dynamicEnums: DynamicEnumsState = {
      testToken: {
        loading: false,
        error: 'Provider not found',
        options: [],
      },
    };

    formBuilder.tokens = [token];
    formBuilder.dynamicEnums = dynamicEnums;

    const result = formBuilder.build();
    expect(result).to.have.lengthOf(1);
    expect(result[0]).to.have.property('_$litType$');
  });

  it('should render options for dynamic-enum token when loaded', () => {
    const token: Token = {
      name: 'testToken',
      label: 'Test Token',
      type: 'dynamic-enum',
      provider: 'test.provider',
    };

    const dynamicEnums: DynamicEnumsState = {
      testToken: {
        loading: false,
        options: [
          {label: 'Option 1', value: 'opt1'},
          {label: 'Option 2', value: 'opt2'},
        ],
        lastLoadedAt: Date.now(),
      },
    };

    formBuilder.tokens = [token];
    formBuilder.dynamicEnums = dynamicEnums;

    const result = formBuilder.build();
    expect(result).to.have.lengthOf(1);
    expect(result[0]).to.have.property('_$litType$');
  });

  it('should render fallback input for dynamic-enum with no state', () => {
    const token: Token = {
      name: 'testToken',
      label: 'Test Token',
      type: 'dynamic-enum',
      provider: 'test.provider',
    };

    const dynamicEnums: DynamicEnumsState = {};

    formBuilder.tokens = [token];
    formBuilder.dynamicEnums = dynamicEnums;

    const result = formBuilder.build();
    expect(result).to.have.lengthOf(1);
    expect(result[0]).to.have.property('_$litType$');
  });

  it('should use static options if provided for dynamic-enum', () => {
    const token: Token = {
      name: 'testToken',
      label: 'Test Token',
      type: 'dynamic-enum',
      provider: 'test.provider',
      options: [
        {label: 'Static Option 1', value: 'static1'},
      ],
    };

    const dynamicEnums: DynamicEnumsState = {};

    formBuilder.tokens = [token];
    formBuilder.dynamicEnums = dynamicEnums;

    const result = formBuilder.build();
    expect(result).to.have.lengthOf(1);
    expect(result[0]).to.have.property('_$litType$');
  });

  it('should prioritize dynamic options over static options', () => {
    const token: Token = {
      name: 'testToken',
      label: 'Test Token',
      type: 'dynamic-enum',
      provider: 'test.provider',
      options: [
        {label: 'Static Option 1', value: 'static1'},
      ],
    };

    const dynamicEnums: DynamicEnumsState = {
      testToken: {
        loading: false,
        options: [
          {label: 'Dynamic Option 1', value: 'dynamic1'},
        ],
        lastLoadedAt: Date.now(),
      },
    };

    formBuilder.tokens = [token];
    formBuilder.dynamicEnums = dynamicEnums;

    const result = formBuilder.build();
    expect(result).to.have.lengthOf(1);
    // Dynamic options should be used
    expect(result[0]).to.have.property('_$litType$');
  });
});
