/*global angular*/

/**
 * Device list service
 *
 * Provides an instance of `DeviceList` as an Angular service `deviceList`.
 */
angular.module('webwalletApp').factory('deviceList', function (
  _,
  $q,
  config,
  utils,
  flash,
  trezor,
  trezorApi,
  TrezorDevice,
  modalOpener,
  udevError,
  $location) {

  'use strict';

  /**
   * Device list
   *
   * Manage connecting and disconnecting of devices.
   *
   * Example use cases:
   *
   * Use `DeviceList#all()` to retrieve a list of all known devices
   * (conected and disconnected).
   *
   * Use `DeviceList#get()` to retrieve the `TrezorDevice` object for
   * a device specified by a its ID.
   *
   * Use `DeviceList#registerAfterInitHook()` to execute your code
   * every time a device is connected.
   *
   * @constructor
   */
  function DeviceList() {
    this._devices = [];

    this._watchPaused = false;
    this._enumerateInProgress = false;
    this._enumerateCanWait = false;

    this._beforeInitHooks = [];
    this._afterInitHooks = [];
    this._disconnectHooks = [];
    this._forgetHooks = [];
    this._afterForgetHooks = [];

  }

  DeviceList.prototype.POLLING_PERIOD = 1000;

  DeviceList.prototype.DEFAULT_HOOK_PRIORITY = 50;
  DeviceList.prototype.DEFAULT_HOOK_NAME = 'anonymous';


  /**
   * Find a device by passed device ID or device descriptor.
   *
   * @param {String|Object} id         Device ID or descriptor in format
   *                                   {id: String, path: String}
   * @return {TrezorDevice|undefined}  Device or undefined if not found
   */
  DeviceList.prototype.get = function (desc) {
    var search;
    if (desc.id) {
      search = {
        id: desc.id
      };
    } else if (desc.path) {
      search = {
        path: desc.path
      };
    } else if (desc) {
      search = {
        id: desc
      };
    } else {
      return;
    }
    return _.find(this._devices, search);
  };


  DeviceList.prototype.existsConnected = function (desc) {
    var found = this.get(desc);
    if (found === undefined) {
      return false;
    }
    if (!found.isConnected()) {
      return false;
    }
    return true;
  }

  /**
   * Add a new device to the device list.
   *
   * @param {TrezorDevice} dev  Device to add
   */
  DeviceList.prototype.add = function (dev) {
    this._devices.push(dev);
  };

  /**
   * Get the default device.
   *
   * That is currently the first device.
   *
   * @return {TrezorDevice}  Default device
   */
  DeviceList.prototype.getDefault = function () {
    return this.all()[0];
  };

  /**
   * Get all devices.

   * @return {Array of TrezorDevice}       All devices
   */
  DeviceList.prototype.all = function () {

    return _.filter(this._devices, function (device) {
      return device.shouldShow();
    });
  };

  /**
   * Get the total number devices.
   * @return {Number}                      Number of devices
   */
  DeviceList.prototype.count = function () {
    return this.all().length;
  };

  /**
   * Remove a device from the device list (and subsequently from
   * the storage).
   *
   * This is a low level method.  If you want to forget the device, call
   * `DeviceList#forget()`, which executes all forget hooks properly.
   *
   * @param {TrezorDevice} dev  Device to remove
   */
  DeviceList.prototype.remove = function (dev, dontDestroy) {
    if (dontDestroy === undefined) {
      dontDestroy = false;
    }
    var search = {};
    if (!dontDestroy) {
      dev.destroy();
    }
    if (dev.id) {
      search.id = dev.id;
    } else if (dev.path) {
      search.path = dev.path;
    }
    _.remove(this._devices, search);
  };


  /**
   * Forget the device
   *
   * Run the forget hooks before.  If none of the hooks throws Error, then
   * the device is forgotten.
   *
   * @return {Promise}  Fulfilled when the device is forgotten
   */
  DeviceList.prototype.forget = function (dev, requireDisconnect, customText) {
    return $q.when({
        dev: dev,
        requireDisconnect: requireDisconnect,
        customText: customText
      })
      .then(this._execHooks(this._forgetHooks))
      .then(function (param) {
        this.remove(param.dev);
      }.bind(this))
      .then(this._execHooks(this._afterForgetHooks));
  };

  /**
   * Watch for newly connected / disconnected devices.
   *
   * - Update the device list -- add newly connected devices, remove
   * disconnected devices.
   * - Initiliaze newly connected devices.
   * - Execute all registered hooks for newly connected / disconnected devices.
   *
   * This whole routine can be paused using `DeviceList#pauseWatch()`.
   *
   * @see  DeviceList#_connect()
   * @see  DeviceList#_disconnect()
   * @see  DeviceList#pauseWatch()
   * @see  DeviceList#resumeWatch()
   *
   * @param {Number} n  Polling period in miliseconds
   * @return {Promise}  Ticking Promise
   */
  DeviceList.prototype.watch = function (n) {
    var tick = utils.tick(n),
      connected = $q.defer(),
      delta;

    this._progressWithConnected(connected);
    tick.then(null, null, function () {
      this._progressWithConnected(connected);
    }.bind(this));

    delta = this._progressWithDescriptorDelta(connected.promise);

    delta.then(null, null, function (dd) {
      if (!dd) {
        return;
      }
      dd.added.forEach(this._connect.bind(this));
      dd.removed.forEach(this._disconnect.bind(this));
    }.bind(this));

    return tick;
  };

  /**
   * Pause device watching.
   *
   * No new devices will be added to the list while watching is paused.
   * The same goes for disconnected devices.  No registered hooks will be
   * executed.
   *
   * @see  DeviceList#resumeWatch()
   * @see  DeviceList#_progressWithConnected()
   */
  DeviceList.prototype.pauseWatch = function () {
    this._watchPaused = true;
  };

  /**
   * Resume device watching after it was previously paused by
   * `DeviceList#pauseWatch()`.
   *
   * @see  DeviceList#pauseWatch()
   * @see  DeviceList#_progressWithConnected()
   */
  DeviceList.prototype.resumeWatch = function () {
    this._watchPaused = false;
  };

  /**
   * Notifies passed Deferred with the list of all currently connected
   * devices.
   *
   * @see  DeviceList#_progressWithDescriptorDelta()
   *
   * @param {Deferred} deferred  Deferred
   */
  DeviceList.prototype._progressWithConnected = function (deferred) {
    if (this._watchPaused || this._enumerateInProgress) {
      return;
    }

    this._enumerateInProgress = true;
    trezor.enumerate(this._enumerateCanWait)
      .then(function (descriptors) {
        deferred.notify(descriptors);
        this._enumerateCanWait = true;
        this._enumerateInProgress = false;
      }.bind(this));
  };

  /**
   * Maps a promise notification with a delta between the current list and
   * previous list of device descriptors.
   *
   * Expects a Promise as an argument and returns a new Promise.  Passed
   * Promise is expected to return the current list of devices as the result.
   * Each time passed Promise is fulfilled, the returned Promise is fulfilled
   * as well with an Object describing the difference between the current
   * list of devices and the list of devices that was passed to this method
   * when it was previously called.
   *
   * @see  DeviceList#_progressWithConnected()
   * @see  DeviceList#_computeDescriptorDelta()
   *
   * @param {Promise} pr  Promise expected to have a list of device
   *                      descriptors as the result
   * @return {Promise}    Promise fulfilled with an Object describing the
   *                      added and removed devices as the result
   */
  DeviceList.prototype._progressWithDescriptorDelta = function (pr) {
    var prev = [],
      tmp;

    return pr.then(null, null, function (curr) {
      if (!curr) {
        return;
      }
      tmp = prev;
      prev = curr;
      return this._computeDescriptorDelta(tmp, curr);
    }.bind(this));
  };

  /**
   * Compute which devices were added and which were removed by comparing
   * two passed lists of device descriptors.
   *
   * Returns an Object with two properties:
   * `added`: Array of added device descriptors
   * `removed`: Array of removed device descriptors
   *
   * @param {Array} xs  Old list of device descriptors
   * @param {Array} ys  New list of device descriptors
   * @return {Object}   Difference in format {added: Array, removed: Array}
   */
  DeviceList.prototype._computeDescriptorDelta = function (xs, ys) {
    return {
      added: _.filter(ys, function (y) {
        return !_.find(xs, {
          path: y.path
        });
      }),
      removed: _.filter(xs, function (x) {
        return !_.find(ys, {
          path: x.path
        });
      })
    };
  };

  /**
   * Intialize the device of the passed descriptor and call the
   * before initialize and after initialize hooks.
   *
   * @param {Object} desc  Device descriptor in format
   *                       {id: String, path: String}
   */
  DeviceList.prototype._connect = function (desc) {
    // Create a temporary device object
    var dev = new TrezorDevice({
      path: desc.path
    });

    // Run low-level connect routine and initialize the device.
    trezor.acquire(desc)
      .then(function (res) {
        var session = new trezorApi.Session(trezor, res.session);
        dev.connect(session);
        return dev.initializeDevice();
      }.bind(this))
      // disconnect, if initialization didn't work
      .catch(function (error) {
        dev.disconnect();
        throw (error); // error is still thrown and shown later
      })
      // update udev status
      .then(function () {
        return udevError.getCurrentErrorStatus()
      })
      // Add the device to
      // the list
      .then(function () {
        this.add(dev);
        return dev;
      }.bind(this))
      // Starting watching recieving and sending messages
      // (has to be done here because otherwise we have two separate devices - 
      //   old and dev from the last step - that are both watching)
      // Might be done as a inithook.... but there will be a new version of mytrezor anyway
      .then(function (dev) {
        dev.addSessionListeners();
        return dev;
      })
      // Execute initialization hooks.
      .then(function (dev) {
        return dev.withLoading(function () {
          return $q.when(dev)
            .then(this._execHooks(this._beforeInitHooks))
            .then(this._execHooks(this._afterInitHooks));
        }.bind(this))
      }.bind(this))
      // Show error message if something failed.
      .catch(function (err) {
        if (!(err instanceof this.DeviceListException)) {
          udevError.getCurrentErrorStatus().then(function (udevErrorStatus) {
            if (udevErrorStatus === false) {
              flash.error(err.message || 'Loading device failed');
            }
          })
          console.log("[deviceList] Catched error, printing stack");
          console.log(err);
          console.log(err.stack);
        }

      }.bind(this));
  };

  /**
   * Register hook
   *
   * This is a low level method, see specific registering methods for more
   * information on how hooks work.
   *
   * @see  `DeviceList#registerBeforeInitHook()`
   * @see  `DeviceList#registerAfterInitHook()`
   * @see  `DeviceList#registerDisconnectHook()`
   *
   * @param {Array} list         List of hooks to which the new hook will be
   *                             added
   * @param {Function} fn        Function
   * @param {Number} [priority]  Hooks with lower priority are executed first
   * @param {Name} [name]        Hook name
   */
  DeviceList.prototype._registerHook = function (list, fn, priority, name) {
    list.push({
      fn: fn,
      priority: priority || this.DEFAULT_HOOK_PRIORITY,
      name: name || fn.name || this.DEFAULT_HOOK_NAME
    });
  };

  /**
   * Execute passed hooks
   *
   * @param {Array} hooks  Hooks
   */
  DeviceList.prototype._execHooks = function (hooks) {
    return function (param) {
      var deferred = $q.defer(),
        len = hooks.length;

      hooks = this._sortHooks(hooks);

      function next(i) {
        var res;

        if (i === len) {
          deferred.resolve(param);
          return;
        }

        res = hooks[i].fn.apply(window, [param]);
        if (res !== undefined) {
          $q.when(res).then(
            function () {
              next(i + 1);
            },
            function (e) {
              deferred.reject(e);
            }
          );
        } else {
          next(i + 1);
        }
      }

      next(0);

      return deferred.promise;
    }.bind(this);
  };

  /**
   * Register before initialize hook
   *
   * Passed function will be called every time a new device is connected,
   * right before it is initialized.
   *
   * The function will be passed a single argument:
   * - {TrezorDevice}  Device instance
   *
   * You can pass an optional Number argument `priority`.  Hooks with lower
   * priority will be executed first.  See `DeviceList#DEFAULT_HOOK_PRIORITY`
   * for the default priority value.
   *
   * You can pass an optional String argument `name`.  The name of the hook
   * will appear in some logs and might be used in the future to find
   * this hook in the list of hooks.
   *
   * @param {Function} fn        Function
   * @param {Number} [priority]  Hooks with lower priority are executed first
   * @param {Name} [name]        Hook name
   */
  DeviceList.prototype.registerBeforeInitHook =
    function (fn, priority, name) {
      this._registerHook(this._beforeInitHooks, fn, priority, name);
    };

  /**
   * Register after initialize hook
   *
   * Passed function will be called every time a new device is connected,
   * right after it was initialized.
   *
   * The function will be passed a single argument:
   * - {TrezorDevice}  Device instance
   *
   * @see  DeviceList#registerInitHook()
   *
   * @param {Function} fn        Function
   * @param {Number} [priority]  Hooks with lower priority are executed first
   * @param {Name} [name]        Hook name
   */
  DeviceList.prototype.registerAfterInitHook =
    function (fn, priority, name) {
      this._registerHook(this._afterInitHooks, fn, priority, name);
    };

  /**
   * Register disconnect hook
   *
   * Passed function will be called every time a device is disconnected.
   *
   * The function will be passed a single argument:
   * - {TrezorDevice}  Device instance
   *
   * @see  DeviceList#registerInitHook()
   *
   * @param {Function} fn        Function
   * @param {Number} [priority]  Hooks with lower priority are executed first
   * @param {Name} [name]        Hook name
   */
  DeviceList.prototype.registerDisconnectHook =
    function (fn, priority, name) {
      this._registerHook(this._disconnectHooks, fn, priority, name);
    };

  /**
   * Register forget hook
   *
   * Passed function will be called every time `DeviceList#forget()`
   * is called.
   *
   * The function will be passed an object argument with these properties:
   * - {TrezorDevice} `dev`: Device instance
   * - {Boolean} `requireDisconnect`: Can the user allowed to cancel the
   *      modal, or does he/she have to disconnect the device?
   *
   * @see  DeviceList#registerInitHook()
   *
   * @param {Function} fn        Function
   * @param {Number} [priority]  Hooks with lower priority are executed first
   * @param {Name} [name]        Hook name
   */
  DeviceList.prototype.registerForgetHook =
    function (fn, priority, name) {
      this._registerHook(this._forgetHooks, fn, priority, name);
    };

  /**
   * Register forget hook
   *
   * Passed function will be called after every `DeviceList#forget()` call.
   *
   * The function will be passed an object argument with these properties:
   * - {TrezorDevice} `dev`: Device instance
   * - {Boolean} `requireDisconnect`: Can the user allowed to cancel the
   *      modal, or does he/she have to disconnect the device?
   *
   * @see  DeviceList#registerInitHook()
   *
   * @param {Function} fn        Function
   * @param {Number} [priority]  Hooks with lower priority are executed first
   * @param {Name} [name]        Hook name
   */
  DeviceList.prototype.registerAfterForgetHook =
    function (fn, priority, name) {
      this._registerHook(this._afterForgetHooks, fn, priority, name);
    };

  /**
   * Marks a device of the passed descriptor as disconnected.
   *
   * Execute disconnect hooks.
   *
   * @param {String} desc  Device descriptor
   */
  DeviceList.prototype._disconnect = function (desc) {
    var path_desc = {
      path: desc.path
    }
    var dev = this.get(path_desc);
    if (!dev) {
      return;
    }
    dev.disconnect();
    return $q.when(dev)
      .then(this._execHooks(this._disconnectHooks));
  };

  /**
   * Go to the URL of passed device.
   *
   * Do nothing if we are already on that URL unless the `force` param
   * is true.
   *
   * @param {TrezorDevice} dev  Device
   * @param {Boolean} force     Go to device index page
   */
  DeviceList.prototype.navigateTo = function (dev, force) {
    if (!dev.shouldShow()) {
      return;
    }

    var path = '/device/' + dev.id;

    if (force || $location.path().indexOf(path) !== 0) {
      $location.path(path);
    }
  };

  /**
   * Sort passed hooks by priority in ascending order -- hooks with the
   * lowest priority will be first.
   *
   * @param {Array} hooks  Hooks
   * @return {Array}       Hooks sorted by priority in ascending order
   */
  DeviceList.prototype._sortHooks = function (hooks) {
    return _.sortBy(hooks, function (hook) {
      return hook.priority;
    });
  };

  /**
   * Call this method from any hook to abort the whole process -- that means
   * to stop execution of all other hooks in the queue.
   *
   * This method is preferred over just throwing an exception, because
   * exceptions thrown by this method will not be shown in a flash error
   * message.
   *
   * @see  DeviceList#_connect()
   */
  DeviceList.prototype.abortHook = function () {
    throw new this.DeviceListException();
  };

  /**
   * @see  DeviceList#abortHook()
   */
  DeviceList.prototype.DeviceListException = function () {};

  /**
   * Does all the things that are needed when the tab is closed
   * - clearing session, calling release
   *
   * It runs synchronously because onbeforeunload cannot
   * have synchronous tab
   */
  DeviceList.prototype.runOnClose = function () {
    console.log("[deviceList] runOnClose()");
    this.all().forEach(function (device) {
      device.runOnClose();
    });
  };

  var newDeviceList = new DeviceList();

  return newDeviceList;

});
