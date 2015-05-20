/*global angular*/

angular.module('webwalletApp').controller('FirmwareCtrl', function (
  $modal,
  $scope,
  $rootScope,
  $routeParams,
  deviceList,
  firmwareService,
  modalOpener,
  TrezorDevice) {

  'use strict';

  var _modal = null,
    _modalScope = null,
    _state = null,
    STATE_INITIAL = 'initial',
    STATE_INITIAL_DISCONNECTED = 'initial-disconnected',
    STATE_NORMAL = 'device-normal',
    STATE_BOOTLOADER = 'device-bootloader',
    STATE_UPDATE_DOWNLOADING = 'update-downloading',
    STATE_UPDATE_FLASHING = 'update-flashing',
    STATE_UPDATE_SUCCESS = 'update-success',
    STATE_UPDATE_ERROR = 'update-error',
    STATE_UPDATE_CHECK = 'update-check';

  $scope.$on(firmwareService.EVENT_CONNECT, resetOutdatedFirmwareBar);
  $scope.$on(firmwareService.EVENT_DISCONNECT, resetOutdatedFirmwareBar);
  $scope.$on(firmwareService.EVENT_DISCONNECT, resetOutdatedFirmwareBar);

  /**
   * onDisconnect() has high priority, because this hook must
   * execute even if the Firmware modal is opened.
   *
   * @see  firmwareService.firmwareMain()
   */
  $scope.$on(firmwareService.EVENT_DISCONNECT, onDisconnect, 10);

  // States
  $scope.$on(firmwareService.EVENT_BOOTLOADER, function (e, dev) {
    /*
     * We need to change the reference to the device in modal's scope,
     * because the device changes when switching to the bootloader
     * mode. We save a reference to the original device, to forget
     * it in case user cancels the update process.
     */
    if (_modalScope) {
      _modalScope.previousDevice = _modalScope.device;
      _modalScope.device = dev;
    }
    setState(STATE_BOOTLOADER);
  });
  $scope.$on(firmwareService.EVENT_NORMAL, function () {
    setState(STATE_NORMAL);
  });

  // Modals
  $scope.$on(firmwareService.EVENT_CANDIDATE,
    function (e, params) {
      showCandidateFirmwareModal(
        params.dev,
        params.firmware
      );
    });
  $scope.$on(firmwareService.EVENT_OUTDATED,
    function (e, params) {
      showOutdatedFirmware(
        params.dev,
        params.firmware,
        params.version
      );
    });

  function showOutdatedFirmware(dev, firmware, version) {
    if (firmware.required) {
      return showOutdatedFirmwareModal(dev, firmware, version);
    }
    return showOutdatedFirmwareBar(dev, firmware, version);
  }

  function showOutdatedFirmwareBar(dev, firmware, version) {
    $rootScope.optionalFirmware = {
      device: dev,
      firmware: firmware,
      version: version,
      update: function () {
        showOutdatedFirmwareModal(dev, firmware, version);
      }
    };
  }

  function resetOutdatedFirmwareBar(e, dev) {
    if ($rootScope.optionalFirmware &&
      $rootScope.optionalFirmware.device.id === dev.id) {
      delete $rootScope.optionalFirmware;
    }
  }

  function showOutdatedFirmwareModal(dev, firmware, version) {
    _showFirmwareModal(dev, firmware, version, STATE_INITIAL);
  }

  function showCandidateFirmwareModal(dev, firmware) {
    _showFirmwareModal(dev, firmware, undefined, STATE_BOOTLOADER);
  }

  function _showFirmwareModal(dev, firmware, version, state) {
    _modalScope = angular.extend($rootScope.$new(), {
      firmware: firmware,
      version: version,
      device: dev,
      update: function () {
        updateFirmware(firmware);
      }
    });
    setState(state);

    firmwareService.setModalOpen(true);
    _modal = $modal.open({
      templateUrl: 'views/modal/firmware.html',
      size: 'lg',
      backdrop: 'static',
      keyboard: false,
      scope: _modalScope
    });

    modalOpener.stopBackpaceOnModal(_modal);

    _modal.result.then(function () {
      firmwareService.setModalOpen(false);
    }, function () {
      firmwareService.setModalOpen(false);
      if (firmware.required) {
        deviceList.forget(dev, true);
      }
    });

    return _modal.result;
  }

  function updateFirmware(firmware) {
    var deregister;

    _modalScope.firmware = firmware;
    setState(STATE_UPDATE_DOWNLOADING);

    firmwareService.download(firmware)
      .then(function (data) {
        deregister = $rootScope.$on(
          TrezorDevice.EVENT_PREFIX + TrezorDevice.EVENT_BUTTON,
          promptButton
        );
        setState(STATE_UPDATE_FLASHING);
        return _modalScope.device.flash(data);
      })
      .then(
        function () {
          setState(STATE_UPDATE_SUCCESS);
          deregister();
        },
        function (err) {
          setState(STATE_UPDATE_ERROR);
          _modalScope.error = err.message;
          deregister();
        }
      );

    function promptButton(e, dev, code) {
      if (code === TrezorDevice.REQ_BUTTON_FIRMWARE) {
        setState(STATE_UPDATE_CHECK);
      }
    }
  }

  /**
   * Close the firmware modal if the update is already finished or
   * if it failed.
   */
  function onDisconnect(e, dev) {
    if (_state === STATE_UPDATE_SUCCESS ||
      _state === STATE_UPDATE_ERROR ||
      _state === STATE_BOOTLOADER) {
      deviceList.forget(dev, true);
      if (_modalScope.previousDevice)
        deviceList.forget(_modalScope.previousDevice, true);
      _modal.close();
      return;
    }
    if (_state === STATE_INITIAL ||
      _state === STATE_NORMAL) {
      setState(STATE_INITIAL_DISCONNECTED);
      return;
    }
    setState(STATE_INITIAL);
  }

  function setState(state) {
    _state = state;
    if (_modalScope) {
      _modalScope.state = state;
    }
  }
});
