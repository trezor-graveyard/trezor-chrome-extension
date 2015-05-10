/* @flow */
/**
 * This file is part of the TREZOR project.
 *
 * Copyright (C) 2015 SatoshiLabs <info@satoshilabs.com>
 *           (C) 2014 Mike Tsao <mike@sowbug.com>
 *           (C) 2015 William Wolf <throughnothing@gmail.com>
 *
 * This library is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this library.  If not, see <http://www.gnu.org/licenses/>.
 */

'use strict';

/**
 * Module for verifying ECDSA signature of configuration.
 *
 * Keys are loaded (by node at compile time) from ../constants.js
 */
 
import {ecdsa, ECSignature, ECPubKey, crypto} from "bitcoinjs-lib";

import * as BigInteger from "bigi";
import * as ecurve from "ecurve";

var curve = ecurve.getCurveByName('secp256k1')

import * as constants from './constants.js';

var keys: Array<Buffer> = constants.SATOSHI_KEYS
  .map(key => {
    return new Buffer(key, 'binary');
  });


/**
 * Verifies ECDSA signature
 * @param {Array[Buffer]} pubkeys Public keys
 * @param {Array[Buffer]} signature ECDSA signature (concatenated R and S, both 32 bytes)
 * @param {Array[Buffer]} data Data that are signed
 * @returns {boolean} True, iff the signature is correct with any of the pubkeys
 */
function verify(pubkeys: Array<Buffer>, bsignature: Buffer, data: Buffer): boolean {
  var r = BigInteger.fromBuffer(bsignature.slice(0, 32))
  var s = BigInteger.fromBuffer(bsignature.slice(32))
  var signature = new ECSignature(r, s)

  var hash = crypto.sha256(data);

  return pubkeys.some(pubkey => {

    var Q = ECPubKey.fromBuffer(pubkey).Q;
    return ecdsa.verify(curve, hash, signature, Q);

  });
}

/**
 * Verifies if a given data is a correctly signed config
 * @param {string} data Data in hexadecimal that is signature plus the data
 * @returns {Promise.<Buffer, error>} The data, if correctly signed, else reject
 */
export function verifyHexBin(data: string): Promise<Buffer> {
  var signature = new Buffer(data.slice(0, 64 * 2), 'hex');
  var dataB = new Buffer(data.slice(64 * 2), 'hex');
  var verified = verify(keys, signature, dataB);
  if (!verified) {
    return Promise.reject("Not correctly signed.");
  } else {
    return Promise.resolve(dataB);
  }
}

