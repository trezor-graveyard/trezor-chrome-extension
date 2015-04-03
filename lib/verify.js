/**
 * This file is part of the TREZOR project.
 *
 * Copyright (C) 2015 SatoshiLabs <info@satoshilabs.com>
 *           (C) 2014 Mike Tsao <mike@sowbug.com>
 *           (C) 2015 William Wolf <throughnothing@gmail.com>
 *
 * This library is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
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

var ecdsa = require('bitcoinjs-lib').ecdsa;
var ECSignature = require('bitcoinjs-lib').ECSignature;
var ECPubKey = require('bitcoinjs-lib').ECPubKey;
var crypto = require('bitcoinjs-lib').crypto;
var BigInteger = require('bigi');

var ecurve = require('ecurve')
var curve = ecurve.getCurveByName('secp256k1')

//var ProtoBuf = require('protobufjs');

var Promise = require('promise');

var keys = require('../constants.js').SATOSHI_KEYS
  .map(function (key) {
    return new Buffer(key, 'binary');
  });


/**
 * Verifies ECDSA signature
 * @param {Array[Buffer]} pubkeys Public keys
 * @param {Array[Buffer]} signature ECDSA signature (concatenated R and S, both 32 bytes)
 * @param {Array[Buffer]} data Data that are signed
 * @returns {boolean} True, iff the signature is correct with any of the pubkeys
 */
function verify(pubkeys, signature, data) {
  var r = BigInteger.fromBuffer(signature.slice(0, 32))
  var s = BigInteger.fromBuffer(signature.slice(32))
  var signature = new ECSignature(r, s)

  var hash = crypto.sha256(data);

  return pubkeys.some(function (pubkey) {

    var Q = ECPubKey.fromBuffer(pubkey).Q;
    return ecdsa.verify(curve, hash, signature, Q);

  });

  var res = true;
}

/**
 * Verifies if a given data is a correctly signed config
 * @param {string} data Data in hexadecimal that is signature plus the data
 * @returns {Promise.<Buffer, error>} The data, if correctly signed, else reject
 */
function verifyHexBin(data) {
  var signature = new Buffer(data.slice(0, 64 * 2), 'hex');
  var data = new Buffer(data.slice(64 * 2), 'hex');
  var verified = verify(keys, signature, data);
  if (!verified) {
    return Promise.reject("Not correctly signed.");
  } else {
    return Promise.resolve(data);
  }
}

module.exports = verifyHexBin;
