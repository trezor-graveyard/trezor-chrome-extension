/*global angular*/

angular.module('webwalletApp').controller('DeviceInfoCtrl', function (
  flash,
  $scope,
  $rootScope,
  $timeout,
  $document,
  selecter,
  modalOpener,
  deviceList,
  firmwareService,
  $location) {

  'use strict';


  $scope.learnMorePassDisplayed = false;
  $scope.learnMorePass = function () {
    $scope.learnMorePassDisplayed = true;
  }


  //hack
  $scope._changing = null;

  $rootScope.$on('modal.button.show', modalShown);

  function modalShown(event, code) {
    event.targetScope.changing = $scope._changing;
  }

  $scope.isLatestFirmware = false;
  firmwareService.check($scope.device.features).then(function(firmware) {
     if (!firmware) {
        $scope.isLatestFirmware = true;
     } else {
        $scope.isLatestFirmware = false;
     }
  });

  /**
   * Change device PIN
   *
   * Ask the user to set the PIN and then save the value.
   *
   * `remove` false or undefined ==> change
   * `remove` true ==> remove PIN
   */
  $scope.changePin = function (remove) {
    $scope._changing = "pin";
    var text = remove ? "removed" : "changed";
    $scope.device.changePin(remove).then(
      function () {
        flash.success('PIN was successfully ' + text);
      },
      function (err) {
        flash.error(err.message || 'PIN change failed');
      }
    ).finally(function () {
      $scope._changing = null;
    });
  };

  //input=> boolean - true enables pass, false removes pass
  $scope.togglePassphrase = function (enable) {
    $scope._changing = "passphrase";

    var text = enable ? "enabled" : "disabled";
    var forgettext = "Disconnect your Trezor to " + (enable ? "enable" : "disable") + " passphrase.";
    $scope.device.togglePassphrase(enable).then(
      function () {
        deviceList.forget($scope.device, true, forgettext);
      },
      function (err) {
        flash.error(err.message || 'Passphrase toggle failed');
      }
    ).finally(function () {
      $scope._changing = null;
    });
  };


  /**
   * Ask the user to set the device label and then store filled value.
   *
   * If he/she fills in an empty value, the default label is used (read from
   * `TrezorDevice#DEFAULT_LABEL`).
   */
  $scope.changeLabel = function () {
    promptLabel()
      .then(function (label) {
        label = label.trim() || $scope.device.DEFAULT_LABEL;
        return $scope.device.changeLabel(label);
      })
      .then(
        function () {
          flash.success('Label was successfully changed');
        },
        function (err) {
          /*
           * Show error message only if there actually was an
           * error.  Closing the label modal triggers rejection
           * as well, but without an error.
           */
          if (err) {
            flash.error(err.message ||
              'Failed to change the device label');
          }
        }
      );
  };



  /**
   * Ask the user to set the device label.
   */
  function promptLabel() {

    return modalOpener.openModal($scope, 'label', 'md', {
      label: $scope.device.features.label || ''
    }).result;
  }


});
