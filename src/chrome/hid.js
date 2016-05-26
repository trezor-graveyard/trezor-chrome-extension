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

import * as constants from "../constants.js";

// Enumerates trezors.
export function enumerate(): Promise<Array<ChromeHidDeviceInfo>> {
  return new Promise((resolve, reject) => {
    try {
      chrome.hid.getDevices(
        constants.TREZOR_DESC,
        (devices: Array<ChromeHidDeviceInfo>): void => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(devices);
          }
        }
      );
    } catch (e) {
      reject(e);
    }
  }).then(devices => devices.filter(device => device.collections[0].usagePage !== 0xf1d0));
}

// Sends buffer to Trezor.
// A "low level" API; doesn't know about messages etc.
export function send(id: number, data: ArrayBuffer, hasReportId: boolean): Promise<void> {
  if (id == null) {
    Promise.reject("No ID to hid.send");
  }
  const reportId = hasReportId ? constants.REPORT_ID : 0;
  let sendData: ArrayBuffer = data;
  if (!hasReportId) {
    const newArray: Uint8Array = new Uint8Array(64);
    newArray[0] = 63;
    newArray.set(new Uint8Array(data), 1);
    sendData = newArray.buffer;
  }
  return new Promise((resolve, reject) => {
    try {
      chrome.hid.send(id, reportId, sendData, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}

// Recieves buffer from Trezor.
// A "low level" API; doesn't know about messages etc.
export function receive(id: number): Promise<ArrayBuffer> {
  if (id == null) {
    Promise.reject("No ID to hid.receive");
  }

  return new Promise((resolve, reject) => {
    try {
      chrome.hid.receive(id, (reportId: number, data: ArrayBuffer) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          if (reportId === 0) {
            const dataView: Uint8Array = new Uint8Array(data);

            if (dataView[0] !== 63) {
              reject("Invalid data");
            } else {
              resolve(data.slice(1));
            }
          } else {
            if (reportId === 63) {
              resolve(data);
            } else {
              reject("Invalid data");
            }
          }
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}

// Connects to the Trezor.
// Returns connection id (different from device ID)
export function connect(id: number): Promise<number> {
  if (id == null) {
    Promise.reject("No ID to hid.connect");
  }
  return new Promise((resolve, reject) => {
    try {
      chrome.hid.connect(id, (connection) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(connection.connectionId);
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}

// Disconnects from trezor.
// First parameter is connection ID (*not* device ID!)
export function disconnect(id: number): Promise<void> {
  if (id == null) {
    Promise.reject("No ID to hid.disconnect");
  }
  return new Promise((resolve, reject) => {
    try {
      chrome.hid.disconnect(id, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(undefined); // bug in flow...
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}
