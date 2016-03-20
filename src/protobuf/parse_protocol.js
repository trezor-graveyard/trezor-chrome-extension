/* @flow */
/**
 * This file is part of the TREZOR project.
 *
 * Copyright (C) 2015 SatoshiLabs <info@satoshilabs.com>
 *           (C) 2014 Mike Tsao <mike@sowbug.com>
 *           (C) 2014 Liz Fong-Jones <lizf@google.com>
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

"use strict";

// Module for loading the protobuf description from serialized description

import * as ProtoBuf from "protobufjs";

import {Messages} from "./messages.js";
import {protocolToJSON} from "./to_json.js";
import * as compiledConfigProto from "../config_proto_compiled.js";

// Parse configure data (it has to be already verified)
export function parseConfigure(data: Buffer): Messages {
  const configBuilder = compiledConfigProto["Configuration"];
  const loadedConfig = configBuilder.decode(data);

  const validUntil = loadedConfig.valid_until;
  const timeNow = Math.floor(Date.now() / 1000);
  if (timeNow >= validUntil) {
    throw new Error("Config too old; " + timeNow + " >= " + validUntil);
  }

  const wireProtocol = loadedConfig.wire_protocol;
  const protocolJSON = protocolToJSON(wireProtocol.toRaw());
  const protobufMessages = ProtoBuf.newBuilder({})["import"](protocolJSON).build();

  return new Messages(protobufMessages);
}

