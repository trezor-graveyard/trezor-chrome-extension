/*global angular*/

angular.module('webwalletApp').controller('DeviceWipeCtrl', function (
  $scope,
  $rootScope,
  flash,
  deviceList,
  modalOpener
) {

  'use strict';

  var _wipeInProgress = false,
    _disconnectModal = null;

  deviceList.registerDisconnectHook(forgetOnDisconnectAfterWipe, 10);

  /**
   * Replace default modal asking the user if he/she wants to forget the
   * device with a custom one that features a message that the wipe was
   * successfully finished.
   *
   * @param {TrezorDevice} dev  Device
   */
  function forgetOnDisconnectAfterWipe(dev) {
    var hideSuccessMessage;
    if (_wipeInProgress) {
      _wipeInProgress = false;
      hideSuccessMessage = _disconnectModal !== null;
      if (_disconnectModal) {
        _disconnectModal.close();
        _disconnectModal = null;
      }
      promptForget(hideSuccessMessage)
        .then(function () {
          deviceList.forget(dev);
        }, function () {
          deviceList.navigateTo(dev, true);
        });
      deviceList.abortHook();
    }
  }

  /**
   * Wipe the device
   *
   * Then ask the user if he/she wants to forget it -- this happens
   * automatically, because the disconnect event is fired while wiping the
   * device (the HID ID changes).
   */
  $scope.wipeDevice = function () {
    _wipeInProgress = true;
    $scope.device.wipe().then(
      function () {
        promptDisconnect();
      },
      function (err) {
        _wipeInProgress = false;
        flash.error(err.message || 'Wiping failed');
      }
    );
  };

  /**
   * Ask user to disconnect the device.
   */
  function promptDisconnect() {
    var modal = modalOpener.openModal($scope, 'disconnect.wipe', 'sm');
    _disconnectModal = modal.modal;
    return modal.result;
  }

  /**
   * Ask user if he/she wants to forget the device.
   *
   * @param {Boolean} hideSuccessMsg  Hide the success message (it is not
   *                                  necessary if the modal asking to
   *                                  disconnect the device was already
   *                                  shown).
   */
  function promptForget(hideSuccessMsg) {
    return modalOpener.openModal($scope, 'forget.wipe', null, {
      hideSuccessMsg: hideSuccessMsg
    }).result;
  }
});
