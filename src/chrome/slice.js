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

export function maybeSlice(
  data: ArrayBuffer,
  slice: boolean,
  resolve: (data: ArrayBuffer) => void,
  reject: (e: Error) => void
) {
  if (slice) {
    const dataView: Uint8Array = new Uint8Array(data);

    if (dataView[0] !== 63) {
      reject(new Error("Invalid data"));
    } else {
      resolve(data.slice(1));
    }
  } else {
    resolve(data);
  }
}

export function maybeAdd(
  data: ArrayBuffer,
  add: boolean
): ArrayBuffer {
  if (!add) {
    return data;
  }

  const newArray: Uint8Array = new Uint8Array(64);
  newArray[0] = 63;
  newArray.set(new Uint8Array(data), 1);
  return newArray.buffer;
}
