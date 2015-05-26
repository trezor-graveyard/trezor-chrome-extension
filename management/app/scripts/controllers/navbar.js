angular.module('webwalletApp').controller('NavbarCtrl', function (
  $scope) {

  'use strict';
  $scope.closeApp = function() {
    chrome.app.window.current().close();
  }
});
