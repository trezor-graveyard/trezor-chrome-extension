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
import * as connections from "./connections";
import * as constants from "../constants.js";

export type TrezorDeviceInfo = {
  path: number | string;
  vendor: number;
  product: number;
  serialNumber: number; // always 0
  session: ?(number | string); // might be null/undefined
}

function deviceToJSON(device: ChromeHidDeviceInfo): TrezorDeviceInfo {
  return {
    path: device.deviceId,
    vendor: device.vendorId,
    product: device.productId,
    serialNumber: 0,
    session: connections.getSession(device.deviceId),
  };
}

function udpToJSON(udp: number): TrezorDeviceInfo {
  return {
    path: "udp" + udp,
    vendor: constants.TREZOR_VENDOR_ID,
    product: constants.TREZOR_PRODUCT_ID,
    serialNumber: 0,
    session: connections.getSession("udp" + udp),
  };
}

// Converts a HID device array to a description that trezor.js understands.
// It also sorts the array so it's consistent - and can be compared to former state
// when doing listen
function devicesToJSON(devices: Array<ChromeHidDeviceInfo>): Array<TrezorDeviceInfo> {
  const compare = (a: ChromeHidDeviceInfo, b: ChromeHidDeviceInfo): number => {
    if (a.deviceId < b.deviceId) {
      return -1;
    }
    if (a.deviceId > b.deviceId) {
      return 1;
    }
    return 0;
  };

  return devices.sort(compare).map(d => deviceToJSON(d));
}

// Returns devices in JSON form
export function enumerate(): Promise<Array<TrezorDeviceInfo>> {
  return connections.lockConnection(() => {
    return hid.enumerate().then((devices: Array<ChromeHidDeviceInfo>): Array<TrezorDeviceInfo> => {
      connections.setReportIds(devices);
      return devicesToJSON(devices);
    }).then((devices: Array<TrezorDeviceInfo>): Array<TrezorDeviceInfo> => {
      const all = devices.concat(connections.udpPorts.map(port => udpToJSON(port)));
      connections.releaseDisconnected(all);
      return all;
    });
  });
}
