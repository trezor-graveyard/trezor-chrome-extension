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
import {enumerate} from "./enumerate";
import * as constants from "../constants";
import type {TrezorDeviceInfo} from "./enumerate";
const stringify = require("json-stable-stringify");

const iterMax: number = constants.LISTEN_ITERS;
const delay: number = constants.LISTEN_DELAY;
let lastStringified: string = "";

// Helper function for making Promise out of timeout
// (I am surprised this is not in Promise library already)

function timeoutPromise(delay: number): Promise<void> {
  return new Promise((resolve) =>
    window.setTimeout(() => resolve(), delay)
  );
}

function runIter(iteration: number, oldStringified: string): Promise<Array<TrezorDeviceInfo>> {
  return enumerate().then((devices) => {
    const stringified = stringify(devices);
    if ((stringified !== oldStringified) || (iteration === iterMax)) {
      lastStringified = stringified;
      return devices;
    }
    return timeoutPromise(delay).then(() => runIter(iteration + 1, stringified));
  });
}

// old is a direct input from caller; we cannot really assume anything there
export function listen(old: ?Object): Promise<Array<TrezorDeviceInfo>> {
  const oldStringified = stringify(old);
  const last = old == null ? lastStringified : oldStringified;
  return runIter(0, last);
}

