/**
 * Evaluates a When Clause expression against a context object.
 *
 * Supports:
 * - Comparison operators: ==, !=, <, >, <=, >=
 * - Logical operators: &&, ||, !
 * - In operator: value in ['a', 'b']
 * - Regex match: value =~ /pattern/flags
 * - Parentheses for grouping
 *
 * @param expression The When Clause expression to evaluate
 * @param context The context object containing variables
 * @returns true if the expression evaluates to true, false otherwise
 */
export default function evaluateWhenClause(
  expression: string,
  context: Record<string, unknown>
): boolean {
  try {
    const tokens = tokenize(expression);
    const ast = parse(tokens);
    return evaluate(ast, context);
  } catch (error) {
    // Return false on any parse or evaluation error
    return false;
  }
}

// Token types
enum TokenType {
  IDENTIFIER = 'IDENTIFIER',
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  OPERATOR = 'OPERATOR',
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  LBRACKET = 'LBRACKET',
  RBRACKET = 'RBRACKET',
  COMMA = 'COMMA',
  REGEX = 'REGEX',
  EOF = 'EOF',
}

interface Token {
  type: TokenType;
  value: string;
}

// Tokenizer
function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    const char = expr[i];

    // Skip whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Regex literal: /pattern/flags
    if (char === '/' && i > 0 && expr[i - 1] !== '/') {
      let j = i + 1;
      while (j < expr.length && expr[j] !== '/') {
        if (expr[j] === '\\') j++; // Skip escaped chars
        j++;
      }
      if (j < expr.length) {
        j++; // Include closing /
        // Check for flags
        while (j < expr.length && /[gimsuvy]/.test(expr[j])) {
          j++;
        }
        tokens.push({type: TokenType.REGEX, value: expr.slice(i, j)});
        i = j;
        continue;
      }
    }

    // String literal
    if (char === '"' || char === "'") {
      const quote = char;
      let j = i + 1;
      while (j < expr.length && expr[j] !== quote) {
        if (expr[j] === '\\') j++; // Skip escaped chars
        j++;
      }
      tokens.push({type: TokenType.STRING, value: expr.slice(i + 1, j)});
      i = j + 1;
      continue;
    }

    // Number literal
    if (/\d/.test(char)) {
      let j = i;
      while (j < expr.length && /\d/.test(expr[j])) {
        j++;
      }
      tokens.push({type: TokenType.NUMBER, value: expr.slice(i, j)});
      i = j;
      continue;
    }

    // Operators
    if (char === '=' && expr[i + 1] === '=') {
      tokens.push({type: TokenType.OPERATOR, value: '=='});
      i += 2;
      continue;
    }
    if (char === '!' && expr[i + 1] === '=') {
      tokens.push({type: TokenType.OPERATOR, value: '!='});
      i += 2;
      continue;
    }
    if (char === '<' && expr[i + 1] === '=') {
      tokens.push({type: TokenType.OPERATOR, value: '<='});
      i += 2;
      continue;
    }
    if (char === '>' && expr[i + 1] === '=') {
      tokens.push({type: TokenType.OPERATOR, value: '>='});
      i += 2;
      continue;
    }
    if (char === '&' && expr[i + 1] === '&') {
      tokens.push({type: TokenType.OPERATOR, value: '&&'});
      i += 2;
      continue;
    }
    if (char === '|' && expr[i + 1] === '|') {
      tokens.push({type: TokenType.OPERATOR, value: '||'});
      i += 2;
      continue;
    }
    if (char === '=' && expr[i + 1] === '~') {
      tokens.push({type: TokenType.OPERATOR, value: '=~'});
      i += 2;
      continue;
    }
    if (char === '<' || char === '>' || char === '!') {
      tokens.push({type: TokenType.OPERATOR, value: char});
      i++;
      continue;
    }

    // Punctuation
    if (char === '(') {
      tokens.push({type: TokenType.LPAREN, value: char});
      i++;
      continue;
    }
    if (char === ')') {
      tokens.push({type: TokenType.RPAREN, value: char});
      i++;
      continue;
    }
    if (char === '[') {
      tokens.push({type: TokenType.LBRACKET, value: char});
      i++;
      continue;
    }
    if (char === ']') {
      tokens.push({type: TokenType.RBRACKET, value: char});
      i++;
      continue;
    }
    if (char === ',') {
      tokens.push({type: TokenType.COMMA, value: char});
      i++;
      continue;
    }

    // Identifier (variable name or keyword like 'in')
    if (/[a-zA-Z_]/.test(char)) {
      let j = i;
      while (j < expr.length && /[a-zA-Z0-9_]/.test(expr[j])) {
        j++;
      }
      const value = expr.slice(i, j);
      if (value === 'in') {
        tokens.push({type: TokenType.OPERATOR, value: 'in'});
      } else {
        tokens.push({type: TokenType.IDENTIFIER, value});
      }
      i = j;
      continue;
    }

    throw new Error(`Unexpected character: ${char}`);
  }

  tokens.push({type: TokenType.EOF, value: ''});
  return tokens;
}

