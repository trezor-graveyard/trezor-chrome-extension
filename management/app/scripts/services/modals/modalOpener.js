/*global angular*/

angular.module('webwalletApp').service('modalOpener', function (
  $rootScope,
  $timeout,
  selecter,
  $document,
  $modal) {

  'use strict';

  this.currentlyOpenedModal = null;

  this.isModalOpened = function () {
    return (this.currentlyOpenedModal != null);
  }

  /**
   * Opens modal window.
   *
   * Modal window should have options "yes" and "no" (or similar), where
   * "yes" is binded to "close()" and "no" to "dismiss()".
   *
   * Returns a promise that is resolved if the user chooses "yes"
   * and failed if the user chooses "no"
   *
   * @return {Promise}
   */
  this.openModal = function (scope, name, size, extendScope, allowBackspace, emitData) {
    var windowClass = name.replace(".", "-", "g") + "modal";
    if (typeof extendScope === "undefined") {
      extendScope = {};
    }
    if (typeof allowBackspace === "undefined") {
      allowBackspace = false;
    }

    scope = angular.extend(scope.$new(), extendScope);
    var modal = $modal.open({
      templateUrl: 'views/modal/' + name + '.html',
      backdrop: 'static',
      keyboard: false,
      scope: scope,
      size: size,
      windowClass: windowClass
    });
    var self = this;
    modal.opened.then(function () {
      self.currentlyOpenedModal = modal;
      scope.$emit('modal.' + name + '.show', emitData);

      $timeout(function () {}, 1).then(function () {
        angular.element("input[autofocus]").trigger('focus');
      }).then(function () {
        scope.autoselect = function () {
          var selectElem = $document.find('.autoselect');
          if (selectElem.length) {
            selecter.selectRange(selectElem[0]);
          }
        };
        scope.autoselect();
      });
    });
    modal.result.finally(function () {
      self.currentlyOpenedModal = null;
      scope.$emit('modal.' + name + '.hide', emitData);
    });

    if (!allowBackspace) {
      this.stopBackpaceOnModal(modal)
    }

    return {
      result: modal.result,
      modal: modal,
      scope: scope
    };
  }

  /****
   * Stop backspace on already existing modal window
   *
   * It is called in openModal, but can be called from anywhere else
   * (for example, it's called in firmware.js or setup.js)
   */
  this.stopBackpaceOnModal = function (modal) {
    modal.opened.then(function () {
      stopBackspace();
    })
    modal.result.finally(function () {
      resumeBackspace();
    })
  }

  function stopBackspace() {
    $(document).unbind('keydown.modalOpener').bind('keydown.modalOpener', function (event) {
      var doPrevent = false;
      if (event.keyCode === 8) {
        var d = event.srcElement || event.target;
        if ((d.tagName.toUpperCase() === 'INPUT' &&
            (
              d.type.toUpperCase() === 'TEXT' ||
              d.type.toUpperCase() === 'PASSWORD' ||
              d.type.toUpperCase() === 'FILE' ||
              d.type.toUpperCase() === 'EMAIL' ||
              d.type.toUpperCase() === 'SEARCH' ||
              d.type.toUpperCase() === 'DATE')
          ) ||
          d.tagName.toUpperCase() === 'TEXTAREA') {
          doPrevent = d.readOnly || d.disabled;
        } else {
          doPrevent = true;
        }
      }

      if (doPrevent) {
        event.preventDefault();
      }
    })
  }

  function resumeBackspace() {
    $(document).unbind('keydown.modalOpener').bind('keydown.modalOpener', function (event) {})
  }
});
