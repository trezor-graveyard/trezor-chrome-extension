/*global angular*/

angular.module('webwalletApp')
  .value('_', window._)
  .value('Buffer', window.vendor.Buffer)
  .value('ecurve', window.vendor.ecurve)
  .value('bitcoin', window.vendor.bitcoin)
  .value('base58check', window.vendor.bs58check);

angular.module('webwalletApp').factory('selecter', function () {
  return {
    selectRange: function (elem) {
      var selection, range,
        document = window.document,
        body = document.body;

      if (body.createTextRange) { // ms
        range = body.createTextRange();
        range.moveToElementText(elem);
        range.select();
        return;
      }

      if (window.getSelection) { // moz, opera, webkit
        selection = window.getSelection();
        range = document.createRange();
        range.selectNodeContents(elem);
        selection.removeAllRanges();
        selection.addRange(range);
        return;
      }
    }

  };
});

angular.module('webwalletApp').directive('debug', function () {
  return {
    restrict: 'E',
    transclude: true,
    template: '<div class="debug" ng-if="debug" ng-transclude></div>',
    controller: function (config, $scope) {
      $scope.debug = config.debug;
    }
  };
});

angular.module('webwalletApp').filter('amount', function (utils) {
  var MIN_DIGITS = 2;
  var PAD_DIGITS = 8;

  return function (amount, sign) {
    var str = utils.amount2str(amount);

    // find the fraction dot
    var dot = str.indexOf('.');
    if (dot < 0) {
      str = str + '.';
      dot = str.length - 1;
    }

    // make sure we have at least MIN_DIGITS
    var digits = str.length - dot - 1;
    if (digits < MIN_DIGITS) {
      str = str + new Array(MIN_DIGITS - digits + 1).join('0');
      digits = MIN_DIGITS;
    }

    // pad with spaces
    var padding = PAD_DIGITS - digits;
    if (padding > 0) {
      str = str + new Array(padding + 1).join(' ');
    }

    // prepend the sign
    if (sign && str >= 0) {
      str = '+' + str;
    }

    return str;
  };
});

angular.module('webwalletApp').filter('ordinal', function () {
  return function (val) {
    var i = 'th';

    switch (+val % 10) {
    case 1:
      i = 'st';
      break;
    case 2:
      i = 'nd';
      break;
    case 3:
      i = 'rd';
      break;
    }
    switch (+val % 100) {
    case 11:
    case 12:
    case 13:
      i = 'th';
      break;
    }

    return '' + val + i;
  };
});

angular.module('webwalletApp').filter('bip32Path', function () {
  return function (val) {
    return 'm/' + val.map(function (x) {
      return (x & 0x80000000) ? (x & 0x7FFFFFFF) + "'" : x;
    }).join('/');
  };
});