// AST Node types
interface ASTNode {
  type: string;
}

interface BinaryOpNode extends ASTNode {
  type: 'BinaryOp';
  operator: string;
  left: ASTNode;
  right: ASTNode;
}

interface UnaryOpNode extends ASTNode {
  type: 'UnaryOp';
  operator: string;
  operand: ASTNode;
}

interface LiteralNode extends ASTNode {
  type: 'Literal';
  value: string | number;
}

interface IdentifierNode extends ASTNode {
  type: 'Identifier';
  name: string;
}

interface ArrayNode extends ASTNode {
  type: 'Array';
  elements: ASTNode[];
}

interface RegexNode extends ASTNode {
  type: 'Regex';
  pattern: string;
  flags: string;
}

// Parser
class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): ASTNode {
    return this.parseOrExpression();
  }

  private current(): Token {
    return this.tokens[this.pos];
  }

  private advance(): Token {
    return this.tokens[this.pos++];
  }

  private parseOrExpression(): ASTNode {
    let left = this.parseAndExpression();

    while (
      this.current().type === TokenType.OPERATOR &&
      this.current().value === '||'
    ) {
      const operator = this.advance().value;
      const right = this.parseAndExpression();
      left = {type: 'BinaryOp', operator, left, right} as BinaryOpNode;
    }

    return left;
  }

  private parseAndExpression(): ASTNode {
    let left = this.parseComparisonExpression();

    while (
      this.current().type === TokenType.OPERATOR &&
      this.current().value === '&&'
    ) {
      const operator = this.advance().value;
      const right = this.parseComparisonExpression();
      left = {type: 'BinaryOp', operator, left, right} as BinaryOpNode;
    }

    return left;
  }

  private parseComparisonExpression(): ASTNode {
    let left = this.parseUnaryExpression();

    const compOps = ['==', '!=', '<', '>', '<=', '>=', 'in', '=~'];
    while (
      this.current().type === TokenType.OPERATOR &&
      compOps.includes(this.current().value)
    ) {
      const operator = this.advance().value;
      const right = this.parseUnaryExpression();
      left = {type: 'BinaryOp', operator, left, right} as BinaryOpNode;
    }

    return left;
  }

  private parseUnaryExpression(): ASTNode {
    if (
      this.current().type === TokenType.OPERATOR &&
      this.current().value === '!'
    ) {
      const operator = this.advance().value;
      const operand = this.parseUnaryExpression();
      return {type: 'UnaryOp', operator, operand} as UnaryOpNode;
    }

    return this.parsePrimaryExpression();
  }

  private parsePrimaryExpression(): ASTNode {
    const token = this.current();

    // Parentheses
    if (token.type === TokenType.LPAREN) {
      this.advance();
      const expr = this.parseOrExpression();
      if (this.current().type !== TokenType.RPAREN) {
        throw new Error('Expected )');
      }
      this.advance();
      return expr;
    }

    // Array literal
    if (token.type === TokenType.LBRACKET) {
      this.advance();
      const elements: ASTNode[] = [];
      while (this.current().type !== TokenType.RBRACKET) {
        elements.push(this.parsePrimaryExpression());
        if (this.current().type === TokenType.COMMA) {
          this.advance();
        }
      }
      this.advance(); // consume ]
      return {type: 'Array', elements} as ArrayNode;
    }

    // Regex
    if (token.type === TokenType.REGEX) {
      this.advance();
      const match = token.value.match(/^\/(.+)\/([gimsuvy]*)$/);
      if (!match) throw new Error('Invalid regex');
      return {type: 'Regex', pattern: match[1], flags: match[2]} as RegexNode;
    }

    // String
    if (token.type === TokenType.STRING) {
      this.advance();
      return {type: 'Literal', value: token.value} as LiteralNode;
    }

    // Number
    if (token.type === TokenType.NUMBER) {
      this.advance();
      return {type: 'Literal', value: Number(token.value)} as LiteralNode;
    }

    // Identifier
    if (token.type === TokenType.IDENTIFIER) {
      this.advance();
      return {type: 'Identifier', name: token.value} as IdentifierNode;
    }

    throw new Error(`Unexpected token: ${token.type}`);
  }
}

