import {expect} from '@open-wc/testing';
import TemplateCompiler from '../../../components/cme-form-view/TemplateCompiler';
import {TokenValueDTO} from '../../../components/cme-form-view/types';

const createTemplate = () => [
  '{type}{scope}: {description}',
  '',
  '{body}',
  '',
  '{root_cause}',
  '',
  '{fix}',
  '',
  '{breaking_change}{footer}',
];

const createTokens = (): Token[] => {
  const issueTypeToken: Token = {
    label: 'Issue type',
    name: 'issue_type',
    type: 'enum',
    options: [
      {
        label: 'bug',
      },
      {
        label: 'feature',
      },
    ]
  };
  return [
    {
      label: 'Type',
      name: 'type',
      type: 'enum',
      options: [
        {
          label: '---',
          value: '',
        },
        {
          label: 'build',
          description:
            'Changes that affect the build system or external dependencies (example scopes: gulp, broccoli, npm)',
        },
        {
          label: 'chore',
          description: 'Updating grunt tasks etc; no production code change',
        },
        {
          label: 'ci',
          description:
            'Changes to our CI configuration files and scripts (example scopes: Travis, Circle, BrowserStack, SauceLabs)',
        },
        {
          label: 'docs',
          description: 'Documentation only changes',
        },
        {
          label: 'feat',
          description: 'A new feature',
        },
        {
          label: 'fix',
          description: 'A bug fix',
        },
        {
          label: 'perf',
          description: 'A code change that improves performance',
        },
        {
          label: 'refactor',
          description:
            'A code change that neither fixes a bug nor adds a feature',
        },
        {
          label: 'revert',
        },
        {
          label: 'style',
          description:
            'Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)',
        },
        {
          label: 'test',
          description: 'Adding missing tests or correcting existing tests',
        },
      ],
      description: 'Type of changes',
    },
    {
      label: 'Scope',
      name: 'scope',
      description:
        'A scope may be provided to a commit’s type, to provide additional contextual information and is contained within parenthesis, e.g., "feat(parser): add ability to parse arrays".',
      type: 'text',
      multiline: false,
      prefix: '(',
      suffix: ')',
    },
    {
      label: 'Short description',
      name: 'description',
      description: 'Short description in the subject line.',
      type: 'text',
      multiline: false,
    },
    {
      label: 'Body',
      name: 'body',
      description: 'Optional body',
      type: 'text',
      multiline: true,
      lines: 5,
      maxLines: 10,
    },
    {
      label: 'Breaking change',
      name: 'breaking_change',
      type: 'boolean',
      value: 'BREAKING CHANGE: ',
    },
    {
      label: 'Footer',
      name: 'footer',
      description: 'Optional footer',
      type: 'text',
      multiline: true,
    },
    issueTypeToken,
    {
      label: 'Root cause',
      name: 'root_cause',
      prefix: 'Root cause: ',
      type: 'text',
      linkedToken: 'issue_type',
      matchValue: "issue_type == 'bug'",
    },
    {
      label: 'Fix',
      name: 'fix',
      prefix: 'Fix: ',
      type: 'text',
      linkedToken: 'issue_type',
      matchValue: "issue_type == 'bug'",
    },
  ]
};

const createTokenValues = (): TokenValueDTO => ({
  type: 'feat',
  scope: 'lorem|ipsum',
  description: 'test description',
  body: 'Test body',
  breaking_change: 'BREAKING CHANGE: ',
  issue_type: 'story',
  root_cause: 'I\'m an idiot',
  fix: 'Increased intelluct'
});

