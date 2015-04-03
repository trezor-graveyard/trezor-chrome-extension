/**
 * This file is part of the TREZOR project.
 *
 * Copyright (C) 2015 SatoshiLabs <info@satoshilabs.com>
 *           (C) 2014 Mike Tsao <mike@sowbug.com>
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
var hid = require('../hid');
var connections = require('./connections');

/**
 * Converts a HID device to a description that trezor.js understands
 * @param {HidDeviceInfo} device
 * @returns {Object}
 */
function deviceToJSON(device) {
  var path = device.deviceId;
  var vendor = device.vendorId;
  var product = device.productId;
  var serialNumber = ""; //TODO: is this needed?
  var session = connections.getSession(path);
  return {
    path: path,
    vendor: vendor,
    product: product,
    serialNumber: serialNumber,
    session: session
  };
}

/**
 * Converts a HID device array to a description that trezor.js understands.
 * It also sorts the array so it's consistent - and can be compared to former state
 * when doing listen
 * @param {Array.<HidDeviceInfo>} devices
 * @returns {Array.<Object>}
 */
function devicesToJSON(devices) {

  function compare(a, b) {
    if (a.deviceId < b.deviceId)
      return -1;
    if (a.deviceId > b.deviceId)
      return 1;
    return 0;
  }

  return devices.sort(compare).map(deviceToJSON);
}


/**
 * Returns devices in JSON form
 * @returns {Array.<Object>}
 */
function enumerate() {
  return hid.enumerate().then(function (devices) {
    return devicesToJSON(devices);
  });
}

module.exports = enumerate;
