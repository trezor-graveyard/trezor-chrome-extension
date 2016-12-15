/*global angular*/

/**
 * Firmware Service
 *
 * TODO Document Firmware Service
 */
angular.module('webwalletApp').value('FIRMWARE_LIST_URL', '/data/releases.json');

angular.module('webwalletApp').service('firmwareService', function FirmwareService(
  FIRMWARE_LIST_URL,
  $http,
  $rootScope,
  deviceList) {

  'use strict';


  function getFirmwaresConcat() {
    var devices = deviceList.all();
    if (devices.length === 0) {
      return "";
    }
    return devices.map(function (device) {
      return device.firmwareString();
    }).join(",");
  }


  var _timestamp = new Date().getTime(),
    _firmwareList = $http.get(FIRMWARE_LIST_URL),
    _modalOpen = false;

  this.EVENT_CONNECT = 'firmware.connect';
  this.EVENT_DISCONNECT = 'firmware.disconnect';

  this.EVENT_BOOTLOADER = 'firmware.bootloader';
  this.EVENT_NORMAL = 'firmware.normal';
  this.EVENT_CANDIDATE = 'firmware.candidate';
  this.EVENT_OUTDATED = 'firmware.outdated';

  /*
   * Connect and disconnect events for the Controller -- sent even
   * if the Firmware modal is open.
   */
  deviceList.registerBeforeInitHook(function sendConnectEvent(dev) {
    $rootScope.$broadcast(this.EVENT_CONNECT, dev);
  }.bind(this), 5);
  deviceList.registerDisconnectHook(function sendDisconnectEvent(dev) {
    $rootScope.$broadcast(this.EVENT_DISCONNECT, dev);
  }.bind(this), 5);

  /**
   * After initialize hook
   */
  deviceList.registerAfterInitHook(function firmwareMain(dev) {

    // Bootloader mode
    if (dev.features.bootloader_mode) {
      $rootScope.$broadcast(this.EVENT_BOOTLOADER, dev);

      /*
       * Abort the whole after init process, if the firmware update
       * modal is opened -- that means no other after init hooks will
       * be executed.
       */
      if (_modalOpen) {
        deviceList.abortHook();
      }

      return latest()
        .then(function (firmware) {
          _modalOpen = true;
          $rootScope.$broadcast(
            this.EVENT_CANDIDATE, {
              dev: dev,
              firmware: firmware,
            }
          );
          deviceList.abortHook();
        }.bind(this));

      // Normal mode
    } else {
      $rootScope.$broadcast(this.EVENT_NORMAL, dev);

      /*
       * Abort the whole after init process, if the firmware update
       * modal is opened -- that means no other after init hooks will
       * be executed.
       */
      if (_modalOpen) {
        deviceList.abortHook();
      }

      return check(dev.features)
        .then(function (firmware) {
          if (!firmware) {
            return;
          }
          if (firmware.required) {
            _modalOpen = true;
          }
          $rootScope.$broadcast(
            this.EVENT_OUTDATED, {
              dev: dev,
              firmware: firmware,
              version: _getVersion(dev.features)
            }
          );
          if (firmware.required) {
            deviceList.abortHook();
          }
        }.bind(this));
    }
  }.bind(this), 10);

  /**
   * Disconnect hook
   */
  deviceList.registerDisconnectHook(function (dev) {
    /*
     * Abort the whole disconnect process, if the firmware update
     * modal is opened -- that means no other disconnect hooks will
     * be executed.
     */
    if (_modalOpen) {
      deviceList.abortHook();
    }
  }, 10);

  function _getVersion(features) {
    return [+features.major_version, +features.minor_version, +features.patch_version];
  }

  function latest() {
    return _firmwareList.then(function (res) {
      return res.data[0];
    });
  }

  function check(features) {
    return _firmwareList.then(function (res) {
      return _pick(features, res.data);
    });
  }

  this.check = check;

  this.download = function (firmware) {
    return $http.get(firmware.url).then(function (res) {
      if (!_validate(res.data)) {
        throw new Error('Downloaded firmware is invalid');
      }
      return res.data;
    });
  };

  function _validate(firmware) {
    var magic = '54525a52'; // 'TRZR' in hex

    return (firmware.substr(0, magic.length) === magic) &&
      // * 2 because of hex
      (firmware.length >= 4096 * 2) &&
      (firmware.length <= 1024 * (512 - 64) * 2);
  }

  function _pick(features, list) {
    var firmware = list[0],
      version = _getVersion(features),
      i;

    // No firmware available.
    if (!firmware) {
      return;
    }

    // Features are up to date.
    if (_versionCmp(firmware.version, version) < 1) {
      return;
    }

    for (i = 0; i < list.length; i = i + 1) { // collect required flags
      if (_versionCmp(list[i], features) === 0) {
        break;
      }
      if (list[i].required) {
        firmware.required = true;
        break;
      }
    }

    return firmware;
  }

  function _versionCmp(a, b) {
    if (a[0] - b[0]) {
      return a[0] - b[0];
    }
    if (a[1] - b[1]) {
      return a[1] - b[1];
    }
    if (a[2] - b[2]) {
      return a[2] - b[2];
    }
    return 0;
  }

  /**
   * Set flag that marks if the Firmware modal dialog is open.
   *
   * @param {Boolean} modalOpen  True if Firmware modal is open
   */
  this.setModalOpen = function (modalOpen) {
    _modalOpen = modalOpen;
  };

  /**
   * Is the Firmware modal dialog open?
   *
   * @return {Boolean}  True if Firmware modal is open
   */
  this.isModalOpen = function () {
    return _modalOpen;
  };

});
