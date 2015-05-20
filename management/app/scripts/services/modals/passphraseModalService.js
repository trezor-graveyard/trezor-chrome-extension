/*global angular*/

angular.module('webwalletApp').service('passphraseModalService', function (
  $rootScope,
  $document,
  modalOpener,
  $modal) {

  'use strict';

  this.openedModal = null;

  this.closeOpen = function () {
    if (this.openedModal != null) {
      this.openedModal.modal.close();
    }
    this.openedModal = null;
  }

  this.showModal = function ($scope, e, dev, callback) {

    if (dev.id !== $scope.device.id) {
      return;
    }

    var hasSaved = $scope.device.hasSavedPassphrase();

    if (!hasSaved) {
      dev.forgetOnDisconnect = true;
      //if we don't forget while displaying passphrase and disconnecting, it gets into weird state with no xpubs
    }

    var modal = modalOpener.openModal($scope, 'passphrase', 'sm', {
      check: !hasSaved,
      checkCorrect: false,
      values: {
        passphrase: '',
        passphraseCheck: ''
      },
      installHandler: installSubmitHandlers
    });

    this.openedModal = modal;

    modal.result.then(
      function (res) {
        if (!$scope.device.checkPassphraseAndSave(res)) {
          callback(new Error('Invalid passphrase'));
        } else {
          callback(null, res);
        }
        if (!hasSaved) {
          dev.forgetOnDisconnect = null; //back into default forget state
        }
      },
      function (err) {
        callback(err);
      }
    );

    modal.scope.$watch('values.passphrase', checkPassphrase);
    modal.scope.$watch('values.passphraseCheck', checkPassphrase);

    function checkPassphrase() {
      var v = modal.scope.values;
      if (!modal.scope.check) {
        modal.scope.checkCorrect = true;
        return;
      }
      modal.scope.checkCorrect =
        (v.passphrase === v.passphraseCheck) &&
        (v.passphrase.length <= 50);
    }

    function installSubmitHandlers() {
      var submit = document.getElementById('passphrase-submit'),
        form = document.getElementById('passphrase-form');

      submit.addEventListener('submit', submitModal, false);
      submit.addEventListener('click', submitModal, false);
      form.addEventListener('submit', submitModal, false);
      form.addEventListener('keypress', function (e) {
        if (e.keyCode === 13 && modal.scope.checkCorrect) {
          submitModal();
        }
      }, true);

      function submitModal() {
        modal.modal.close(modal.scope.values.passphrase);
        return false;
      }
    }
  }


});
