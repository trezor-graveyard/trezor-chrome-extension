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

// All the "actual logic" is encapsulated in this module

import {enumerate} from "./enumerate";
import {listen} from "./listen";
import {call} from "./call";
import {configure} from "./configure";
import {acquire, release} from "./connections";
import {udevStatus} from "./udevStatus";
import {version} from "./version";
import type {Messages} from "../protobuf/messages";
import type {TrezorDeviceInfo} from "./enumerate";

function none(): Promise<void> {
  return Promise.reject("unknown message type");
}

function ping(): Promise<string> {
  return Promise.resolve("pong");
}

export const tasks: {
  enumerate: () => Promise<Array<TrezorDeviceInfo>>,
  listen: () => Promise<Array<TrezorDeviceInfo>>,
  call: (message:{id: ?number, type: ?string, message: Object}, messages:Messages) =>
    Promise<{type: string, message: Object}>,
  none: () => Promise<void>,
  ping: () => Promise<string>,
  configure: (signedData: string) => Promise<Messages>,
  release: (connectionId: number) => Promise<string>,
  acquire: (id: number) => Promise<{session: number}>,
  udevStatus: () => Promise<string>,
  version: () => Promise<string>,
} = {
  enumerate: enumerate,
  listen: listen,
  call: call,
  none: none,
  ping: ping,
  configure: configure,
  acquire: acquire,
  release: release,
  udevStatus: udevStatus,
  version: version,
};

