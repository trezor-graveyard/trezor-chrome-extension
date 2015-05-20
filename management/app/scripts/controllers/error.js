/*global angular*/

angular.module('webwalletApp').value('bowser', window.bowser);

/**
 * Error Controller
 *
 * Assign properties that show if the Transport was loaded successfully and
 * if the plugin is up to date to the Angular scope.
 *
 * @see  index.html
 * @see  error.html
 * @see  error.install.html
 */
angular.module('webwalletApp').controller('ErrorCtrl', function (
  config,
  trezor,
  trezorApi,
  trezorError,
  udevError,
  $scope) {

  'use strict';

  $scope.udevError = udevError;

  if (trezorError === null) {
    $scope.error = false;
  } else {
    $scope.error = true;
    $scope.errorMessage = trezorError.message;
  }

});
