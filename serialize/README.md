
A [decimal.js](https://github.com/MikeMcl/decimal.js/) extension for

# Decimal to ArrayBuffer serialization

## Usage example

```javascript
import Decimal from 'decimal.js';
import { serialize } from 'decimal.js-extensions-serialize';

serialize.extend(Decimal);

const x = new Decimal('1234567899.54645456456456546213253466');
const buffer = x.toArrayBuffer();
const y = Decimal.fromArrayBuffer(buffer);

console.log(x.eq(y) ? 'Success' : 'Failure');
```

## Test

```bash
$ npm test
```

## Licence

[MIT](https://github.com/MikeMcl/decimal.js-extensions/blob/master/LICENCE)