describe('TemplateCompiler', () => {
  it('template should be comiled', () => {
    const template = createTemplate();
    const tokens = createTokens();
    const tokenValues = createTokenValues();

    const compiler = new TemplateCompiler(template, tokens, tokenValues);
    const result = compiler.compile();

    let expected = '';

    expected += 'feat(lorem|ipsum): test description\n';
    expected += '\n';
    expected += 'Test body\n';
    expected += '\n';
    expected += 'BREAKING CHANGE: ';

    expect(result).to.eq(expected);
  });

  it('conditional fields should be rendered', () => {
    const template = createTemplate();
    const tokens = createTokens();
    const tokenValues = {
      ...createTokenValues(),
      issue_type: 'bug',
    }

    const compiler = new TemplateCompiler(template, tokens, tokenValues);
    const result = compiler.compile();

    let expected = '';

    expected += 'feat(lorem|ipsum): test description\n';
    expected += '\n';
    expected += 'Test body\n';
    expected += '\n';
    expected += 'Root cause: I\'m an idiot\n';
    expected += '\n';
    expected += 'Fix: Increased intelluct\n';
    expected += '\n';
    expected += 'BREAKING CHANGE: ';

    expect(result).to.eq(expected);
  });

  it('conditional fields with expression should be rendered', () => {
    const template = [
      '{type}{scope}: {description}',
      '',
      '{body}',
      '',
      '{root_cause}',
      '',
      '{breaking_change}{footer}',
    ];
    const issueTypeToken: Token = {
      label: 'Issue type',
      name: 'issue_type',
      type: 'enum',
      options: [
        {label: 'Bug', value: 'bug'},
        {label: 'Story', value: 'story'},
        {label: 'Task', value: 'task'},
      ],
    };
    const tokens: Token[] = [
      ...createTokens().filter(t => !t.linkedToken),
      issueTypeToken,
      {
        label: 'Root cause',
        name: 'root_cause',
        prefix: 'Root cause: ',
        type: 'text',
        linkedToken: 'issue_type',
        matchValue: "issue_type == 'bug'",
      },
    ];
    const tokenValues = {
      ...createTokenValues(),
      issue_type: 'bug',
    };

    const compiler = new TemplateCompiler(template, tokens, tokenValues);
    const result = compiler.compile();

    let expected = '';
    expected += 'feat(lorem|ipsum): test description\n';
    expected += '\n';
    expected += 'Test body\n';
    expected += '\n';
    expected += 'Root cause: I\'m an idiot\n';
    expected += '\n';
    expected += 'BREAKING CHANGE: ';

    expect(result).to.eq(expected);
  });

  it('empty lines should be reduced', () => {
    const template = [
      '{test1}',
      '',
      '{test2}',
      '',
      '{test3}',
      '',
      '',
    ];
    const tokens: Token[] = [
      {
        label: 'Test 1',
        name: 'test1',
        type: 'text',
      },
      {
        label: 'Test 2',
        name: 'test2',
        type: 'text',
      },{
        label: 'Test 3',
        name: 'test3',
        type: 'text',
      },
    ];
    const tokenValues = {
      test1: 'test1 value',
      test3: 'test3 value',
    };

    const compiler = new TemplateCompiler(template, tokens, tokenValues);
    compiler.reduceEmptyLines = true;
    const result = compiler.compile();

    let expected = '';
    expected += 'test1 value\n';
    expected += '\n';
    expected += 'test3 value';

    expect(result).to.eq(expected);
  });

  it('empty lines should be kept', () => {
    const template = [
      '{test1}',
      '',
      '{test2}',
      '',
      '{test3}',
      '',
      '',
    ];
    const tokens: Token[] = [
      {
        label: 'Test 1',
        name: 'test1',
        type: 'text',
      },
      {
        label: 'Test 2',
        name: 'test2',
        type: 'text',
      },{
        label: 'Test 3',
        name: 'test3',
        type: 'text',
      },
    ];
    const tokenValues = {
      test1: 'test1 value',
      test3: 'test3 value',
    };

    const compiler = new TemplateCompiler(template, tokens, tokenValues);
    compiler.reduceEmptyLines = false;
    const result = compiler.compile();

    console.log(result);

    let expected = '';
    expected += 'test1 value\n';
    expected += '\n';
    expected += '\n';
    expected += '\n';
    expected += 'test3 value';
    expected += '\n';
    expected += '\n';

    expect(result).to.eq(expected);
  });

  it('conditional token with empty matchValue should not render', () => {
    const template = ['{type}: {description}', '', '{conditional_field}'];
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
        label: 'Conditional field',
        name: 'conditional_field',
        type: 'text',
        linkedToken: 'type',
        matchValue: '',
      },
    ];
    const tokenValues = {
      type: 'feat',
      description: 'test description',
      conditional_field: 'should not appear',
    };

    const compiler = new TemplateCompiler(template, tokens, tokenValues);
    const result = compiler.compile();

    let expected = '';
    expected += 'feat: test description';

    expect(result).to.eq(expected);
  });

  it('conditional token with undefined matchValue should not render', () => {
    const template = ['{type}: {description}', '', '{conditional_field}'];
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
        label: 'Conditional field',
        name: 'conditional_field',
        type: 'text',
        linkedToken: 'type',
        // matchValue is undefined
      },
    ];
    const tokenValues = {
      type: 'feat',
      description: 'test description',
      conditional_field: 'should not appear',
    };

    const compiler = new TemplateCompiler(template, tokens, tokenValues);
    const result = compiler.compile();

    let expected = '';
    expected += 'feat: test description';

    expect(result).to.eq(expected);
  });

  it('conditional token with multiple linkedTokens should work correctly', () => {
    const template = ['{type}: {description}', '', '{conditional_field}'];
    const tokens: Token[] = [
      {
        label: 'Type',
        name: 'type',
        type: 'enum',
        options: [
          {label: 'Feature', value: 'feat'},
          {label: 'Fix', value: 'fix'},
        ],
      },
      {
        label: 'Issue',
        name: 'issue',
        type: 'enum',
        options: [
          {label: 'Customer Feedback', value: '客户反馈'},
          {label: 'Internal', value: '内部'},
        ],
      },
      {
        label: 'Description',
        name: 'description',
        type: 'text',
      },
      {
        label: 'Conditional field',
        name: 'conditional_field',
        type: 'text',
        linkedToken: ['issue', 'type'],
        matchValue: "issue =~ /客户反馈/ && type == 'fix'",
      },
    ];
    const tokenValues = {
      type: 'fix',
      issue: '客户反馈',
      description: 'test description',
      conditional_field: 'This should appear',
    };

    const compiler = new TemplateCompiler(template, tokens, tokenValues);
    const result = compiler.compile();

    let expected = '';
    expected += 'fix: test description\n';
    expected += '\n';
    expected += 'This should appear';

    expect(result).to.eq(expected);
  });

  it('conditional token with multiple linkedTokens should not render when condition fails', () => {
    const template = ['{type}: {description}', '', '{conditional_field}'];
    const tokens: Token[] = [
      {
        label: 'Type',
        name: 'type',
        type: 'enum',
        options: [
          {label: 'Feature', value: 'feat'},
          {label: 'Fix', value: 'fix'},
        ],
      },
      {
        label: 'Issue',
        name: 'issue',
        type: 'enum',
        options: [
          {label: 'Customer Feedback', value: '客户反馈'},
          {label: 'Internal', value: '内部'},
        ],
      },
      {
        label: 'Description',
        name: 'description',
        type: 'text',
      },
      {
        label: 'Conditional field',
        name: 'conditional_field',
        type: 'text',
        linkedToken: ['issue', 'type'],
        matchValue: "issue =~ /客户反馈/ && type == 'fix'",
      },
    ];
    const tokenValues = {
      type: 'feat',  // condition fails because type is 'feat', not 'fix'
      issue: '客户反馈',
      description: 'test description',
      conditional_field: 'This should NOT appear',
    };

    const compiler = new TemplateCompiler(template, tokens, tokenValues);
    const result = compiler.compile();

    let expected = '';
    expected += 'feat: test description';

    expect(result).to.eq(expected);
  });
});