angular.module('webwalletApp').service('utils', function Utils(
  config,
  trezor,
  trezorApi,
  ecurve,
  bitcoin,
  base58check,
  Buffer,
  _,
  $q,
  $log,
  $http,
  $interval,
  $timeout,
  $location,
  $rootScope) {

  //
  // codecs
  //

  function stringToBytes(str) {
    return new Buffer(str, 'binary');
  }

  function bytesToString(bytes) {
    return new Buffer(bytes).toString('binary');
  }

  function base64ToBytes(str) {
    return new Buffer(str, 'base64');
  }

  function bytesToBase64(bytes) {
    return new Buffer(bytes).toString('base64');
  }

  function hexToBytes(str) {
    return new Buffer(str, 'hex');
  }

  function bytesToHex(bytes) {
    return new Buffer(bytes).toString('hex');
  }

  function utf8ToHex(utf8) {
    var str = unescape(encodeURIComponent(utf8));
    return bytesToHex(stringToBytes(str));
  }

  function hexToUtf8(hex) {
    var str = bytesToString(hexToBytes(hex));
    return decodeURIComponent(escape(str));
  }

  this.stringToBytes = stringToBytes;
  this.bytesToString = bytesToString;

  this.base64ToBytes = base64ToBytes;
  this.bytesToBase64 = bytesToBase64;

  this.hexToBytes = hexToBytes;
  this.bytesToHex = bytesToHex;

  this.utf8ToHex = utf8ToHex;
  this.hexToUtf8 = hexToUtf8;

  //
  // numeric amounts
  //

  function amount2str(n) {
    return (n / 100000000).toString();
  }

  function str2amount(s) {
    // check the decimal places
    var parts = s.split('.');
    if (parts.length === 2) {
      var decpart = parts[1];
      if (decpart.length > 8) {
        throw new TypeError("Amount has too many decimals");
      }
    }

    // convert to number
    var n = +s;
    var res = Math.round(n * 1e8);
    if (isNaN(res)) {
      throw new TypeError("Amount is not a number");
    }

    return res;
  }

  this.amount2str = amount2str;
  this.str2amount = str2amount;

  //
  // crypto
  //

  function sha256x2(value) {
    return bitcoin.crypto.hash256(value);
  }

  this.sha256x2 = sha256x2;

  //
  // http
  //

  function httpPoll(config, throttle) {
    var deferred = $q.defer(),
      promise = deferred.promise,
      cancelled = false,
      request;

    promise.cancel = function () {
      cancelled = true;
    };

    request = _.throttle(function () {
      $http(config)
        .then(function (res) {
          if (!cancelled) {
            deferred.notify(res);
            request();
          }
        })
        .catch(deferred.reject);
    }, throttle);

    request();

    return promise;
  }

  this.httpPoll = httpPoll;

  //
  // hdnode
  //

  // decode private key from xprv base58 string to hdnode structure
  function xprv2node(xprv) {
    var bytes = base58check.decode(xprv),
      hex = bytesToHex(bytes),
      node = {};

    if (hex.substring(90, 92) !== '00')
      throw new Error('Contains invalid private key');

    node.depth = parseInt(hex.substring(8, 10), 16);
    node.fingerprint = parseInt(hex.substring(10, 18), 16);
    node.child_num = parseInt(hex.substring(18, 26), 16);
    node.chain_code = hex.substring(26, 90);
    node.private_key = hex.substring(92, 156); // skip 0x00 indicating privkey

    return node;
  }

  // decode public key from xpub base58 string to hdnode structure
  function xpub2node(xpub) {
    var bytes = base58check.decode(xpub),
      hex = bytesToHex(bytes),
      node = {};

    node.depth = parseInt(hex.substring(8, 10), 16);
    node.fingerprint = parseInt(hex.substring(10, 18), 16);
    node.child_num = parseInt(hex.substring(18, 26), 16);
    node.chain_code = hex.substring(26, 90);
    node.public_key = hex.substring(90, 156);

    return node;
  }

  // encode public key hdnode to xpub base58 string
  function node2xpub(node, version) {
    var hex, bytes, xpub;

    hex = hexpad(version, 8) + hexpad(node.depth, 2) + hexpad(node.fingerprint, 8) + hexpad(node.child_num, 8) + node.chain_code + node.public_key;

    bytes = hexToBytes(hex);
    xpub = base58check.encode(bytes);
    return xpub;

    function hexpad(n, l) {
      var s = parseInt(n).toString(16);
      while (s.length < l) s = '0' + s;
      return s;
    }
  }

  function node2address(node, type) {
    var pubkey = node.public_key,
      bytes = hexToBytes(pubkey),
      hash = bitcoin.crypto.hash160(bytes);

    return address2str(hash, type);
  }

  function address2str(hash, version) {
    var csum,
      bytes,
      hashWithVersion,
      versionHash = new Buffer(1);

    versionHash[0] = +version;
    bytes = Buffer.concat([versionHash, hash]);

    return base58check.encode(bytes);
  }

  function decodeAddress(address) {
    var bytes, hash, csum;

    bytes = base58check.decode(address);
    hash = bytes.slice(0, 21);

    return {
      version: bytes[0],
      hash: bytes.slice(1)
    };
  }

  function deriveChildNode(node, index) {
    var key,
      child,
      child2

    child = _deriveChildNode(node, index);
    _normalizeNode(child);

    if (trezor instanceof trezorApi.PluginTransport) {
      child2 = trezor.deriveChildNode(node, index);
      _normalizeNode(child2);

      if (!(_.isEqual(child, child2))) {
        $log.error('CKD check failed', {
          parent: node,
          jsChild: child,
          pluginChild: child2
        })
        throw new Error('Child node derivation failed');
      }
    }

    return child;
  }

  function _normalizeNode(node) {
    node.public_key = node.public_key.toUpperCase();
    node.chain_code = node.chain_code.toUpperCase();
    node.fingerprint = node.fingerprint.toString();
    node.child_num = node.child_num.toString();
    node.depth = node.depth.toString();
  }

  function _deriveChildNode(node, index) {
    var parent = _node2bjsNode(node),
      child = _bjsNode2Node(parent.derive(index));
    child.path = node.path.concat([index]);
    return child;
  }

  function _node2bjsNode(node) {
    var chainCode = new Buffer(node.chain_code, 'hex');
    var publicKey = new Buffer(node.public_key, 'hex');

    var Q = ecurve.Point.decodeFrom(bitcoin.ECPubKey.curve, publicKey);
    var bjsNode = new bitcoin.HDNode(Q, chainCode);

    bjsNode.path = node.path;
    bjsNode.depth = +node.depth;
    bjsNode.index = node.child_num;
    bjsNode.parentFingerprint = node.fingerprint;

    return bjsNode;
  }

  function _bjsNode2Node(bjsNode) {
    return {
      path: bjsNode.path,
      depth: bjsNode.depth,
      child_num: bjsNode.index,
      fingerprint: bjsNode.parentFingerprint,
      public_key: bjsNode.pubKey.toHex(),
      chain_code: bjsNode.chainCode.toString('hex')
    };
  }

  this.xprv2node = xprv2node;
  this.xpub2node = xpub2node;
  this.node2xpub = node2xpub;
  this.node2address = node2address;
  this.address2str = address2str;
  this.decodeAddress = decodeAddress;
  this.deriveChildNode = deriveChildNode;

  //
  // promise utils
  //

  // returns a promise that gets notified every n msec
  function tick(n) {
    return $interval(null, n);
  }

  // keeps calling fn while the returned promise is being rejected
  // fn can cancel by returning falsey
  // if given delay, waits for delay msec before calling again
  // if given max, gives up after max attempts and rejects with
  // the latest error
  function endure(fn, delay, max) {
    var pr = fn();

    if (!pr)
      return $q.reject('Cancelled');

    return pr.then(null, function (err) {

      if (max !== undefined && max < 1) // we have no attempt left
        throw err;

      var retry = function () {
        return endure(fn, delay, max ? max - 1 : max);
      };

      return $timeout(retry, delay); // retry after delay
    });
  }

  this.tick = tick;
  this.endure = endure;

  /**
   * Redirect to passed path.
   *
   * @param {String} path  Path to redirect to
   * @return {Promise}     Promise that is resolved after the redirection is
   *                       complete.
   */
  function redirect(path) {
    var deferred = $q.defer(),
      off;
    if ($location.path() !== path) {
      $location.path(path);
      off = $rootScope.$on('$locationChangeSuccess', function () {
        deferred.resolve();
        off();
      });
    } else {
      deferred.resolve();
    }
    return deferred.promise;
  }

  this.redirect = redirect;

});

