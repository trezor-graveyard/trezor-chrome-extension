/**
 * This file is part of the TREZOR project.
 *
 * Copyright (C) 2015 SatoshiLabs <info@satoshilabs.com>
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


/**
 * Chrome's extension storage is actually more complicated
 * than LocalStorage, because it uses callbacks =>
 * I am converting them to (IMO) more manageable Promises
 */

'use strict';
var Promise = require('promise');


/**
 * Get from storage
 * @param {String} key
 * @returns {Promise.<Object>} Thing from the storage, or null
 */
module.exports.get = function (key) {
  return new Promise(function (resolve, reject) {
    try {
      chrome.storage.local.get(key, function (items) {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          if (items[key] === null || items[key] === undefined) {
            resolve(null);
          } else {
            resolve(items[key]);
          }
          resolve(items);
        }
      })
    } catch (e) {
      reject(e);
    }
  })
}

/**
 * Get from storage
 * @param {String} key
 * @returns {Promise.<Object>} Thing from the storage, or null
 */
module.exports.set = function (key, value) {
  return new Promise(function (resolve, reject) {
    try {
      var obj = {};
      obj[key] = value;
      chrome.storage.local.set(obj, function () {
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
