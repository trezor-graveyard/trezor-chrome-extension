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


var ProtoBuf = require('protobufjs');
var ByteBuffer = require('protobufjs').ByteBuffer;

// monkey-patching ProtoBuf,
// so that bytes are loaded correctly from hexadecimal
module.exports.patch = function () {
  ProtoBuf.Reflect.Message.Field.prototype.verifyValueOriginal = ProtoBuf.Reflect.Message.Field.prototype.verifyValue;

  ProtoBuf.Reflect.Message.Field.prototype.verifyValue = function (value, skipRepeated) {
    var newValue = value;
    if (this.type === ProtoBuf.TYPES["bytes"]) {
      console.log("Maybe converting from ", value);

      if (value != null) {
        if (typeof value === "string") {
          console.log("Converting from ", value);
          newValue = ByteBuffer.wrap(value, "hex");
          console.log("Converted to ", newValue);
        }
      }
    }
    return this.verifyValueOriginal(newValue, skipRepeated);
  }

}
