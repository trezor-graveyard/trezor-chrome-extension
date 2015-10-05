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
import * as hid from "../chrome/hid";
import {catchUdevError} from "./udevStatus";

// global object with deviceId => connectionId mapping
var connectionsMap: {[keys: number]: number} = {};
var reverse: {[keys: number]: number} = {};

export function acquire(id: number): Promise<{session: number}> {

  var releasePromise;

  // "stealing" sessions
  // if I am already connected (in a different tab for example),
  // disconnect that one
  if (connectionsMap[id] != null) {
    releasePromise = release(connectionsMap[id]);
  } else {
    releasePromise = Promise.resolve();
  }

  var res: Promise<{session:number}> = releasePromise.then(function () {

    return hid.connect(id);

  }).then(function (connectionId) {
    connectionsMap[id] = connectionId;
    reverse[connectionId] = id;

    return {
      session: connectionId
    }
  });
  // even when we catch udev error, return rejection
  res.catch(function(error) {
    return catchUdevError(error);
  });
  return res;
}

export function release(connectionId: number): Promise<string> {
  return hid.disconnect(connectionId).then(function () {
    var deviceId = reverse[connectionId];
    delete reverse[connectionId];
    delete connectionsMap[deviceId];
    return "Success";
  });
}

export function getSession(deviceId: number): ?number {
  return connectionsMap[deviceId];
}

export function getDevice(sessionId: number): ?number {
  return reverse[sessionId];
}

