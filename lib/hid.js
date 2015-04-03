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

var Promise = require('promise');
var constants = require('../constants.js');


/**
 * Enumerates trezors.
 * @returns {Promise.<Array.<HidDeviceInfo>>} devices
 */
module.exports.enumerate = function () {
  return new Promise(function (resolve, reject) {
    try {

      chrome.hid.getDevices(
        constants.TREZOR_DESC,
        function (devices) {
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
  });
}


/**
 * Sends buffer to Trezor.
 *
 * A "low level" API; doesn't know about messages etc.
 * @param {integer} id ConnectionId of Trezor (returned by chrome.hid.connect)
 * @param {ArrayBuffer} data Raw data to push to trezor.
 * @return {Promise} Resolves iff the data is successfully pushed
 */
module.exports.send = function (id, data) {
  if (id == null) {
    Promise.reject("No ID to hid.send");
  }
  return new Promise(function (resolve, reject) {
    try {

      chrome.hid.send(id, constants.REPORT_ID, data, function () {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });

    } catch (e) {
      reject(e);
    }
  })
}

/**
 * Recieves buffer from Trezor.
 *
 * A "low level" API; doesn't know about messages etc.
 * @param {integer} id ConnectionId of Trezor (returned by chrome.hid.connect)
 * @returns {Promise.<ArrayBuffer>} Raw data from trezor, or rejected if error
 */
module.exports.receive = function (id) {
  if (id == null) {
    Promise.reject("No ID to hid.receive");
  }

  return new Promise(function (resolve, reject) {
    try {

      chrome.hid.receive(id, function (reportId, data) {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(data);
        }
      });

    } catch (e) {
      reject(e);
    }
  });
};


module.exports.connect = function (id) {
  if (id == null) {
    Promise.reject("No ID to hid.connect");
  }
  return new Promise(function (resolve, reject) {
    try {
      chrome.hid.connect(id, function (connection) {
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
};

module.exports.disconnect = function(id) {
  if (id == null) {
    Promise.reject("No ID to hid.disconnect");
  }
  return new Promise(function (resolve, reject) {
    try {
      chrome.hid.disconnect(id, function (connection) {
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
