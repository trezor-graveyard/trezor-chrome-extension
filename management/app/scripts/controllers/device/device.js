/*global angular*/

/**
 * Device Controller
 */
angular.module('webwalletApp').controller('DeviceCtrl', function (
  $scope,
  $location,
  $routeParams,
  $document,
  flash,
  TrezorDevice,
  deviceList,
  modalOpener,
  setupModalService,
  pinModalService,
  passphraseModalService,
  deviceService) {

  'use strict';


  // Get current device or go to homepage.
  $scope.device = deviceList.get($routeParams.deviceId);
  if (!$scope.device) {
    $location.path('/');
    return;
  }

  $scope.isActive = function (path) {
    return $location.path().match(path);
  };


  // Handle device events -- buttons and disconnect.
  $scope.$on(TrezorDevice.EVENT_PREFIX + TrezorDevice.EVENT_PIN,
    promptPin);
  $scope.$on(TrezorDevice.EVENT_PREFIX + TrezorDevice.EVENT_BUTTON,
    handleButton);
  $scope.$on(TrezorDevice.EVENT_PREFIX + TrezorDevice.EVENT_PASSPHRASE,
    promptPassphrase);
  $scope.$on(deviceService.EVENT_ASK_FORGET, forgetOnDisconnect);



  /**
   * Forgetting the device.
   *
   * @param {Object} e             Event object
   * @param {TrezorDevice} device  Device that was disconnected
   */
  function forgetOnDisconnect(e, device) {
    deviceList.forget(device);
    setupModalService.closeOpen();
    pinModalService.closeOpen();
    passphraseModalService.closeOpen();
  }

  /**
   * Ask the user to set the device PIN.
   *
   * Bind keypress events that allow the user to control the number
   * buttons (dial) using a keyboard.
   *
   * @param {Event} event        Event object
   * @param {TrezorDevice} dev   Device
   * @param {String} type        Action type.  Possible values:
   *                                 - 'PinMatrixRequestType_Current'
   *                                 - 'PinMatrixRequestType_NewFirst'
   *                                 - 'PinMatrixRequestType_NewSecond'
   * @param {Function} callback  Called as `callback(err, res)`
   */
  function promptPin(e, dev, type, callback) {
    pinModalService.showModal($scope, e, dev, type, callback);
  }

  function promptPassphrase(e, dev, callback) {
    passphraseModalService.showModal($scope, e, dev, callback);
  }

  function handleButton(event, dev, code) {
    var ignore = [
      'ButtonRequest_ConfirmWord',
      'ButtonRequest_FirmwareCheck'
    ];

    if ((dev.id === $scope.device.id) &&
      (ignore.indexOf(code) < 0)) {

      promptButton(code);
    }
  }

  function promptButton(code) {
    var modal = modalOpener.openModal($scope, 'button', buttonModalSize(code), {
      code: code
    }, undefined, code);
    $scope.device.once(TrezorDevice.EVENT_RECEIVE, function () {
      modal.modal.close();
    });
    $scope.device.once(TrezorDevice.EVENT_ERROR, function () {
      modal.modal.close();
    });
  }

  function buttonModalSize(code) {
    if (code === 'ButtonRequest_Address') {
      return 'md';
    } else {
      return 'lg';
    }
  }
});
