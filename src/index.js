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

import {patch} from "./protobuf/monkey_patch.js";
patch();

import {tasks} from "./tasks";
import * as storage from "./chrome/storage";
import type {Messages} from "./protobuf/messages";
import type {ChromeMessageSender} from 'chromeApi';

type MessageToTrezor = {id: ?number, type: ?string, message: Object};
type MessageFromTrezor = {type: string, message: Object};
type StatusInfo = {version: string, configured: boolean}

// description of messages, loaded by configure
// if null -> either not configured yet, or background page killed/restarted
var messages: ?Messages = null;

// when we try to read messages and it's null, we look into storage
// if it's not saved. If it is saved, we try to configure again
function messagesReload(): Promise<Messages> {
  if (messages == null) { 
    return storage.get("savedConfigure").then(function (body: string) {
      // note - if configure becomes old, this invalidates and fails
      // but whenever we call "configure" this gets overwritten
      return tasks.configure(body); 
    }, function() {
      return Promise.reject(new Error("No protocol definition, call configure"))
    }).then(function (_messages) {
      messages = _messages;
      return _messages;
    })
  } else {
    return Promise.resolve(messages);
  }

}



var responseFunctions = {
  ping: tasks.ping,
  enumerate: tasks.enumerate,
  listen: tasks.listen,
  acquire: tasks.acquire,
  release: tasks.release,
  udevStatus: tasks.udevStatus,

  call: function (body: MessageToTrezor): Promise<MessageFromTrezor> {
    return messagesReload().then(function (messages: Messages){
      return tasks.call(body, messages);
    });
  },

  configure: function (body: string): Promise<string> {
    return storage.set("savedConfigure", body).then(function () {
      return tasks.configure(body)
    }).then(function (loadedMessages: Messages): void {
      messages = loadedMessages;
    }).then(function (): string {
      return "Success"
    });
  },

  info: function(): Promise<StatusInfo> {
    var hasMessagesP: Promise<boolean> = messagesReload().then( function() {
      return true;
    }, function() {
      return false;
    })

    return hasMessagesP.then(function (hasMessages: boolean) {
      return tasks.version().then(function (version: string): StatusInfo {
        return {
          version: version,
          configured: hasMessages
        };
      });
    });
  },
}

function handleMessage(request: Object, sender: ChromeMessageSender, sendResponse: (response: Object) => void): boolean {

  if (process.env.NODE_ENV === "debug") {
    console.log("Message arrived: ", request);
  }

  var responseFunction = tasks.none;

  if (responseFunctions[request.type]) {
    responseFunction = responseFunctions[request.type];
  }

  var nonThrowingResponse = function (body) {
    try {
      return responseFunction(body);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  nonThrowingResponse(request.body).then(function (responseBody) {
  
    if (process.env.NODE_ENV === "debug") {
      console.log("Response sent: ", responseBody);
    }

    sendResponse({
      type: "response",
      body: responseBody
    });

  }).catch(function (error) {
    if (process.env.NODE_ENV === "debug") {
      console.log("Error sent: ", error);
    }

    sendResponse({
      type: "error",
      message: error.message || error
    });

  });

  // "return true" is necessary for asynchronous message passing,
  // don't remove it!
  return true;
}

chrome.runtime.onMessage.addListener(handleMessage);
chrome.runtime.onMessageExternal.addListener(handleMessage);

storage.get("afterInstall").then(function (afterInstall) {
  if (afterInstall === null) {
    return storage.set("afterInstall", true);
  }
}).catch(function (e) {
  console.error(e)
})

var windowOpen : boolean = false;

chrome.app.runtime.onLaunched.addListener(function () {
  if (!windowOpen) {
    chrome.app.window.create('management/index.html', {
      'innerBounds': {
        'width': 774,
        'height': 774
      }
    }, function (newWindow) {
      windowOpen = true;
      newWindow.onClosed.addListener(function () {
        windowOpen = false;
      });

    });
  }
});

