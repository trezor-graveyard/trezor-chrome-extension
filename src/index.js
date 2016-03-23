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

import {patch} from "./protobuf/monkey_patch.js";
patch();

import {tasks} from "./tasks";
import * as storage from "./chrome/storage";
import type {Messages} from "./protobuf/messages";
import type {ChromeMessageSender} from "chromeApi";

type MessageToTrezor = {id: ?number, type: ?string, message: Object};
type MessageFromTrezor = {type: string, message: Object};
type StatusInfo = {version: string, configured: boolean}

// description of messages, loaded by configure
// if null -> either not configured yet, or background page killed/restarted
let messages: ?Messages = null;

// when we try to read messages and it's null, we look into storage
// if it's not saved. If it is saved, we try to configure again
function messagesReload(): Promise<Messages> {
  if (messages == null) {
    return storage.get("savedConfigure").then((body: string) => {
      // note - if configure becomes old, this invalidates and fails
      // but whenever we call "configure" this gets overwritten
      return tasks.configure(body);
    }, () => {
      return Promise.reject(new Error("No protocol definition, call configure"));
    }).then((_messages) => {
      messages = _messages;
      return _messages;
    });
  } else {
    return Promise.resolve(messages);
  }
}

const responseFunctions = {
  ping: tasks.ping,
  enumerate: tasks.enumerate,
  listen: tasks.listen,
  acquire: tasks.acquire,
  release: tasks.release,
  udevStatus: tasks.udevStatus,

  call: (body: MessageToTrezor): Promise<MessageFromTrezor> => {
    return messagesReload().then((messages: Messages) => {
      return tasks.call(body, messages);
    });
  },

  configure: (body: string): Promise<string> => {
    return storage.set("savedConfigure", body).then(() => {
      return tasks.configure(body);
    }).then((loadedMessages: Messages): void => {
      messages = loadedMessages;
    }).then((): string => {
      return "Success";
    });
  },

  info: (): Promise<StatusInfo> => {
    const hasMessagesP: Promise<boolean> = messagesReload().then(() => {
      return true;
    }, () => {
      return false;
    });

    return hasMessagesP.then((hasMessages: boolean) => {
      return tasks.version().then((version: string): StatusInfo => {
        return {
          version: version,
          configured: hasMessages,
        };
      });
    });
  },
};

function handleMessage(request: Object, sender: ChromeMessageSender, sendResponse: (response: Object) => void): boolean {
  if (process.env.NODE_ENV === "debug") {
    console.log("Message arrived: ", request);
  }

  const responseFunction = (responseFunctions[request.type])
    ? responseFunctions[request.type]
    : tasks.none;

  const nonThrowingResponse = (body) => {
    try {
      return responseFunction(body);
    } catch (e) {
      return Promise.reject(e);
    }
  };

  nonThrowingResponse(request.body).then((responseBody) => {
    if (process.env.NODE_ENV === "debug") {
      console.log("Response sent: ", JSON.parse(JSON.stringify(responseBody)), JSON.parse(JSON.stringify(request)));
    }

    sendResponse({
      type: "response",
      body: responseBody,
    });
  }).catch((error) => {
    if (process.env.NODE_ENV === "debug") {
      console.log("Error sent: ", error, JSON.parse(JSON.stringify(request)));
    }

    sendResponse({
      type: "error",
      message: error.message || error,
    });
  });

  // "return true" is necessary for asynchronous message passing,
  // don't remove it!
  return true;
}

chrome.runtime.onMessage.addListener(handleMessage);
chrome.runtime.onMessageExternal.addListener(handleMessage);

storage.get("afterInstall").then((afterInstall) => {
  if (afterInstall === null) {
    return storage.set("afterInstall", true);
  }
}).catch((e) => {
  console.error(e);
});

let windowOpen : boolean = false;

chrome.app.runtime.onLaunched.addListener(() => {
  if (!windowOpen) {
    chrome.app.window.create("management/index.html", {
      "innerBounds": {
        "width": 774,
        "height": 774,
      },
    }, (newWindow) => {
      windowOpen = true;
      newWindow.onClosed.addListener(() => {
        windowOpen = false;
      });
    });
  }
});

