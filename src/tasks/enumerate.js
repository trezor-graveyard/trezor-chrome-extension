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
import * as connections from "./connections";
import type {Messages} from "../protobuf/messages.js";
//import {setCurrentRunning, currentRunning} from "../index.js";

export class TrezorDeviceInfo {
  path: number;
  vendor: number;
  product: number;
  serialNumber: number; //always 0
  session: ?number; //might be null/undefined
  constructor(device: ChromeHidDeviceInfo) {
    this.path = device.deviceId;
    this.vendor = device.vendorId;
    this.product = device.productId;
    this.serialNumber = 0;
    this.session = connections.getSession(this.path);
  }
}

// going around Chrome bug
var disconnected: {[deviceId: number]: boolean} = {};


/**
 * Converts a HID device array to a description that trezor.js understands.
 * It also sorts the array so it's consistent - and can be compared to former state
 * when doing listen
 * @param {Array.<HidDeviceInfo>} devices
 * @returns {Array.<Object>}
 */
function devicesToJSON(devices: Array<ChromeHidDeviceInfo>): Array<TrezorDeviceInfo> {

  function compare(a: ChromeHidDeviceInfo, b: ChromeHidDeviceInfo): number {
    if (a.deviceId < b.deviceId)
      return -1;
    if (a.deviceId > b.deviceId)
      return 1;
    return 0;
  }

  return devices.sort(compare).map( d => new TrezorDeviceInfo(d));
}




/**
 * Returns devices in JSON form
 * @returns {Array.<Object>}
 */
export function enumerate(messages:Messages): Promise<Array<TrezorDeviceInfo>> {
  var res: Promise = Promise.resolve().then(function(){
  //var res: Promise = currentRunning.then(function(){
    return hid.enumerate().then(function (devices: Array<ChromeHidDeviceInfo>): Array<TrezorDeviceInfo> {
    
    
    /*var converted = devicesToJSON(devices.filter(function(device) {
      return !(disconnected[device.deviceId]);
    }));
    */
    var converted: Array<TrezorDeviceInfo> = devicesToJSON(devices);
    
    
        return converted.filter(function(device: TrezorDeviceInfo): boolean {
          return !(disconnected[device.path]);
        })
    });
  })
  //setCurrentRunning(res.catch(function(e){}));
  return res;
}

function stopEnumeratingDevice(id: number) {
  disconnected[id] = true;
}


/**
 * Helper function for catching udev errors. It gets called in
 * tasks/call.js (only in initialize) and tasks/connections.js (in acquire).
 * @return {Promise} Rejection with the original error
 */
export function catchConnectionError (error: Error, deviceId: number): Promise {
  var errMessage = error;
  if (errMessage.message !== undefined) {
    errMessage = errMessage.message;
  }
  // A little heuristics. If error message is one of these and the type of original message is initialization, it's
  // probably udev error.
  if (errMessage === "Failed to open HID device." || errMessage === "Transfer failed.") {
    stopEnumeratingDevice(deviceId);
  }
  return Promise.reject(error);

}
