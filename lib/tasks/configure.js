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
var Promise = require('promise');

var verifyEcdsa = require('../verify.js');
var parseProtobuf = require('../protobuf/parse_protocol.js');


/**
 * Loads the signed data with protobuf description
 * @param {string} signedData Data in hexadecimal that is signature plus the data
 * @returns {Promise.<Object.<string, ProtoBuf.Builder.Message>>} Building result from protobuf.js;
 *                                                                can be used to build messages
 */
function configure (signedData) {
  return verifyEcdsa(signedData).then(function (data) {
    return parseProtobuf(data);
  })
}

module.exports = configure;
