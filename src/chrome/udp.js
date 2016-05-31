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

import {defer} from "../defer";
import type {Deferred} from "../defer";
import * as slice from "./slice";

const waiting: {[id: string]: Deferred<ArrayBuffer>} = {};
const buffered: {[id: string]: Array<ArrayBuffer>} = {};

const infos: {[id: string]: {address: string, port: number}} = {};

export function disconnect(id: number): Promise {
  return new Promise((resolve, reject) => {
    try {
      chrome.sockets.udp.close(id, () => {
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

export function connect(address: string, port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    try {
      chrome.sockets.udp.create({}, ({socketId}) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          try {
            chrome.sockets.udp.bind(socketId, "127.0.0.1", port + 3, (result: number) => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                if (result >= 0) {
                  infos[socketId.toString()] = {address: address, port: port};
                  resolve(socketId);
                } else {
                  reject(`Cannot create socket, error: ${result}`);
                }
              }
            });
          } catch (e) {
            reject(e);
          }
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}

export function receive(socketId: number): Promise<ArrayBuffer> {
  return receiveUnsliced(socketId).then(data =>
    new Promise((resolve, reject) => slice.maybeSlice(data, true, resolve, reject))
  );
}

function receiveUnsliced(socketId: number): Promise<ArrayBuffer> {
  const id = socketId.toString();

  if (buffered[id] != null) {
    const res = buffered[id].shift();
    if (buffered[id].length === 0) {
      delete buffered[id];
    }
    return Promise.resolve(res);
  }

  if (waiting[id] != null) {
    return Promise.reject(`Something else already listening on socketId ${socketId}`);
  }
  const d = defer();
  waiting[id] = d;
  return d.promise;
}

export function send(socketId: number, data: ArrayBuffer): Promise<void> {
  const id = socketId.toString();
  const info = infos[id];
  if (info == null) {
    return Promise.reject(`Socket ${socketId} does not exist`);
  }

  const sendData: ArrayBuffer = slice.maybeAdd(data, true);

  return new Promise((resolve, reject) => {
    try {
      chrome.sockets.udp.send(socketId, sendData, info.address, info.port, ({resultCode}) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          if (resultCode >= 0) {
            resolve();
          } else {
            reject(`Cannot send, error: ${resultCode}`);
          }
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}

chrome.sockets.udp.onReceive.addListener(({socketId, data}) => {
  const id = socketId.toString();
  const d: ?Deferred<ArrayBuffer> = waiting[id];
  if (d != null) {
    d.resolve(data);
    delete waiting[id];
  } else {
    if (buffered[id] == null) {
      buffered[id] = [];
    }
    buffered[id].pop(data);
  }
});
