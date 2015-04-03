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

require('./protobuf/monkey_patch.js').patch();

var Tasks = require('./tasks');
var Promise = require('promise');

// description of messages, loaded by configure
// if null -> not configured yet
var messages = null;

var responseFunctions = {
  ping: Tasks.ping,
  enumerate: Tasks.enumerate,
  listen: Tasks.listen,
  acquire: Tasks.acquire,
  release: Tasks.release,

  call: function (body) {
    if (messages == null) {
        return Promise.reject(new Error("No protocol definition, call configure"))
    }
    return Tasks.call(body, messages);
  },

  configure: function (body) {
    return Tasks.configure(body).then(function (loadedMessages) {
      messages = loadedMessages;
    }).then(function () {
      return "Success"
    });
  }
}

function handleMessage (request, sender, sendResponse) {
  console.log("Message arrived: ", request);

  var responseFunction = Tasks.none;

  if (responseFunctions[request.type]) {
    responseFunction = responseFunctions[request.type];
  }

  var nonThrowingResponse = function(body){
    try {
        return responseFunction(body);
    } catch (e) {
        return Promise.reject(e);
    }
  }

  nonThrowingResponse(request.body).then(function (responseBody) {

    console.log("Response sent: ", responseBody);
    sendResponse({
      type: "response",
      body: responseBody
    });

  }).catch(function (error) {
    console.log("Error sent: ", error);

    sendResponse({
      type: "error",
      message: error.message || error
    });

  });

  // "return true" is necessary for asynchronous message passing,
  // don't remove it!
  return true;
}

chrome.runtime.onMessageExternal.addListener(handleMessage);

//module.exports = {};
