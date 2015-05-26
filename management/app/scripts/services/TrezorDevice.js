/*global angular*/

angular.module('webwalletApp').factory('TrezorDevice', function (
  _,
  $q,
  $log,
  config,
  utils,
  $timeout,
  $interval) {

  'use strict';

  function TrezorDevice(desc) {
    this.id = desc.id || null;
    this.path = desc.path || null;
    this.features = null;
    this.error = null;
    this.forgetOnDisconnect = null;

    this._passphrase = null;
    this._session = null;
    this._desc = null;
    this._loadingLevel = 0;
  }

  TrezorDevice.prototype.DEFAULT_LABEL = 'My TREZOR';
  TrezorDevice.prototype.LABEL_MAX_LENGTH = 16;

  // If device is without messages for this many milliseconds,
  // session is cleared
  TrezorDevice.prototype.SESSION_TTL = 2 * 60 * 1000;

  TrezorDevice.EVENT_PIN = 'pin';
  TrezorDevice.EVENT_BUTTON = 'button';
  TrezorDevice.EVENT_PASSPHRASE = 'passphrase';
  TrezorDevice.EVENT_WORD = 'word';
  TrezorDevice.EVENT_SEND = 'send';
  TrezorDevice.EVENT_ERROR = 'error';
  TrezorDevice.EVENT_RECEIVE = 'receive';

  TrezorDevice.EVENT_CONNECT = 'connect';
  TrezorDevice.EVENT_DISCONNECT = 'disconnect';

  TrezorDevice.EVENT_PREFIX = 'device.';
  TrezorDevice.EVENT_TYPES = [
    TrezorDevice.EVENT_PIN,
    TrezorDevice.EVENT_PASSPHRASE,
    TrezorDevice.EVENT_BUTTON,
    TrezorDevice.EVENT_WORD,
    TrezorDevice.EVENT_SEND,
    TrezorDevice.EVENT_ERROR,
    TrezorDevice.EVENT_RECEIVE
  ];

  TrezorDevice.REQ_BUTTON_FIRMWARE = 'ButtonRequest_FirmwareCheck';

  TrezorDevice.prototype.STATUS_LOADING = "loading";
  TrezorDevice.prototype.STATUS_CONNECTED = "connected";
  TrezorDevice.prototype.STATUS_DISCONNECTED = "disconnected";

  /**
   * Disconnect the device and unsubscribe from account updates from the
   * server backend.
   */
  TrezorDevice.prototype.destroy = function () {
    this.disconnect();
  };

  TrezorDevice.deserialize = function (data) {
    var dev = new TrezorDevice(data);

    //old bitcoin.js version conversion
    if (typeof data.passphrase === "string") {
      console.log("[device] converting from old to new passphrase...");
      console.log("[device] old: ", data.passphrase);

      var newPass = utils.hexToBytes(data.passphrase);
      newPass = Array.prototype.slice.call(newPass);
      console.log("[device] new: ", newPass);

      dev._passphrase = newPass;
    } else {
      dev._passphrase = data.passphrase;
    }


    dev.features = data.features;
    dev.forgetOnDisconnect = data.forgetOnDisconnect;

    return dev;
  };

  TrezorDevice.prototype.serialize = function () {
    return {
      id: this.id,
      path: this.path,
      passphrase: this._passphrase,
      features: this.features,
      forgetOnDisconnect: this.forgetOnDisconnect
    };
  };

  // 
  // Clearing sessions
  //

  TrezorDevice.prototype.clearSessionAndReleaseSync = function () {
    this._session.clearSessionSync();
    this._session.releaseSync();
  }

  TrezorDevice.prototype.clearSession = function () {
    console.log("[device] clearing session");
    var self = this;
    return this._session.clearSession().then(function () {
      self.maybeReloadFeatures();
    });
  }

  /**
   * Does all the things that are needed when the tab is closed
   * - clearing session, calling release
   *
   * It runs synchronously because onbeforeunload cannot
   * have synchronous tab
   *
   * :: TrezorDevice -> Void
   */
  TrezorDevice.prototype.runOnClose = function () {
    if (this._session != null) {
      // plugin has supportsSync == false
      if (this._session.supportsSync) {
        // if call in progress, synchronous call hangs
        // which could hang the browser => we don't want that
        if (!this._callInProgress) {
          this.clearSessionAndReleaseSync();
        }
      } else {
        // let's at least try to clear session asynchronously anyway
        // (it will usually work)
        this.clearSession();
      }
    }
  }



  /**
   * On send and receive, cancel previous clearing timeout and
   * set up new clearing timeout
   *
   * If nothing happens in SESSION_TTL miliseconds, it is not stopped
   * and the session is cleared
   *
   * :: TrezorDevice -> Void
   */
  TrezorDevice.prototype.setClearTimeout = function () {

    this.cancelClearTimeout();

    this._lastActivityStamp = Math.floor(Math.floor(Date.now() / 1000));
    this._checkActivityTimeout = $timeout(function () {
      if (this.isConnected()) {
        if (!this._callInProgress) {
          this.clearSession();
        }
      }
    }.bind(this), this.SESSION_TTL);

    this._lastActivityInterval = $interval(function () {
      var now = Math.floor(Math.floor(Date.now() / 1000));
      this._activityDiff = now - this._lastActivityStamp;
    }.bind(this), 1000);
  }

  TrezorDevice.prototype.timeToClear = function () {
    var activityDiff = this._activityDiff;
    if (this._activityDiff == null) {
      activityDiff = 0;
    }
    var reverse = this.SESSION_TTL / 1000 - activityDiff;
    if (reverse < 0) {
      return "soon"; //while clearing is happenning
    }
    var minutes = Math.floor(reverse / 60);
    var seconds = reverse - minutes * 60;
    return "in " + minutes + ":" + seconds;
  }

  /**
   * Cancels clearTimeout
   *
   * :: TrezorDevice -> Void
   */
  TrezorDevice.prototype.cancelClearTimeout = function () {
    if (this._checkActivityTimeout != null) {
      $timeout.cancel(this._checkActivityTimeout);
      $interval.cancel(this._lastActivityInterval);
    }
  }

  //
  // Status & features
  //

  /**
   * Reload features without re-initializing
   *
   * :: TrezorDevice -> Promise
   */
  TrezorDevice.prototype.reloadFeatures = function () {
    //if features is null, it's probably not loaded yet or it's in some other weird state
    if (this.features != null) {
      if (this.supports('getFeatures')) {
        return this._session.getFeatures().then(function (res) {
          this.features = res.message;
        }.bind(this));
      }
    }
    return $q.when();
  }


  /**
   * If Trezor supports getFeatures, reloads features,
   * else calls initializeDevice (in case of older Trezors)
   */
  TrezorDevice.prototype.maybeReloadFeatures = function () {
    //if features is null, it's probably not loaded yet or it's in some other weird state
    if (this.features != null) {
      if (this.supports('getFeatures')) {
        return this.reloadFeatures();
      } else {
        return this.initializeDevice();
      }
    }
    return $q.when();
  }

  /**
   * Should I display "lock this device" icon?
   *
   * :: TrezorDevice -> Bool
   */
  TrezorDevice.prototype.displayLock = function () {
    return this.lockStatus() === "unlocked";
  }

  /**
   * Lock status
   *
   * Either "NA" (not applicable - old FW, disconnected)
   * or "locked" / "unlocked"
   *
   * :: TrezorDevice -> String
   */
  TrezorDevice.prototype.lockStatus = function () {
    if (!this._lockMakesSense()) {
      return "NA";
    } else {
      if (this._isUnlocked()) {
        return "unlocked";
      } else {
        return "locked";
      }
    }
  }

  /**
   * Is device unlocked?
   *
   * Shouldn't be used "directly", since it doesn't check for connectedness or
   * for firmware version
   *
   * :: TrezorDevice -> Boolean
   */
  TrezorDevice.prototype._isUnlocked = function () {

    // it could be probably done by && and || but this is more readable, I think

    if (this.features.passphrase_protection) {
      if (this.features.pin_protection) {
        return this.features.pin_cached && this.features.passphrase_cached;
      } else {
        return this.features.passphrase_cached;
      }
    } else {
      if (this.features.pin_protection) {
        return this.features.pin_cached;
      } else {
        return false;
      }
    }
  }

  /**
   * Checks if displaying lock makes sense
   *
   * loading, disconnected, old FW == doesn't make sense, false
   *
   * :: TrezorDevice -> Boolean
   */
  TrezorDevice.prototype._lockMakesSense = function () {
    if (!this.supports('cacheInFeatures')) {
      return false;
    }

    if (this.status() !== this.STATUS_CONNECTED) {
      return false;
    }
    return (this.features.passphrase_protection || this.features.pin_protection);
  }


  /**
   * Is device in a "loading" state?
   * Meaning both "device is initializing" and "accounts are loading".
   *
   * :: TrezorDevice -> Bool
   */
  TrezorDevice.prototype.isLoading = function () {
    return (!!this._loadingLevel);
  };


  TrezorDevice.prototype.withLoading = function (fn) {
    var self = this;

    self._loadingLevel++;

    var fnRes = fn();

    return $q.when(fnRes).finally(function () {
      self._loadingLevel--;
      if (self._loadingLevel === 0) {
        return self.maybeReloadFeatures();
      }
      return $q.when();
    }).then(function () {
      return fnRes;
    });
  };


  /**
   * Returns status of a device, as a string.
   *
   * :: TrezorDevice ->
   *    String -- string, that is either "connected", "disconnected" or "loading"
   */
  TrezorDevice.prototype.status = function () {
    if (this.isLoading()) return this.STATUS_LOADING;
    if (this.isConnected()) return this.STATUS_CONNECTED;
    return this.STATUS_DISCONNECTED;
  };

  /**
   * Is device in a state where it can send transactions?
   * Note: this will return TRUE even when it's "locked" by PIN/passphrase
   *
   * :: TrezorDevice -> Bool
   */
  TrezorDevice.prototype.canSendTx = function () {
    return (this.isConnected() && !(this.isLoading()));
  }

  TrezorDevice.prototype.label = function () {
    if (this.features && this.features.label)
      return this.features.label;
    else
      return this.DEFAULT_LABEL;
  };


  TrezorDevice.prototype.defaultCoin = function () {
    return _.find(this.features.coins, {
      coin_name: config.coin
    });
  };

  TrezorDevice.prototype.supports = function (key) {
    if (this.features && config.features[key]) {
      return [
        this.features.major_version,
        this.features.minor_version,
        this.features.patch_version,
      ].join('.') >= config.features[key];
    } else {
      return false;
    }
  };

  //
  // Passphrase
  //

  TrezorDevice.prototype.hasSavedPassphrase = function () {
    return !!this._passphrase;
  };

  TrezorDevice.prototype.checkPassphraseAndSave = function (passphrase) {
    var hash = this._hashPassphrase(passphrase);

    if (this._passphrase)
    //deep equality of two arrays
      return JSON.stringify(this._passphrase) === JSON.stringify(hash);
    else {
      this._passphrase = hash;
      return true;
    }
  };

  TrezorDevice.prototype._hashPassphrase = function (passphrase) {
    var secret = 'TREZOR#' + this.id + '#' + passphrase;
    var buffer = utils.sha256x2(secret, {
      asBytes: true
    });
    return Array.prototype.slice.call(buffer);
  };

  //
  // HW connections
  //

  /**
   * :: TrezorDevice -> Bool
   */
  TrezorDevice.prototype.isConnected = function () {
    return !!this._session;
  };

  TrezorDevice.prototype.connect = function (session) {
    this._session = session;
    this.on = this._session.on.bind(this._session);
    this.once = this._session.once.bind(this._session);
    this.removeListener = this._session.removeListener.bind(this._session);

    this._callInProgress = false;

  };

  TrezorDevice.prototype.addSessionListeners = function () {

    var onSend = function () {
      this._callInProgress = true;
    }.bind(this)

    var onReceiveOrError = function () {
      this.setClearTimeout();
      this._callInProgress = false;
    }.bind(this)

    this.on('send', onSend);
    this.on('receive', onReceiveOrError);
    this.on('error', onReceiveOrError);

  }



  TrezorDevice.prototype.disconnect = function () {

    this.cancelClearTimeout();

    if (this._session)
      this._session.release();
    this._session = null;
  };

  //
  // HW initialization
  //

  TrezorDevice.prototype.isEmpty = function () {
    return !this.features || !this.features.initialized;
  };

  TrezorDevice.prototype.initializeDevice = function () {
    var self = this,
      delay = 3000, // delay between attempts
      max = 60; // give up after n attempts

    // keep trying to initialize
    return utils.endure(callInitialize, delay, max)
      .then(
        function (res) {
          return (self.features = res.message);
        },
        function (err) {
          self.features = null;
          throw err;
        }
      );

    function callInitialize() {
      if (!self.isConnected()) // return falsey to cancel endure()
        return false;

      return self._session.initialize().then(
        function (res) {
          var features = res.message;
          if (features.bootloader_mode) {
            self.id = self.path;
          } else {
            self.id = features.device_id;
          }
          self.error = null;
          return res;
        },
        function (err) {
          self.error = err.message || 'Failed to initialize the device.';
          throw err;
        }
      );
    }
  };



  TrezorDevice.prototype.flash = function (firmware) {
    var self = this;

    return self._session.eraseFirmware().then(function () {
      return self._session.uploadFirmware(firmware);
    });
  };

  TrezorDevice.prototype.wipe = function () {
    var self = this;

    return self.withLoading(function () {
      return self._session.initialize()
        .then(function () {
          return self._session.wipeDevice();
        })
    });
  };

  TrezorDevice.prototype.reset = function (settings) {
    var self = this,
      sett = angular.copy(settings);

    return self.withLoading(function () {
      return self._session.initialize()
        .then(function () {
          return self._session.resetDevice(sett);
        })
        .then(function () {
          return self.initializeDevice();
        })
    });
  };

  TrezorDevice.prototype.load = function (settings) {
    var self = this,
      sett = angular.copy(settings);

    try { // try to decode as xprv
      sett.node = utils.xprv2node(sett.payload);
    } catch (e) { // use as mnemonic on fail
      sett.mnemonic = sett.payload;
    }
    delete sett.payload;

    return self.withLoading(function () {
      return self._session.initialize()
        .then(function () {
          return self._session.loadDevice(sett);
        })
        .then(function () {
          return self.initializeDevice();
        })
    });
  };

  TrezorDevice.prototype.recover = function (settings) {
    var self = this,
      sett = angular.copy(settings);

    sett.enforce_wordlist = true;

    return self.withLoading(function () {
      return self._session.initialize()
        .then(function () {
          return self._session.recoverDevice(sett);
        })
        .then(function () {
          return self.initializeDevice();
        })
    });
  };

  TrezorDevice.prototype.changeLabel = function (label) {
    var self = this;

    if (label.length > this.LABEL_MAX_LENGTH) {
      label = label.slice(0, this.LABEL_MAX_LENGTH);
    }

    return self.withLoading(function () {
      return self.maybeReloadFeatures()
        .then(function () {
          return self._session.applySettings({
            label: label
          });
        })
        .then(function () {
          return self.maybeReloadFeatures();
        });
    });
  };

  //input: boolean - true if I want to enable, false if I want to disable
  TrezorDevice.prototype.togglePassphrase = function (enable) {
    var self = this;

    return self.withLoading(function () {
      return self.maybeReloadFeatures()
        .then(function () {
          return self._session.applySettings({
            use_passphrase: (!!enable)
          });
        })
        .then(function () {
          return self.maybeReloadFeatures();
        });
    });
  };

  TrezorDevice.prototype.changePin = function (remove) {
    var self = this;

    return self.withLoading(function () {
      return self.maybeReloadFeatures()
        .then(function () {
          return self._session.changePin(remove);
        })
        .then(function () {
          return self.maybeReloadFeatures();
        });
    });
  };

  TrezorDevice.prototype.ratePin = function (pin) {
    var digits, strength;

    if (pin.length > 9)
      return 0;

    digits = _.uniq(pin.split('')).length;
    strength = fac(9) / fac(9 - digits);

    return strength;

    function fac(n) {
      var i, nf = 1;
      for (i = 2; i <= n; i++) nf *= i;
      return nf;
    }
  };


  TrezorDevice.prototype.shouldShow = function () {
    if (this.features.bootloader_mode === true) {
      return false;
    }
    if (this.features.vendor !== "bitcointrezor.com") {
      return false;
    }
    return true;
  }


  TrezorDevice.prototype.firmwareString = function () {
    return this.features.major_version + "." + this.features.minor_version + "." + this.features.patch_version;
  }

  return TrezorDevice;

});
