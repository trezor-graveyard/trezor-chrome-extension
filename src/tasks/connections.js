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
const connectionsMap: {[keys: string]: number} = {};
const reverse: {[keys: string]: number} = {};

// deviceId => boolean
const _hasReportId: {[keys: string]: boolean} = {};

export function setReportIds(devices: Array<ChromeHidDeviceInfo>) {
  devices.forEach(device => {
    _hasReportId[device.deviceId.toString()] = device.collections[0].reportIds.length !== 0;
  });
}

// session ID => boolean
export function hasReportId(connectionId: number): boolean {
  const deviceId: number = reverse[connectionId.toString()];
  return _hasReportId[deviceId.toString()];
}

function parseAcquireInput(input: any): {
  id: number,
  previous: ?number,
  checkPrevious: boolean
} {
  if (typeof input === "object") {
    const id = parseInt(input.path);
    if (isNaN(id)) {
      throw new Error("Wrong acquire input");
    }
    const previous = input.previous;
    return {id: id, previous: previous, checkPrevious: true};
  } else {
    const id = parseInt(input);
    if (isNaN(id)) {
      throw new Error("Wrong acquire input");
    }
    return {id: input, previous: null, checkPrevious: false};
  }
}

let currentP: Promise = Promise.resolve();

export function lockConnection<X>(fn: () => Promise<X>): Promise<X> {
  const res = currentP.then(() => fn());
  currentP = res.catch(() => true);
  return res;
}

export function acquire(input: any): Promise<{session: number}> {
  return lockConnection(() => {
    return Promise.resolve().then(() => {
      const parsedInput = parseAcquireInput(input);
      const id = parsedInput.id;

      const realPrevious = connectionsMap[id.toString()];

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
      const connectionId: number = o.connectionId;
      const id: number = o.id;
      connectionsMap[id.toString()] = connectionId;
      reverse[connectionId.toString()] = id;

      return {
        session: connectionId,
      };
    }).catch((error) =>
      // note: this re-rejects with the same error always
      catchUdevError(error)
    );
  });
}

const onRelease: {[connectionId: string]: Array<() => void>} = {};

function _realRelease(connectionId: number): Promise<string> {
  return hid.disconnect(connectionId).then(() => {
    return releaseCleanup(connectionId);
  });
}

function releaseCleanup(connectionId: number): string {
  const connectionIdStr: string = connectionId.toString();
  const deviceIdStr = reverse[connectionIdStr].toString();
  delete reverse[connectionIdStr];
  delete connectionsMap[deviceIdStr];
  if (onRelease[connectionIdStr] != null) {
    onRelease[connectionIdStr].forEach(fun => fun());
  }
  delete onRelease[connectionIdStr];
  return "Success";
}

export function releaseDisconnected(devices: Array<ChromeHidDeviceInfo>) {
  const connected = {};
  devices.forEach(device => {
    connected[device.deviceId.toString()] = true;
  });
  Object.keys(connectionsMap).forEach((deviceId: string) => {
    if (connected[deviceId] == null) {
      if (connectionsMap[deviceId] != null) {
        releaseCleanup(connectionsMap[deviceId]);
      }
    }
  });
}

export function doOnRelease(connectionId: number, fun: () => void) {
  const id = connectionId.toString();
  if (onRelease[id] == null) {
    onRelease[id] = [];
  }
  onRelease[id].push(fun);
}

export function release(connectionId: number): Promise<string> {
  const id = parseInt(connectionId);
  if (isNaN(id)) {
    throw new Error("Wrong release input");
  }

  return lockConnection(() => _realRelease(id));
}

export function getSession(deviceId: number): ?number {
  return connectionsMap[deviceId.toString()];
}

