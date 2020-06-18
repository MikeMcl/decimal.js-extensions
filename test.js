import Decimal from 'decimal.js';
import { serialize } from './index.js';

serialize.extend(Decimal);

const serialize_test =
  typeof Decimal.prototype.toArrayBuffer == 'function' && typeof Decimal.fromArrayBuffer == 'function';


console.log(`The serialize extension test ${serialize_test ? 'passed' : 'failed'}`);