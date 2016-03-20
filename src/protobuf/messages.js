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

// This is a simple class that represents information about messages,
// as they are loaded from the protobuf definition,
// so they are understood by both sending and recieving code.

import * as ProtoBuf from "protobufjs";
import * as _ from "lodash";

type MessageArray<KeyType> = { [key: KeyType]: ProtoBuf.Bulder.Message };

export class Messages {
  messagesByName: MessageArray<string>;
  messagesByType: MessageArray<number>;
  messageTypes: { [key: string]: number };

  constructor(messages: MessageArray<string>) {
    this.messagesByName = messages;

    const messagesByType: MessageArray<number> = {};
    _.keys(messages.MessageType).forEach(longName => {
      const typeId = messages.MessageType[longName];
      const shortName = longName.split("_")[1];
      messagesByType[typeId] = {
        name: shortName,
        constructor: messages[shortName],
      };
    });
    this.messagesByType = messagesByType;
    this.messageTypes = messages.MessageType;
  }
}