/*
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/round
 */

// Closure
(function () {

  /**
   * Decimal adjustment of a number.
   *
   * @param  {String}  type  The type of adjustment.
   * @param  {Number}  value  The number.
   * @param  {Integer}  exp    The exponent (the 10 logarithm of the adjustment base).
   * @returns  {Number}      The adjusted value.
   */
  function decimalAdjust(type, value, exp) {
    // If the exp is undefined or zero...
    if (typeof exp === 'undefined' || +exp === 0) {
      return Math[type](value);
    }
    value = +value;
    exp = +exp;
    // If the value is not a number or the exp is not an integer...
    if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
      return NaN;
    }
    // Shift
    value = value.toString().split('e');
    value = Math[type](+(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp)));
    // Shift back
    value = value.toString().split('e');
    return +(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp));
  }

  // Decimal round
  if (!Math.round10) {
    Math.round10 = function (value, exp) {
      return decimalAdjust('round', value, exp);
    };
  }
  // Decimal floor
  if (!Math.floor10) {
    Math.floor10 = function (value, exp) {
      return decimalAdjust('floor', value, exp);
    };
  }
  // Decimal ceil
  if (!Math.ceil10) {
    Math.ceil10 = function (value, exp) {
      return decimalAdjust('ceil', value, exp);
    };
  }

})();
