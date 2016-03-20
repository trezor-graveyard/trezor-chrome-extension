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
import * as hid from "../chrome/hid";
import {catchUdevError} from "./udevStatus";

// global object with deviceId => connectionId mapping
const connectionsMap: {[keys: number]: number} = {};
const reverse: {[keys: number]: number} = {};

function parseAcquireInput(input: any): {
  id: number,
  previous: ?number,
  checkPrevious: boolean
} {
  if (typeof input === "number") {
    return {id: input, previous: null, checkPrevious: false};
  } else if (typeof input === "object") {
    const id = input.path;
    const previous = input.previous;
    return {id: id, previous: previous, checkPrevious: true};
  } else {
    throw new Error("Wrong acquire input");
  }
}

let currentConnectionP: Promise = Promise.resolve();

export function acquire(input: any): Promise<{session: number}> {
  const res: Promise<{session:number}> = currentConnectionP.then(() => {
    const parsedInput = parseAcquireInput(input);
    const id = parsedInput.id;

    const realPrevious = connectionsMap[id];

    if (parsedInput.checkPrevious) {
      let error = false;
      if (realPrevious == null) {
        if (parsedInput.previous != null) {
          error = true;
        }
      } else {
        if (parsedInput.previous !== realPrevious) {
          error = true;
        }
      }
      if (error) {
        throw new Error("wrong previous session");
      }
    }

    // "stealing" sessions
    // if I am already connected (in a different tab for example),
    // disconnect that one
    if (realPrevious != null) {
      return _realRelease(realPrevious).then(() => id);
    } else {
      return Promise.resolve(id);
    }
  }).then((id) =>
    hid.connect(id).then((connectionId) => {
      return {connectionId, id};
    })
  ).then((o) => {
    const connectionId = o.connectionId;
    const id = o.id;
    connectionsMap[id] = connectionId;
    reverse[connectionId] = id;

    return {
      session: connectionId,
    };
  });
  // even when we catch udev error, return rejection
  res.catch((error) => catchUdevError(error));
  currentConnectionP = res.catch(() => true);
  return res;
}

function _realRelease(connectionId: number): Promise<string> {
  return hid.disconnect(connectionId).then(() => {
    const deviceId = reverse[connectionId];
    delete reverse[connectionId];
    delete connectionsMap[deviceId];
    return "Success";
  });
}

export function release(connectionId: number): Promise<string> {
  const res = currentConnectionP.then(() => _realRelease(connectionId));
  currentConnectionP = res.catch(() => true);
  return res;
}

export function getSession(deviceId: number): ?number {
  return connectionsMap[deviceId];
}

