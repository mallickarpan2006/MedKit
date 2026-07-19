import { Address } from '@stellar/stellar-sdk';
import pkg from 'js-sha3';
const { keccak256 } = pkg;
const scval = Address.fromString(process.argv[2]).toScVal();
const h = keccak256.array(Buffer.from(scval.toXDR()));
h[0] = 0;
console.log('JS field:', Buffer.from(h).toString('hex'));
