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
import {send} from "./send";
import {receive} from "./receive";
import * as connections from "./connections";
import {clearUdevError, catchUdevError} from "./udevStatus";
import * as storage from "../chrome/storage";
import type {Messages} from "../protobuf/messages.js";

type MessageToTrezor = {id: ?number, type: ?string, message: Object};
type MessageFromTrezor = {type: string, message: Object};

// Sends a message to Trezor and returns
// an encoded message.
export function call(message: MessageToTrezor, messages: Messages): Promise<MessageFromTrezor> {
  if (message.id == null) {
    throw new Error("Connection id is not defined.");
  }
  if (message.type == null) {
    throw new Error("Type is not defined");
  }
  // body can probably be null

  const id: number = parseInt(message.id);
  if (isNaN(id)) {
    throw new Error("Connection ID is not a number");
  }
  const type_: mixed = message.type;
  if (typeof type_ !== "string") {
    throw new Error("Type is not string.");
  }
  const type: string = type_;
  const body: Object = message.message;

  const res = send(messages, id, type, body).then(() => {
    return receive(messages, id).then((response) => {
      // after first back and forth, it's clear that udev is installed => afterInstall is false, error is false
      return storage.set("afterInstall", "false").then(() => {
        clearUdevError();

        return response;
      });
    });
  }).catch((error) => {
    if (message.type === "Initialize") {
      return catchUdevError(error);
    } else {
      return Promise.reject(error);
    }
  });

  // I want to immediately reject on releasing
  return Promise.race([res, rejectOnRelease(id)]);
}

function rejectOnRelease(id: number): Promise {
  return new Promise((resolve, reject) => {
    connections.doOnRelease(id, () => reject(new Error("Device released or disconnected.")));
  });
}
