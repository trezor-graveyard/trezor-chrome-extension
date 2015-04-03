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

/**
 * All the "actual logic" is encapsulated in this module
 */




function none() {
  return Promise.reject("unknown message type");
}

function ping() {
  return Promise.resolve("pong");
}

module.exports = {
    enumerate: require('./enumerate'),
    listen: require('./listen'),
    call: require('./call'),
    none: none,
    ping: ping,
    //configure:ping, 
    configure: require('./configure'),
    acquire: require('./connections').acquire,
    release: require('./connections').release
}


