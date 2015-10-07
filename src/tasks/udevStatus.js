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

import {platformInfo} from "../chrome/platformInfo";
import * as storage from "../chrome/storage";

var hasError: boolean = false;

//-1 -> undefined
// 0 -> not linux
// 1 -> linux
var cachedIsLinux: number = -1;

/**
 * Is this computer linux?
 * @return {Promise.<Boolean>} True or false, depending on OS
 */
function isLinux(): Promise<boolean> {
  if (cachedIsLinux != -1) {
    return Promise.resolve(cachedIsLinux == 1);
  }
  return platformInfo().then(function (info) {
    var isLinux = (info.os === "linux");
    cachedIsLinux = isLinux ? 1 : 0;
    return isLinux;
  })
}

/**
 * Right after install I set up a "afterInstall
 * @return {Promise.<Boolean>}
 */
function isAfterInstall(): Promise<boolean> {
  return storage.get("afterInstall").then(function (afterInstall) {
    return (afterInstall === true);
  })
}


/**
 * Sets error.
 * @param error {Boolean}
 */
function setError(error: boolean): void {
  hasError = error;
}

export function clearUdevError(): void {
  setError(false);
}

/**
 * Returns udev status.
 * @return {Promise.<String>} "display" or "hide".
 */
export function udevStatus(): Promise<string> {
  return isLinux().then(function (linux) {
    return isAfterInstall().then(function (afterInstall) {
      if ((afterInstall || hasError) && linux) {
        return "display";
      } else {
        return "hide";
      }
    });
  })
}


