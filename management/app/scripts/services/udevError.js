angular.module('webwalletApp').service('udevError', function (
  trezor,
  trezorApi,
  flash,
  $q
) {
  'use strict';


  this._makesSenseAsking = function () {
    if (!(trezor instanceof trezorApi.ChromeExtensionTransport)) {
      return false;
    }
    if (window.navigator.platform.lastIndexOf("Linux") !== 0) {
      return false;
    }
    // we are on "linux" - but it can also be chrome OS!
    // We have to detect if it's chromeos
    if (window.navigator.userAgent.indexOf("CrOS") === -1) {
      return true;
    } else {
      return false;
    }
  }

  // this is "cached" error status
  this.errorStatus = false;

  // this returns promise with an updated error status,
  // also sets up this.errorstatus
  this.getCurrentErrorStatus = function () {
    var res;
    if (!this._makesSenseAsking()) {
      res = $q.when(false);
    } else {
      res = trezor.udevStatus().then(function (udevStatus) {
        if (udevStatus === "display") {
          return true;
        } else {
          return false;
        }
      })
    }
    res.then(function (errorStatus) {
      this.errorStatus = errorStatus;
    }.bind(this));
    return res;
  }

  //this gets called on start
  this.getCurrentErrorStatus();

})
