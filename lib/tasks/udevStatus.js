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
var platformInfo = require('../chrome/platformInfo');
var storage = require('../chrome/storage');
var Promise = require('promise');

var hasError = false;

var cachedIsLinux;

/**
 * Is this computer linux?
 * @return {Promise.<Boolean>} True or false, depending on OS
 */
function isLinux() {
  if (cachedIsLinux !== undefined) {
    return Promise.resolve(cachedIsLinux);
  }
  return platformInfo.platformInfo().then(function (info) {
    cachedIsLinux = (info.os === "linux");
    return cachedIsLinux;
  })
}

/**
 * Right after install I set up a "afterInstall
 * @return {Promise.<Boolean>}
 */
function isAfterInstall() {
  return storage.get("afterInstall").then(function (afterInstall) {
    return (afterInstall === true);
  })
}


/**
 * Sets error.
 * @param error {Boolean}
 */
function setError(error) {
  hasError = error;
}

module.exports.setError = setError;

/**
 * Returns udev status.
 * @return {Promise.<String>} "display" or "hide".
 */
function udevStatusNow() {
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

/**
 * Returns udev status, but don't return right now;
 * rather wait for "display" for 20 seconds and only then return "hide".
 *
 * I don't want to post "hide" through messages every 100 ms, but I want to post
 * "display" immediately
 */
module.exports.udevStatus = function () {
  /*return new Promise(function (resolve, reject) {
    try {
      var i = 0;

      function tryStatus() {
        udevStatusNow().then(function (stat) {
          if (stat !== "hide") {
            resolve(stat);
          }
          if (i === 100) {
            resolve(stat);
          }
          i++;
          window.setTimeout(tryStatus, 100);
        }).catch(reject);
      }

      window.setTimeout(tryStatus, 50);

    } catch (e) {
      reject(e);
    }

  });*/
  return new Promise(function (resolve, reject) {
    try {
      function returnStatus() {
        udevStatusNow().then(function (stat) {
          resolve(stat);
        });
      }
      window.setTimeout(returnStatus, 50);
    } catch (e) {
      reject(e)
    }
  });
}

/**
 * Helper function for catching udev errors. It gets called in
 * tasks/call.js (only in initialize) and tasks/connections.js (in acquire).
 * @return {Promise} Rejection with the original error
 */
module.exports.catchUdevError = function (error) {
  var errMessage = error;
  if (errMessage.message !== undefined) {
    errMessage = errMessage.message;
  }
  // A little heuristics. If error message is one of these and the type of original message is initialization, it's
  // probably udev error.
  if (errMessage === "Failed to open HID device." || errMessage === "Transfer failed.") {
    setError(true);
  }
  return Promise.reject(error);

}
