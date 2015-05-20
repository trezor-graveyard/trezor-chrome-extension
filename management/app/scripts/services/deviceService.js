/*global angular*/

/**
 * Device Service
 *
 * Perform various actions when a device is connected / disconnected.
 *
 * Device-related actions that should be performed as a result of a direct
 * user interaction are (and always should be) handled the Device Controller.
 *
 * The only way how this Device Service communicates with the Device Controller
 * is by broadcasting events to Angular's scope.
 *
 * On device connect:
 *
 * - Navigate to the Device URL (if we are on homepage).
 * - Initialize accounts.
 * - Pause device list watching while we communicate with the device.
 *
 * On device disconnect:
 *
 * - Do nothing.
 */
angular.module('webwalletApp')
  .service('deviceService', function (
    trezor, trezorApi, TrezorDevice, deviceList, $rootScope, $location) {

    'use strict';

    var _forgetRequested = false,
      EVENT_ASK_FORGET = 'device.askForget',
      EVENT_ASK_DISCONNECT = 'device.askDisconnect',
      EVENT_CLOSE_DISCONNECT = 'device.closeDisconnect';

    this.EVENT_ASK_FORGET = EVENT_ASK_FORGET;
    this.EVENT_ASK_DISCONNECT = EVENT_ASK_DISCONNECT;
    this.EVENT_CLOSE_DISCONNECT = EVENT_CLOSE_DISCONNECT;

    // Before initialize hooks
    deviceList.registerBeforeInitHook(setupWatchPausing);
    deviceList.registerBeforeInitHook(setupEventBroadcast);
    deviceList.registerBeforeInitHook(deviceList.navigateTo.bind(deviceList), 20);

    // Disconnect hooks
    deviceList.registerDisconnectHook(onDisconnect);

    // Forget hooks
    deviceList.registerForgetHook(onForget);
    deviceList.registerAfterForgetHook(navigateToDefaultDevice);

    // Watch for newly connected and disconnected devices
    deviceList.watch(deviceList.POLLING_PERIOD);

    /**
     * Pause refreshing of the passed device while a communicate with the
     * device is in progress.  While the watching is passed, webwallet will
     * not add / remove the device from the device when
     * it's connected / disconnected, nor will it execute any hooks.
     *
     * @see DeviceList#_connnect()
     * @see DeviceList#_disconnect()
     * @see DeviceList#_progressWithConnected()
     *
     * @param {TrezorDevice} dev  Device object
     */
    function setupWatchPausing(dev) {
      if (trezor instanceof trezorApi.PluginTransport) {
        dev.on(TrezorDevice.EVENT_SEND,
          deviceList.pauseWatch.bind(deviceList));
        dev.on(TrezorDevice.EVENT_ERROR,
          deviceList.resumeWatch.bind(deviceList));
        dev.on(TrezorDevice.EVENT_RECEIVE,
          deviceList.resumeWatch.bind(deviceList));
      }
    }

    /**
     * Broadcast all events on passed device to the Angular scope.
     *
     * @see  _broadcastEvent()
     *
     * @param {TrezorDevice} dev  Device
     */
    function setupEventBroadcast(dev) {
      TrezorDevice.EVENT_TYPES.forEach(function (type) {
        _broadcastEvent($rootScope, dev, type);
      });
    }

    /**
     * Broadcast an event of passed type on passed device to
     * the Angular scope.
     *
     * The event type is prefixed with `TrezorDevice#EVENT_PREFIX`.
     *
     * @param {$scope} scope      Angular scope
     * @param {TrezorDevice} dev  Device
     * @param {String} type       Event type
     */
    function _broadcastEvent(scope, dev, type) {
      dev.on(type, function () {
        var args = [].slice.call(arguments);
        args.unshift(dev);
        args.unshift(TrezorDevice.EVENT_PREFIX + type);
        scope.$broadcast.apply(scope, args);
      });
    }

    /**
     * If the current URL is the URL of the device being disconnected,
     * go to the default device or to homepage if no devices are connected.
     */
    function navigateToDefaultDevice() {
      var dev = deviceList.getDefault();
      if (dev) {
        deviceList.navigateTo(dev);
        return;
      }
      $location.path('/');
    }

    /**
     * Forget current device.
     *
     * If the device is connected, ask the user to disconnect it before.
     *
     * This is achieved by aborting the forget hooks if the device is
     * connected.  When the device is disconnected, this method is called
     * again, but in that case it passes without aborting anything, because
     * the device is no longer connected.
     *
     * Passed `param` object has these mandatory properties:
     * - {TrezorDevice} `dev`: Device instance
     * - {Boolean} `requireDisconnect`: Can the user allowed to cancel the
     *      modal, or does he/she have to disconnect the device?
     *
     * @see  DeviceList#forget()
     * @see  DeviceCtrl.askToDisconnectOnForget()
     *
     * @param {Object} param  Parameters in format:
     *                        {dev: TrezorDevice,
     *                        requireDisconnect: Boolean}
     * @throws Error
     */
    function onForget(param) {
      // Device after firmware update
      if (!param.dev) {
        return;
      }
      // If the device is not connected, forget it immediately.
      if (!param.dev.isConnected()) {
        $rootScope.$broadcast(EVENT_CLOSE_DISCONNECT, param);
        return;
      }
      // If the device is connected, ask to user to disconnect it.
      _forgetRequested = true;
      $rootScope.$broadcast(EVENT_ASK_DISCONNECT, param);
      deviceList.abortHook();
    }

    /**
     * When a device is disconnected, ask the user if he/she wants to
     * forget it or remember.
     *
     * @see  DeviceCtrl.forgetOnDisconnect()
     *
     * @param {TrezorDevice} dev  Device
     */
    function onDisconnect(dev) {
      deviceList.forget(dev);
    }

  });
