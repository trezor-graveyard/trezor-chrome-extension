/*global angular*/

/**
 * Main Controller
 *
 * Load deviceList, deviceService, and firmwareService.  These modules
 * immediately start listening to device events.  They are responsible for most
 * of the functionality of the app, that is not triggered by the user.
 *
 * @see  main.html
 */
angular.module('webwalletApp').controller('MainCtrl', function (
  $scope,
  deviceList,
  deviceService,
  udevError,
  firmwareService) {

  'use strict';

  $scope.closeApp = function () {
    chrome.app.window.current().close();
  }

  $scope.isConnected = function () {
    return deviceList.all().some(
      function (dev) {
        return dev.isConnected();
      }
    );
  }

  $scope.isEmpty = function () {
    return deviceList.count() === 0;
  }

  if (!$scope.isEmpty() && !$scope.isConnected()) {
    var first = (deviceList.all())[0];
    deviceList.navigateTo(first);
  }

  $scope.udevError = udevError;
});
