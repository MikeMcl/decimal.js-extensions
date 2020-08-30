import Decimal from 'decimal.js';
import { evaluate } from '../index.js';
import { performance } from 'perf_hooks';

evaluate.extend(Decimal);

const log = console.log;

const expression = process.argv[2];
if (!expression) {
  log('No string expression to evaluate!');
  process.exit();
}

let scope = process.argv[3];
if (scope) {
  // Surround variable names with double quotes for JSON parse.
  scope = JSON.parse(scope.replace(/\w+(?=\s*:)/g, '"$&"'));
} else {
  scope = {
    // Special values
    NaN,
    Infinity,
    // Constants (to 40 d.p.)
    E:       '2.7182818284590452353602874713526624977572',
    LN2:     '0.6931471805599453094172321214581765680755',
    LN10:    '2.3025850929940456840179914546843642076011',
    LOG2E:   '1.4426950408889634073599246810018921374266',
    LOG10E:  '0.4342944819032518276511289189166050822944',
    PI:      '3.1415926535897932384626433832795028841972',
    SQRT1_2: '0.7071067811865475244008443621048490392848',
    SQRT2:   '1.4142135623730950488016887242096980785697',
    PHI:     '1.6180339887498948482045868343656381177203',
    // Methods
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
}

Decimal.precision = 20;
const start = performance.now();
const result = Decimal.eval(expression, scope);
const end = performance.now();
log(`${Decimal.eval.expression} = ${result}`);
log(`Time taken: ${((end - start) / 1e3).toFixed(3)} secs.`);
