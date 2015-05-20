/*global angular*/

angular.module('webwalletApp').controller('DeviceSetupCtrl', function (
  utils,
  flash,
  $scope,
  modalOpener,
  deviceList,
  deviceService,
  setupModalService,
  $modal) {

  'use strict';

  var modal;

  $scope.advanced = false;
  $scope.settings = {
    strength: 256,
    pin_protection: true
  };

  // `recoveryWords` count depends on users choice and gets
  // initialized in `setupDevice`
  $scope.recoveryStarted = false;
  $scope.recoveryWords = null;
  $scope.recoveryWordsDone = 0;
  $scope.recoveryCurrentWord = 1;

  $scope.$on('device.button', function (event, dev, code) {
    if (dev.id === $scope.device.id &&
      code === 'ButtonRequest_ConfirmWord') {
      $scope.setupRecoveryNext();
    }
  });

  /**
   * Returns a word count of a BIP39 seed mnemonic, for `bits` of entropy.
   * @see https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki
   * @summary Number -> Number
   */
  function getWordCountFromSeedStrength(bits) {
    return (bits + (bits / 32)) / 11;
  }

  $scope.setupDevice = function () {
    var set = $scope.settings,
      dev = $scope.device;

    set.strength = +set.strength;
    if (set.label) {
      set.label = set.label.trim() || dev.DEFAULT_LABEL;
    } else {
      set.label = dev.DEFAULT_LABEL;
    }

    // Set the total word count so the modal window initialized in
    // `setupRecoveryNext` can pick it up
    $scope.recoveryWords = getWordCountFromSeedStrength(set.strength);

    dev.reset(set).then(
      function () {
        utils.redirect('/device/' + dev.id + '/').then(function () {
          flash.success('Congratulations! Your device is now ready to use.');
        });
      },
      function (err) {
        flash.error(err.message || 'Setup failed');
      }
    );
  };


  $scope.setupRecoveryNext = function () {

    // First write
    if (!$scope.recoveryStarted) {
      $scope.recoveryStarted = true;
      $scope.stage = 'writeFirst';
      openModal();
      return;
    }

    $scope.recoveryWordsDone = $scope.recoveryWordsDone + 1;
    $scope.recoveryCurrentWord = $scope.recoveryCurrentWord + 1;

    // Write
    if ($scope.recoveryWordsDone < $scope.recoveryWords) {
      $scope.stage = 'write';

      // First check
    } else if ($scope.recoveryWordsDone === $scope.recoveryWords) {
      $scope.recoveryCurrentWord = 1;
      $scope.stage = 'checkFirst';

      // Check
    } else if ($scope.recoveryWordsDone < 2 * $scope.recoveryWords - 1) {
      $scope.stage = 'check';

      // Last check
    } else {
      $scope.device.once('receive', function () {
        closeModal();
      });
    }
  };

  function closeModal() {
    setupModalService.closeOpen();
  }

  function openModal() {
    setupModalService.showModal($scope);
  }
});
