/*global angular */

angular.module('webwalletApp').controller('ModalPinCtrl', function (
  $scope,
  deviceService,
  deviceList) {

  'use strict';

  $scope.ratePin = function (pin) {
    var strength = $scope.device.ratePin(pin);
    if (strength === 0) return 'long';
    if (strength < 3000) return 'weak';
    if (strength < 60000) return 'fine';
    if (strength < 360000) return 'strong';
    return 'ultimate';
  };
});
