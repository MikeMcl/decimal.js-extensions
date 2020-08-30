/*
 *  A decimal.js extension to evaluate arithmetic expressions.
 *  https://github.com/MikeMcl/decimal.js-extensions
 *  Copyright (c) 2020 Michael Mclaughlin.
 *  MIT License https://opensource.org/licenses/MIT
 *
 *  Decimal.eval( [expression [, scope]] )
 *
 *  Return a new Decimal whose value is the result of evaluating a string expression in the context
 *  of a scope object.
 *
 *  [expression] {string} An arithmetic/boolean expression.
 *  [scope] {object} An object defining variables and/or functions.
 *
 *  Examples:
 *
 *      Decimal.eval('0.1 + 0.2').toString()              // '0.3'
 *      Decimal.eval('xyz', { x:'9', y:'-4', z:'7' });    // '-252'
 *
 *  Operator precedence:
 *      ( )
 *      ^ power √ (\u221A) square root   (right-associative)
 *      ! + -  (unary)
 *      * / %
 *      + -
 *      < > <= >=
 *      == !=
 *      &&
 *      ||
 *
 *  The comparison operators return 1 for true and 0 for false.
 *  The logical operators return one of their operands, e.g. 1 && 2 returns 2.
 *
 *  Implicit multiplication is supported, e.g. with scope `{ x:1, y:2 }`,
 *  `2x(3x + 4y)` is evaluated as `2*x*(3*x + 4*y)`.
 *
 *  The previously evaluated expression, with any added '*', is available at Decimal.eval.expression.
 *
 *  To change the value of a variable or function without creating a new scope and without
 *  re-tokenizing an expression, pass an object with the re-definitions as the sole argument.
 *
 *      Decimal.eval('x^y', {x:2, y:3})    // '8'
 *      Decimal.eval({y:-3})               // '0.125'
 *
 *  To add support for NaN, Infinity and, for example, the sine function use, for example:
 *
 *      Decimal.eval('3sin(e)', {
 *        e: '2.71828182845904523536',
 *        sin: x => x.sin(),
 *        NaN: NaN,
 *        Infinity: Infinity
 *      });
 */

