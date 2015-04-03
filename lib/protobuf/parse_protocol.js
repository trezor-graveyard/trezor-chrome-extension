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
 * Module for loading the protobuf description from serialized description
 */

var ProtoBuf = require('protobufjs');
var _ = require('lodash');

var protocolToJSON = require('./to_json.js');

var compiledConfigProto = require('../../config_proto_compiled.js'); 


/**
 * Parse configure data (it has to be already verified)
 * @param {Buffer} data Serialized protobuf data as buffer
 * @returns {Object.<string, ProtoBuf.Builder.Message>} Building result from protobuf.js;
 *                                                                can be used to build messages
 */
function parseConfigure(data) {
    var configBuilder = compiledConfigProto["Configuration"];
    var loadedConfig = configBuilder.decode(data);
    var wireProtocol = loadedConfig.wire_protocol;
    var protocolJSON = protocolToJSON(wireProtocol.toRaw());
    var protobufMessages = ProtoBuf.newBuilder({})["import"](protocolJSON).build();


    // This is a little hacky
    // I am building an object, where keys are numbers and values are 
    // names of appropriate messages plus their protobuf.js builders

    // This is then put to the original PB.js object with builders as an additional propery
    var messagesByType = {};

    _.keys(protobufMessages.MessageType).forEach(function (longName) {
      var typeId = protobufMessages.MessageType[longName];
      var shortName = longName.split('_')[1];
      messagesByType[typeId] = {
        name: shortName,
        constructor: protobufMessages[shortName]
      };
    });

    protobufMessages.messagesByType = messagesByType;


    return protobufMessages;
}

module.exports = parseConfigure;
