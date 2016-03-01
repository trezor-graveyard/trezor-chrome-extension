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

'use strict';
import {enumerate} from "./enumerate";
import * as constants from "../constants";
import type {TrezorDeviceInfo} from "./enumerate";
var stringify = require('json-stable-stringify');

var iterMax: number = constants.LISTEN_ITERS;
var delay: number = constants.LISTEN_DELAY;
var lastStringified: string = "";

// Helper function for making Promise out of timeout
// (I am surprised this is not in Promise library already)

// unfortunately, flowtype cannot do the typechecking in here (variadic doesn't work here)
function timeoutPromise(func: Function, delay: number, params: Array<any>): any {
  return new Promise(function (resolve, reject) {
    window.setTimeout(function () {
      try {
        var res = func.apply(null, params);
        resolve(res);
      } catch (e) {
        reject(e);
      }
    }, delay);
  });
}

function runIter(iteration: number, oldStringified: string): Promise<Array<TrezorDeviceInfo>> {
  return enumerate().then(function (devices) {
    var stringified = stringify(devices);
    if ((stringified !== oldStringified) || (iteration === iterMax)) {
      lastStringified = stringified;
      return devices;
    };
    return timeoutPromise(runIter, delay, [iteration + 1, stringified]);
  });
}

// old is a direct input from caller; we cannot really assume anything there
export function listen(old: ?Object): Promise<Array<TrezorDeviceInfo>> {
  var oldStringified = stringify(old);
  var last = old == null ? lastStringified : oldStringified;
  return runIter(0, last);
}

