/*global angular*/

angular.module('webwalletApp').controller('DeviceRecoveryCtrl', function (
  bip39,
  flash,
  $scope,
  $location) {

  'use strict';

  $scope.recovering = false;
  $scope.seedFocus = false;
  $scope.seedWord = '';
  $scope.seedWords = null;
  $scope.seedWordlist = bip39.english;
  $scope.settings = {
    pin_protection: true,
    word_count: 24
  };

  $scope.$on('device.word', promptWord);

  $scope.startsWith = function (state, viewValue) {
    var prefix = state.substr(0, viewValue.length).toLowerCase();
    return prefix === viewValue.toLowerCase();
  };

  $scope.recoverDevice = function () {
    if ($scope.settings.label) {
      $scope.settings.label = $scope.settings.label.trim();
    }
    $scope.settings.word_count = +$scope.settings.word_count;

    // Reset previous attempt to restore device.
    $scope.seedWords = [];
    flash.clear();

    $scope.recovering = true;
    $scope.device.recover($scope.settings).then(
      function () {
        $scope.recovering = false;
        $location.path('/device/' + $scope.device.id + '/');
      },
      function (err) {
        $scope.recovering = false;
        flash.error(err.message || 'Recovery failed');
      }
    );
  };

  $scope.recoverWord = function () {
    $scope.seedWords.push($scope.seedWord);
    $scope.wordCallback($scope.seedWord);
  };

  function promptWord(event, dev, callback) {
    if (dev.id !== $scope.device.id) {
      return;
    }

    $scope.seedFocus = true;
    $scope.seedWord = '';
    $scope.wordCallback = function (word) {
      $scope.seedFocus = false;
      $scope.wordCallback = null;
      $scope.seedWord = '';
      callback(null, word);
    };
  }
});
