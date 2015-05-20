/*global angular*/

angular.module('webwalletApp').service('pinModalService', function (
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

  /**
   * Ask the user to set the device PIN.
   *
   * Bind keypress events that allow the user to control the number
   * buttons (dial) using a keyboard.
   *
   * @param {Event} event        Event object
   * @param {TrezorDevice} dev   Device
   * @param {String} type        Action type.  Possible values:
   *                                 - 'PinMatrixRequestType_Current'
   *                                 - 'PinMatrixRequestType_NewFirst'
   *                                 - 'PinMatrixRequestType_NewSecond'
   * @param {Function} callback  Called as `callback(err, res)`
   */
  this.showModal = function ($scope, e, dev, type, callback) {

    if (dev.id !== $scope.device.id)
      return;

    var modal = modalOpener.openModal($scope, 'pin', 'sm', {
      pin: '',
      type: type
    }, true);

    this.openedModal = modal;

    modal.scope.addPin = function (num) {
      modal.scope.pin = modal.scope.pin + num.toString();
      /*
       * When the user clicks a number button, the button gets focus.
       * Then when the user presses Enter it triggers another click on the
       * button instead of submiting the whole Pin Modal.  Therefore we need
       * to focus the document after each click on a number button.
       */
      $document.focus();
    };

    modal.scope.delPin = function () {
      modal.scope.pin = modal.scope.pin.slice(0, -1);
    };

    modal.scope.isPinSet = function () {
      return modal.scope.pin.length > 0;
    };


    $document.on('keydown', _pinKeydownHandler);
    $document.focus();

    modal.result.then(
      function (res) {
        $document.off('keydown', _pinKeydownHandler);
        callback(null, res);
      },
      function (err) {
        $document.off('keydown', _pinKeydownHandler);
        callback(err);
      }
    );

    function _pinKeydownHandler(e) {
      var k = e.which,
        num;
      if (k === 8) { // Backspace
        modal.scope.delPin();
        modal.scope.$digest();
        return false;
      } else if (k === 13) { // Enter
        modal.modal.close(modal.scope.pin);
        return false;
      } else if (_isNumericKey(k)) {
        num = _getNumberFromKey(k);
        modal.scope.addPin(String.fromCharCode(num));
        modal.scope.$digest();
      }
    }

    function _isNumericKey(k) {
      return (k >= 49 && k <= 57) || (k >= 97 && k <= 105);
    }

    function _getNumberFromKey(k) {
      return (k >= 97) ? (k - (97 - 49)) : k;
    }
  }


});
