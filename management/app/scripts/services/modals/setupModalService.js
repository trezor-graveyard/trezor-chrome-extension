/*global angular*/

angular.module('webwalletApp').service('setupModalService', function (
  $rootScope,
  modalOpener,
  $modal) {

  'use strict';

  this.openedModal = null;

  this.closeOpen = function () {
    if (this.openedModal != null) {
      this.openedModal.close();
    }
    this.openedModal = null;
  }

  this.showModal = function ($scope) {
    this.openedModal = $modal.open({
      templateUrl: 'views/modal/setup.html',
      size: 'lg',
      windowClass: 'buttonmodal',
      backdrop: 'static',
      keyboard: false,
      scope: $scope
    });
    modalOpener.stopBackpaceOnModal(this.openedModal);
  }
});
