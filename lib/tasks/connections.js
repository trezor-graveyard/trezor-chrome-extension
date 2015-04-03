/**
 * This file is part of the TREZOR project.
 *
 * Copyright (C) 2015 SatoshiLabs <info@satoshilabs.com>
 *           (C) 2014 Mike Tsao <mike@sowbug.com>
 *           (C) 2015 William Wolf <throughnothing@gmail.com>
 *
 * This library is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
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
var hid = require('../hid');

// global object with deviceId => connectionId mapping
var connectionsMap = {};
var reverse = {};

function acquire(id) {

  return hid.connect(id).then(function (connectionId) {
    connectionsMap[id] = connectionId;
    reverse[connectionId] = id;

    return {
      session: connectionId
    }
  });
}

function release(connectionId) {
   return hid.disconnect(connectionId).then(function(connectionId) {
        var deviceId = reverse[connectionId];
        delete reverse.connectionId;
        delete connectionsMap.deviceId;
        return "Success";
   });
}

function getSession(deviceId) {
    return connectionsMap[deviceId];
}

module.exports.acquire = acquire;
module.exports.release = release;
module.exports.getSession = getSession;
