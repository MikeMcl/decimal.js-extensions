A [decimal.js](https://github.com/MikeMcl/decimal.js/) extension to

# evaluate arithmetic expressions

This is a lightweight expression parser. See [math.js](https://mathjs.org/) for a much more powerful and full-featured expression parser and math library.

<br>

## Usage example

```javascript
import Decimal from 'decimal.js';
import { evaluate } from 'decimal.js-extensions-evaluate';

evaluate.extend(Decimal);

let result = Decimal.evaluate('0.1 + 0.2');

console.log(result);                     // '0.3'
console.log(result instanceof Decimal);  // true

Decimal.precision = 30;

result = Decimal.eval('2sin(x)', { x: 3, sin: n => n.sin() });

console.log(result);                     // '0.282240016119734444201489605616'
console.log(Decimal.eval.expression);    // '2*sin(x)'
```

## Test

```bash
$ npm test

$ node test/eval "cos(1 + sin(0.5))"
```

## Licence

[MIT](https://github.com/MikeMcl/decimal.js-extensions/blob/master/LICENCE)

## Credits

The implementation is derived from the article *Top Down Operator Precedence*
by Douglas Crockford, available at

<http://crockford.com/javascript/tdop/tdop.html>.

Also see:

<https://eli.thegreenplace.net/2010/01/02/top-down-operator-precedence-parsing>

<http://effbot.org/zone/simple-top-down-parsing.htm>

<br>

## Scope example

```javascript
const scope = {
  NaN,
  Infinity,
  // Constants to 40 d.p.
  E:       '2.7182818284590452353602874713526624977572',
  LN2:     '0.6931471805599453094172321214581765680755',
  LN10:    '2.3025850929940456840179914546843642076011',
  LOG2E:   '1.4426950408889634073599246810018921374266',
  LOG10E:  '0.4342944819032518276511289189166050822944',
  PI:      '3.1415926535897932384626433832795028841972',
  SQRT1_2: '0.7071067811865475244008443621048490392848',
  SQRT2:   '1.4142135623730950488016887242096980785697',
  PHI:     '1.6180339887498948482045868343656381177203',
  abs: x => x.abs(),
  acos: x => x.acos(),
  acosh: x => x.acosh(),
  asin: x => x.asin(),
  asinh: x => x.asinh(),
  atan: x => x.atan(),
  atanh: x => x.atanh(),
  atan2: (y, x) => Decimal.atan2(y, x),
  cbrt: x => x.cbrt(),
  ceil: x => x.ceil(),
  cos: x => x.cos(),
  cosh: x => x.cosh(),
  exp: x => x.exp(),
  floor: x => x.floor(),
  ln: x => x.ln(),
  log: (x, y) => x.log(y),
  log10: x => Decimal.log10(x),
  log2: x => Decimal.log2(x),
  max: (...args) => Decimal.max(...args),
  min: (...args) => Decimal.min(...args),
  random: (n) => Decimal.random(+n),
  round: x => x.round(),
  sign: x => Decimal.sign(x),
  sin: x => x.sin(),
  sinh: x => x.sinh(),
  sqrt: x => x.sqrt(),
  tan: x => x.tan(),
  tanh: x => x.tanh(),
  trunc: x => x.trunc(),
};

result = Decimal.eval('3.4564564645E + 4(PHI - cos(LN2) + exp(PI)) / 2.003e+12', scope);

console.log(result);                     // '9.39562279835805409202716773322'
console.log(Decimal.eval.expression);    // '3.4564564645*E+4*(PHI-cos(LN2)+exp(PI))/2.003e+12'
```

## Notes

The results of operations are calculated to the number of significant digits specified by the value of `Decimal.precision` and rounded using the rounding mode of `Decimal.rounding`.

```js
Decimal.precision = 5;
Decimal.eval('1/3');                           // '0.33333'
```

The comparison operators return `1` for `true` and `0` for `false`.

```js
Decimal.eval('2 > 3');                         // '0'
```

As with JavaScript, the logical operators `&&` and `||` return one of their operands.

```js
Decimal.eval('2 && 3');                       // '3'
```

Exponential notation is supported.

```js
Decimal.eval('1.234e+5 == 123400');           // '1'
```

As shown above, user-defined variables and functions are supported through a *scope* object passed as the second argument.

```js
Decimal.eval('3sin(x)', { x: 3, sin: n => n.sin() });    // '0.4233600241796016663'
```

Once a *scope* is defined, it exists until it is replaced by a new *scope*.

```js
Decimal.eval('x + y', { x: 0.1, y: 0.2 });    // '0.3'
Decimal.eval('2(x - 3y)');                    // '1'
Decimal.eval('2xy');                          // '0.04'
Decimal.eval('xy', {});                       // 'Decimal.eval: unknown symbol: x'
```

Multiplication is implicit for immediately adjacent values, but note that multiplication and division are left-associative:

```js
Decimal.eval('1/2x', { x: 4 });               // '2'         (1/2)*x
Decimal.eval('1/(2x)');                       // '0.125'     1/(2*x)
```

The evaluated expression is available at `Decimal.eval.expression`.

```js
Decimal.eval('2x(3x + 4y)');
Decimal.eval.expression;                      // '2*x*(3*x + 4*y)'
```

Each variable's value and each function's return value is passed to the `Decimal` constructor, so a *number*, *string* or *Decimal* can be used in the definition in the scope object.

```js
Decimal.eval('x % y + z', { x: 4, y: '3', z: new Decimal('2') });    // '3'
```

The values that are passed to functions are `Decimal` values, so their prototype methods are available.

```js
Decimal.eval('add(0.1, 0.2)', { add: (x, y) => x.plus(y) });         // '0.3'
```

The definition of a valid identifier for a variable or function is the same as for JavaScript except that the only non-ASCII characters allowed are the letters of the Unicode *Greek and Coptic* range: `\u0370-\u03FF`.
I.e. an identifier must start with a letter, `_` or `$`, and any further characters must be letters, numbers, `_` or `$`.

```js
Decimal.eval('2πr', { π: Math.PI, r: 1 });          // '6.283185307179586'
```

A variable or function's value can be changed without having to redefine the scope, by passing an object containing the updated definitions as the first and only argument.

Below, the value of `π` is updated and the last expression `'2πr'` is re-evaluated each time.

```js
Decimal.eval({ π: '3.14159265358979323846' });      // '6.28318530717958647692'
Decimal.eval({ π: 3 });                             // '6'
```

A new scope has not been created so `r` is still available.

```js
Decimal.eval('r');                        // 1
Decimal.eval('r', {});                    // 'Decimal.eval: unknown symbol: r'
```

When a new expression is passed to `Decimal.eval` it is tokenized and those tokens are re-evaluated on each subsequent `eval` call until a new expression is passed and a new set of tokens is created.

```js
Decimal.eval('x^y', { x: 2, y: 3 });      // '8'           2^3
Decimal.eval({ y: -3 });                  // '0.125'       2^-3
Decimal.eval({ x: 4 });                   // '0.015625'    4^-3

Decimal.eval('1');                        // '1'
Decimal.eval({ y: 4 });                   // '1'
Decimal.eval('x^y');                      // '256'         4^4
```

Note, though, that *new* variables or functions cannot be added via the updating object.

```js
Decimal.eval({ z: 5 });                    // 'Decimal.eval: identifier not in scope: z'
```

---