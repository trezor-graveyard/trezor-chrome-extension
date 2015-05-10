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
 * Module for loading the protobuf description from serialized description
 */

import * as ProtoBuf from "protobufjs";
import * as _ from "lodash";

import {Messages} from "./messages.js";
import {protocolToJSON} from "./to_json.js";
import * as compiledConfigProto from "../config_proto_compiled.js";


/**
 * Parse configure data (it has to be already verified)
 * @param {Buffer} data Serialized protobuf data as buffer
 * @returns {Object.<string, ProtoBuf.Builder.Message>} Building result from protobuf.js;
 *                                                                can be used to build messages
 */
export function parseConfigure(data: Buffer): Messages {
    var configBuilder = compiledConfigProto["Configuration"];
    var loadedConfig = configBuilder.decode(data);

    var validUntil = loadedConfig.valid_until;
    var timeNow = Math.floor(Date.now() / 1000);
    if (timeNow >= validUntil) {
        throw new Error("Config too old; " + timeNow + " >= " + validUntil);
    }
    
    var wireProtocol = loadedConfig.wire_protocol;
    var protocolJSON = protocolToJSON(wireProtocol.toRaw());
    var protobufMessages = ProtoBuf.newBuilder({})["import"](protocolJSON).build();


    return new Messages(protobufMessages);
}

