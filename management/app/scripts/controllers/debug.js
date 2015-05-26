/*global angular, $*/

/**
 * Debug Controller
 *
 * Show the error log when clicked on the link in the footer or on the button
 * in an error message.
 *
 * @see  index.html
 * @see  debug.button.html
 * @see  debug.link.html
 * @see  debug.log.html
 */
angular.module('webwalletApp').controller('DebugCtrl', function (
  trezor,
  trezorApi,
  $rootScope,
  $scope,
  deviceList
) {

  'use strict';

  $rootScope.debug = {};

  $rootScope.debug.toggle = function () {
    if ($rootScope.debug.visible) {
      $rootScope.debug.visible = false;
      return;
    }
    $rootScope.debug.logs = debugLogsString();
    $rootScope.debug.visible = true;
  };

  $rootScope.debug.focus = function (e) {
    $(e.target).select();
  };

  function debugLogsString() {
    return (window.console.logs || [])
      .map(JSON.stringify)
      .join('\n');
  }


});