function parse(tokens: Token[]): ASTNode {
  const parser = new Parser(tokens);
  return parser.parse();
}

// Evaluator
function evaluate(node: ASTNode, context: Record<string, unknown>): boolean {
  switch (node.type) {
    case 'BinaryOp': {
      const binNode = node as BinaryOpNode;
      const left = evaluateValue(binNode.left, context);
      const right = evaluateValue(binNode.right, context);

      switch (binNode.operator) {
        case '==':
          return left === right;
        case '!=':
          return left !== right;
        case '<':
          return (left as number) < (right as number);
        case '>':
          return (left as number) > (right as number);
        case '<=':
          return (left as number) <= (right as number);
        case '>=':
          return (left as number) >= (right as number);
        case '&&':
          return (
            evaluate(binNode.left, context) && evaluate(binNode.right, context)
          );
        case '||':
          return (
            evaluate(binNode.left, context) || evaluate(binNode.right, context)
          );
        case 'in':
          if (!Array.isArray(right))
            throw new Error('Right operand of "in" must be an array');
          return (right as unknown[]).includes(left);
        case '=~': {
          const regexNode = binNode.right as RegexNode;
          const regex = new RegExp(regexNode.pattern, regexNode.flags);
          return regex.test(String(left));
        }
        default:
          throw new Error(`Unknown operator: ${binNode.operator}`);
      }
    }

    case 'UnaryOp': {
      const unNode = node as UnaryOpNode;
      if (unNode.operator === '!') {
        return !evaluate(unNode.operand, context);
      }
      throw new Error(`Unknown unary operator: ${unNode.operator}`);
    }

    default:
      return Boolean(evaluateValue(node, context));
  }
}

function evaluateValue(
  node: ASTNode,
  context: Record<string, unknown>
): unknown {
  switch (node.type) {
    case 'Literal':
      return (node as LiteralNode).value;

    case 'Identifier': {
      const idNode = node as IdentifierNode;
      return context[idNode.name];
    }

    case 'Array': {
      const arrNode = node as ArrayNode;
      return arrNode.elements.map((el) => evaluateValue(el, context));
    }

    case 'Regex':
      return node; // Return regex node for =~ operator

    case 'BinaryOp':
    case 'UnaryOp':
      return evaluate(node, context);

    default:
      throw new Error(`Cannot evaluate value of node type: ${node.type}`);
  }
}
