import { performance } from 'perf_hooks';
import Decimal from 'decimal.js';
import { serialize } from '../index.js';
import {
  randomNonZeroInt,
  randomDouble,
  randomDoubleLimitExponent,
  randomExponential,
  randomExponentialSpecial,
} from "./random.js";

serialize.extend(Decimal);

const DEFAULT_TEST_COUNT = 100000;

const log = console.log;
const hideCursor = () => void process.stdout.write("\x1B[?25l");
const showCursor = () => void process.stdout.write("\x1B[?25h");

const test = (value, show = false) => {
  const x = new Decimal(value);
  const xBuffer = x.toArrayBuffer();
  const xArray = new Uint8Array(xBuffer);

  const y = Decimal.fromArrayBuffer(xBuffer);
  const yBuffer = y.toArrayBuffer();
  const yArray = new Uint8Array(yBuffer);

  let pass = (x.eq(y) || x.isNaN() && y.isNaN()) && xArray.length === yArray.length;
  for (let i = 0; pass && i < xArray.length; i++) pass = xArray[i] === yArray[i];

  if (!pass || show) {
    log(`x:               ${String(x)}`);
    log(`x.s:             ${String(x.s)}`);
    log(`x.e:             ${String(x.e)}`);
    log(`x.d:             ${x.d == null ? x.d : '[' + x.d + ']'}`);
    log(`x as Uint8Array: [${String(xArray)}]`);
    log();
    log(`y:               ${String(y)}`);
    log(`y.s:             ${String(y.s)}`);
    log(`y.e:             ${String(y.e)}`);
    log(`y.d:             ${y.d == null ? y.d : '[' + y.d + ']'}`);
    log(`y as Uint8Array: [${String(yArray)}]`);
    log();
    log(`Test ${pass ? 'passed' : 'failed'}`);
    process.exit();
  }
};

const arg1 = process.argv[2];
const arg2 = process.argv[3];
if (arg1 && arg2) test(arg1, true);

test(NaN);
test(Infinity);
test(-Infinity);
test(0);
test(-0);
test(1);
test(-1);
test(24);
test(25);
test(26);
test(48);
test(50);
test(51);
test('9.999999999999999e+30');
test('-1.00000000000000000000000000000000001e+31');

hideCursor();
const count = Math.max(Math.floor((isFinite(arg1) ? arg1 : DEFAULT_TEST_COUNT) / 5), 1);
const start = performance.now();

for (let i = 0; i < count; ) {
  test(randomDouble(true));
  test(randomDoubleLimitExponent(30));
  test(randomExponential(randomNonZeroInt(40), randomNonZeroInt(4)));
  test(randomExponential(randomNonZeroInt(100)));
  test(randomExponentialSpecial(randomNonZeroInt(400)));
  if (++i % 2000 === 0) {
    process.stdout.cursorTo(0);
    process.stdout.write(String(i * 5));
  }
}

const end = performance.now();
process.stdout.cursorTo(0);
process.stdout.write(`${count * 5} tests completed in ${((end - start) / 1e3).toFixed(3)} secs.`);
showCursor();