function evaluator(Decimal) {
  const evalError = 'Decimal.eval:';
  const longestFirst = (a, b) => b.length - a.length;
  const regExpNum = '(?:(\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?)|(';
  const regExpSymbol = ')|(\\)))(?=([\\w($\\u221A\\u0370-\\u03FF]|!(?!=))?)|([!<>=]=|[-+*\\/(^%><!\\u221A,]|&&|\\|\\|)|\\S';
  const DEFAULT_TOKENIZER = new RegExp(`${regExpNum}0${regExpSymbol}`, 'g');
  const VALID_IDENTIFIER = /^[a-zA-Z_$\u0370-\u03FF][\w\u0370-\u03FF$]*$/;
  let TOKENIZER = DEFAULT_TOKENIZER;
  let TOKENS = null;
  let SCOPE = {};
  let index;
  let token;

  const OPERATORS = (() => {
    const ops = {};

      // lbp: left binding power.
    const add = (op, lbp, fn, prefix) => {
      const obj = {};

      obj.lbp = lbp;
      if (lbp) {
        obj.infix = typeof fn == 'string'
          ? lbp < 50   // comparison methods returning true/false
            ? left => new Decimal(Number(left[fn](evaluate(lbp))))
            : left => left[fn](evaluate(lbp))
          : fn;

        if (prefix) obj.prefix = prefix;
      } else {
        obj.prefix = fn;
      }

      obj.val = op;
      ops[op] = obj;
    };

    add('^', 80, left => left.pow(evaluate(79)));
    add('*', 60, 'times');
    add('/', 60, 'div');
    add('%', 60, 'mod');
    add('+', 50, 'plus', () => evaluate(70));
    add('-', 50, 'minus', () => {
      const r = new Decimal(evaluate(70));
      r.s = -r.s;
      return r;
    });
    add('>', 40, 'gt');
    add('>=', 40, 'gte');
    add('<', 40, 'lt');
    add('<=', 40, 'lte');
    add('==', 30, 'eq');
    add('!=', 30, left => new Decimal(Number(!left.eq(evaluate(30)))));
    add('&&', 20, left => {
      const r = evaluate(20);
      return left.isZero() ? left : r;
    });
    add('||', 10, left => {
      const r = evaluate(10);
      return left.isZero() ? r : left;
    });
    add('\u221A', 0, () => evaluate(79).sqrt());

    // If 'left' is 0 return 1 else return 0.
    add('!', 0, () => new Decimal(Number(evaluate(70).isZero())));
    add('(', 0, function () {
      const r = evaluate(0);
      if (token.val !== ')') throw Error(`${evalError} expected )`);
      token = TOKENS[++index];
      return r;
    });
    add(')', 0);
    add(',', 0);

    return ops;
  })();

  const funcPrefix = function () {
    const args = [];

    if (token.val !== '(') throw SyntaxError(`${evalError} expected (`);

    token = TOKENS[++index];

    if (token.val !== ')') {
      while (true) {
        args.push(evaluate(0));
        if (token.val !== ',') {
          if (token.val !== ')') throw SyntaxError(`${evalError} expected )`);
          break;
        }

        token = TOKENS[++index];
      }
    }

    token = TOKENS[++index];

    return new Decimal(SCOPE[this.val].apply(null, args));
  };

  const varPrefix = function () {
    return SCOPE[this.val];
  };

  const numPrefix = function () {
    return this.val;
  };

  const evaluate = rbp => {
    let left;
    let t = token;

    if (!t.prefix) {
      throw SyntaxError(`${evalError} unexpected ${t.val === 'end' ? 'end' : 'symbol: ' + t.val}`);
    }

    token = TOKENS[++index];
    left = t.prefix();

    while (rbp < token.lbp) {
      t = token;
      token = TOKENS[++index];
      left = t.infix(left);
    }

    // 'left' is returned to 'infix' or 'prefix', or it may be the final result.
    return left;
  };

  return (expression, scope) => {
    if (typeof expression === 'string' && expression.trim() !== '') {

      // Create new SCOPE.
      if (scope !== undefined) {
        if (scope !== null && typeof scope === 'object') {
          SCOPE = {};

          for (const [id, val] of Object.entries(scope)) {

            // Allow characters in Unicode 'Greek and Coptic' range: \u0370-\u03FF
            // VALID_IDENTIFIER: /^[a-zA-Z\u0370-\u03FF_$][\w\u0370-\u03FF$]*$/
            if (!VALID_IDENTIFIER.test(id)) {
              throw SyntaxError(`${evalError} invalid identifier: ${id}`);
            }
            SCOPE[id] = typeof val === 'function' ? val : new Decimal(val);
          }

          const identifiers = Object.keys(SCOPE);
          if (identifiers.length > 0) {
            identifiers.sort(longestFirst);
            TOKENIZER = new RegExp(`${regExpNum}${identifiers.join('|').replace(/\$/g, '\\$')}${regExpSymbol}`, 'g');
          } else {
            TOKENIZER = DEFAULT_TOKENIZER;
          }
        } else {
          throw TypeError(`${evalError} invalid scope: ${scope}`);
        }
      }

      // Uncomment to support the use of these other multiplication and division symbols:
      // × multiplication \xd7  (215)
      // ÷ division       \xf7  (247)
      // expression = expression.replace(/\xd7/g, '*').replace(/\xf7/g, '/');

      // Uncomment to support the use of '**' for the power operation.
      expression = expression.replace(/\*\*/g, '^');

      // Example TOKENIZER with capture groups numbered (and a scope with a variable 'x' and a function 'y'):
      //    1                                2     3       4                                    5
      // (?:(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(x|y)|(\)))(?=([\w($\u221A\u0370-\u03FF]|!(?!=))?)|([!<>=]=|[-+*\/(^%><!\u221A,]|&&|\|\|)|\S
      let match;
      let parsed = '';
      TOKENS = [];
      TOKENIZER.lastIndex = 0;

      // Create new TOKENS.
      while ((match = TOKENIZER.exec(expression))) {
        let m;

        // Decimal.
        if ((m = match[1])) {
          token = { val: new Decimal(m), prefix: numPrefix };

          // Operator.
        } else if ((m = match[5] || match[3])) {
          token = OPERATORS[m];

          // Function/variable.
        } else if ((m = match[2])) {
          token = typeof SCOPE[m] === 'function'
            ? ((match[4] = null), { val: m, prefix: funcPrefix })
            : { val: m, prefix: varPrefix };
        } else {
          TOKENS = null;
          throw SyntaxError(`${evalError} unknown symbol: ${match[0].charAt(0)}`);
        }

        TOKENS.push(token);
        parsed += m;

        // Add '*' if a number is followed by a variable, square root, '(' or '!', OR a variable
        // or ')' is followed by a number, variable, square root, '(' or '!'.
        if (match[4]) {
          TOKENS.push(OPERATORS['*']);
          parsed += '*';
        }
      }

      TOKENS.push({ val: 'end' });
      Decimal.eval.expression = parsed;

    } else if (scope === undefined && expression !== null && typeof expression === 'object') {
      if (TOKENS === null) {
        throw Error(`${evalError} no expression to re-evaluate`);
      }
      scope = expression;

      // Update existing SCOPE. (Existing TOKENS will be re-evaluated).
      for (const [id, val] of Object.entries(scope)) {
        if (SCOPE.hasOwnProperty(id)) {
          if (typeof SCOPE[id] === 'function') {
            if (typeof val !== 'function') {
              throw TypeError(`${evalError} ${id} must be a function`);
            }
            SCOPE[id] = val;
          } else {
            if (typeof val === 'function') {
              throw TypeError(`${evalError} ${id} must not be a function`);
            }
            SCOPE[id] = new Decimal(val);
          }
        } else {
          throw Error(`${evalError} identifier not in scope: ${id}`);
        }
      }
    } else {
      throw TypeError(`${evalError} invalid expression: ${expression}`);
    }

    index = 0;
    token = TOKENS[0];
    const result = new Decimal(evaluate(0));
    if (token.val !== 'end') throw SyntaxError(`${evalError} unexpected symbol: ${token.val}`);

    return result;
  };
}

export const evaluate = {
  extend(Decimal) {
    Decimal.evaluate = Decimal.eval = evaluator(Decimal);
    return Decimal;
  },
};
