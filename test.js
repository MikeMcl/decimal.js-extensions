import Decimal from 'decimal.js';
import { evaluate, serialize } from './index.js';

evaluate.extend(Decimal);
serialize.extend(Decimal);

const evaluateTest = () => Decimal.evaluate('0.1 + 0.2').eq(0.3);

const serializeTest = () => {
  const x = new Decimal('1234567899.54645456456456546213253466');
  const buffer = x.toArrayBuffer();
  const y = Decimal.fromArrayBuffer(buffer);
  return x.eq(y)
};

console.log(`The evaluate extension test ${evaluateTest() ? 'passed' : 'failed'}`);
console.log(`The serialize extension test ${serializeTest() ? 'passed' : 'failed'}`);