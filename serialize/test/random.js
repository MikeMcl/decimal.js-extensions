const log = console.log;

const randomInt = max => Math.floor(Math.random() * (max + 1));
const randomNonZeroInt = max => Math.floor(Math.random() * max) + 1;
const randomIntLessThan = limit => Math.floor(Math.random() * limit);
const randomIntInRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomUInt32 = () => Math.floor(Math.random() * 0x100000000);    // 2 ** 32
const randomBool = () => Math.random() < 0.5;

const randomDouble = (mustBeFinite = false) => {
  const x = new Float64Array(new Uint32Array([randomUInt32(), randomUInt32()]).buffer)[0];
  return !mustBeFinite || isFinite(x) ? x : randomDouble(mustBeFinite);
};

const MIN_NORMAL_POSITIVE_DOUBLE = 2.2250738585072014e-308;

const randomNormalDouble = () => {
  let x;
  do x = randomDouble(true);
  while (Math.abs(x) < MIN_NORMAL_POSITIVE_DOUBLE);
  return x;
};

const randomSubnormalDouble = () => {
  let x;
  do x = randomDouble(true);
  while (Math.abs(x) >= MIN_NORMAL_POSITIVE_DOUBLE);
  return x;
};

const randomDoubleFromBuffer = (() => {
  const bufferSize = 8192;
  const ui32s = new Uint32Array(bufferSize * 2);
  const f64s = new Float64Array(ui32s.buffer);
  let k = bufferSize;
  return () => {
    if (k === bufferSize) {
      for (let i = 0, j = k * 2; i < j; ++i) ui32s[i] = randomUInt32();
      k = 0;
    }
    return f64s[k++];
  };
})();

const randomDoubleLimitExponent = (max = 30) => {
  const lo = 10 ** -max;
  const hi = 10 ** (max + 1);
  let m, x;
  do {
    x = randomDouble(true);
    m = Math.abs(x);
  } while (m >= hi || m < lo);
  return x;
};

const randomDigits = (digitCount = 20) => {
  let digits = '';
  do {
    // `1 +` to prevent exponential notation.
    let x = String(1 + Math.random());
    // `- 1` to allow trailing zero.
    digits += x.slice(2, x.length - 1);
  } while (digits.length < digitCount);
  return digits.slice(0, digitCount);
};

const MAXIMUM_DECIMAL_EXPONENT = 9e15;

// {9, 99, 999, ..., 1e15 - 1, 9e15}
// {0, 10, 100, ..., 1e14,     1e15}
const randomExponent = (digitCount = randomNonZeroInt(16)) => {
  if (digitCount < 1 || digitCount > 16 || digitCount !== ~~digitCount) {
    throw RangeError('digitCount');
  }
  const max = digitCount === 16 ? MAXIMUM_DECIMAL_EXPONENT : (10 ** digitCount) - 1;
  const min = digitCount === 1 ? 0 : 10 ** (digitCount - 1);
  return randomIntInRange(min, max);
};

const randomExponential = (digitCount = randomNonZeroInt(80), exponentDigitCount) => {
  let mantissa = randomNonZeroInt(9).toString();
  if (digitCount > 1) mantissa +=  '.' + randomDigits(digitCount - 1);
  if (randomBool()) mantissa = '-' + mantissa;
  return mantissa + 'e' + (randomBool() ? '-' : '+') + randomExponent(exponentDigitCount);
};

// Commonly includes repeated zeros and/or nines.
const randomExponentialSpecial = (digitCount = randomNonZeroInt(80), exponentDigitCount) => {
  let mantissa = randomNonZeroInt(9).toString();
  digitCount -= 1;
  if (digitCount > 0) {
    mantissa +=  '.';
    while (digitCount !== 0) {
      // Call twice to bias towards smaller x but still allow possibility of x = digitCount.
      let x = randomNonZeroInt(randomNonZeroInt(digitCount));
      digitCount -= x;
      mantissa += (randomBool() ? randomDigits(x) : (randomBool() ? '0' : '9').repeat(x));
    }
  }
  if (Math.random() < 0.5) mantissa = '-' + mantissa;
  if (exponentDigitCount === undefined) {
    // Call three times to strongly bias towards exponents with few digits but with the maximum still possible.
    exponentDigitCount = randomNonZeroInt(randomNonZeroInt(randomNonZeroInt(16)));
  }
  return mantissa + 'e' + (randomBool() ? '-' : '+') + randomExponent(exponentDigitCount);
};

const test = () => {
  const k = 100;
  log('\n randomInt(10)\n');
  for (let i = 0; i < k; i++) log(randomInt(10));
  log('\n randomNonZeroInt(10)\n');
  for (let i = 0; i < k; i++) log(randomNonZeroInt(10));
  log('\n randomIntLessThan(10)\n');
  for (let i = 0; i < k; i++) log(randomIntLessThan(10));
  log('\n randomIntInRange(5, 10)\n');
  for (let i = 0; i < k; i++) log(randomIntInRange(5, 10));
  log('\n randomUInt32()\n');
  for (let i = 0; i < k; i++) log(randomUInt32());
  log('\n randomBool()\n');
  for (let i = 0; i < k; i++) log(randomBool());
  log('\n randomDouble()\n');
  for (let i = 0; i < k; i++) log(randomDouble());
  log('\n randomDoubleFromBuffer()\n');
  for (let i = 0; i < k; i++) log(randomDoubleFromBuffer());
  log('\n randomDoubleLimitExponent(30)\n');
  for (let i = 0; i < k; i++) log(randomDoubleLimitExponent(30));
  log('\n randomNormalDouble()\n');
  for (let i = 0; i < k; i++) log(randomNormalDouble());
  log('\n randomSubnormalDouble()\n');
  for (let i = 0; i < k; i++) log(randomSubnormalDouble());
  log('\n randomDigits(20)\n');
  for (let i = 0; i < k; i++) log(randomDigits(20));
  log('\n randomExponent()\n');
  for (let i = 0; i < k; i++) log(randomExponent());
  log('\n randomExponential()\n');
  for (let i = 0; i < k; i++) log(randomExponential());
  log('\n randomExponentialSpecial(80)\n');
  for (let i = 0; i < k; i++) log(randomExponentialSpecial(80));
  log();
};

//test();

export {
  randomInt,
  randomNonZeroInt,
  randomIntLessThan,
  randomIntInRange,
  randomUInt32,
  randomBool,
  randomDouble,
  randomNormalDouble,
  randomSubnormalDouble,
  randomDoubleFromBuffer,
  randomDoubleLimitExponent,
  randomDigits,
  randomExponent,
  randomExponential,
  randomExponentialSpecial,
  test as randomTest
};
