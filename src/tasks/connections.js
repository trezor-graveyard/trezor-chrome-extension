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

function parseAcquireInput(input: any): {
  id: number,
  previous: ?number,
  checkPrevious: boolean
} {
  if (typeof input === "number") {
    return {id: input, previous: null, checkPrevious: false}
  } else if (typeof input === "object") {
    var id = input.path;
    var previous = input.previous;
    return {id: id, previous: previous, checkPrevious: true};
  } else {
    throw new Error("Wrong acquire input");
  }
}

var currentConnectionP: Promise = Promise.resolve();

export function acquire(input: any): Promise<{session: number}> {

  var res: Promise<{session:number}> = currentConnectionP.then(() => {

    var parsedInput = parseAcquireInput(input);
    var id = parsedInput.id;

    var realPrevious = connectionsMap[id];

    if (parsedInput.checkPrevious) {
      var error = false;
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

    var releasePromise;

    // "stealing" sessions
    // if I am already connected (in a different tab for example),
    // disconnect that one
    if (realPrevious != null) {
      return _realRelease(realPrevious).then(function(){return id;});
    } else {
      return Promise.resolve(id);
    }

  }).then(function (id) {
    return hid.connect(id).then(function (connectionId) {
      return {connectionId: connectionId, id: id};
    });
  }).then(function (o) {
    var connectionId = o.connectionId;
    var id = o.id;
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
  currentConnectionP = res.catch(function(error) {
    return;
  })
  return res;
}

function _realRelease(connectionId: number): Promise<string> {
  return hid.disconnect(connectionId).then(function () {
    var deviceId = reverse[connectionId];
    delete reverse[connectionId];
    delete connectionsMap[deviceId];
    return "Success";
  });
}

export function release(connectionId: number): Promise<string> {
  var res = currentConnectionP.then(function() {
    return _realRelease(connectionId);
  });
  currentConnectionP = res.catch(function(error) {
    return;
  });
  return res;
}

export function getSession(deviceId: number): ?number {
  return connectionsMap[deviceId];
}

