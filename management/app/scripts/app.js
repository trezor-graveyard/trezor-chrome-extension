/**
 * Main
 *
 * - Load Transport.
 * - Bootstrap Angular app.
 * - Register Bitcoin URI handler.
 */
(function (angular) {
  'use strict';

  //logging user agent string as soon as possible
  console.log("[app] User agent : ", window.navigator.userAgent);

  angular.module('webwalletApp', [
    'ngRoute',
    'ngSanitize',
    'ui.bootstrap',
    'ja.qr'
  ]);

  // Load the Transport and bootstrap the Angular app.
  angular.element(document).ready(function () {
    init(
      loadConfig()
    );
    registerUriHandler();
  });


  function isIE() {
    var myNav = navigator.userAgent.toLowerCase();
    return (myNav.indexOf('msie') != -1) ? parseInt(myNav.split('msie')[1]) : false;
  }

  /**
   * Try to load the Transport and then bootstrap the Angular app.
   *
   * @param {Object} config  Configuration
   *
   * @see  acquireTransport()
   * @see  createApp()
   */
  function init(config) {
    if (isIE()) {
      if (isIE() <= 9) {
        createApp("MSIE 9 and lower is not supported. Please install a newer browser!");
        return;
      }
    }

    var configUrl = config.configUrl;
    var configPromise = window.trezor.http(configUrl);
    var extensionId = config.extensionId;

    acquireTransport(extensionId)
      .then(function (transport) {
        return configPromise
          .then(function (config) {
            return transport.configure(config);
          })
          .then(function () {
            createApp(null, transport);
          });
      })
      .catch(function (err) {
        createApp(err);
      });
  }

  /**
   * Inject and return the config service.
   *
   * @return {Object}  Config service
   */
  function loadConfig() {
    var injector = angular.injector(['webwalletApp']);
    return injector.get('config');
  }

  /**
   * Acquire Transport
   *
   * @param {String} extensionId  ID of extension 
   * @return {Promise}          If the Transport was loaded, the Promise is
   *                            resolved with an instance of `HttpTransport`
   *                            or `PluginTransport`.  If loading failed
   *                            the Promise is failed.
   */
  function acquireTransport(extensionId) {
    var trezor = window.trezor;

    function loadExtension() {
      return trezor.ChromeExtensionTransport.create(extensionId);
    }


    return loadExtension().catch(function (e) {
      console.log(e);
      throw (e);
    });
  }

  /**
   * Bootstrap (create and initialize) the Angular app.
   *
   * Pass to the app the reference to the Transport object.
   *
   * @param {Error|null} err    Error from the Transport loading process
   * @param {Object} transport  Transport object
   */
  function createApp(err, transport) {
    // Create module.
    var app = angular.module('webwalletApp');
    var container = document.getElementById('webwalletApp-container');

    // Attach routes.
    if (!err) {
      app.config(attachRoutes).config(
        function ($compileProvider) {
          $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension):/);
        }
      );
    } else {
      console.error(err);
    }

    // Pass Transport reference.
    app
      .value('trezorError', err)
      .value('trezorApi', window.trezor)
      .value('trezor', transport);

    // Initialize Angular.js.
    try {
      angular.bootstrap(container, ['webwalletApp']);
    } catch (err2) {
      console.error('[app] Error occured while bootstrapping ' +
        'the Angular.js app.');
      console.error(err2);
      container.innerHTML = [
        '<div class="page-container container">',
        '  <div class="row" ng-if="installed">',
        '    <div class="col-md-6 col-md-offset-3">',
        '      <div class="alert alert-danger">',
        '        <h4>Plugin loading failed :(</h4>',
        '        <textarea>',
        err || '',
        err2,
        '        </textarea>',
        '      </div>',
        '    </div>',
        '  </div>',
        '</div>'
      ].join('');
      container.removeAttribute('ng-cloak');
    }
  }

  /**
   * Attach routes to passed $routeProvider.
   *
   * @param {Object} $routeProvider  Angular $routeProvider as returned
   *                                 by `app.config()`.
   */
  function attachRoutes($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'views/main.html'
      })
      .when('/import', {
        templateUrl: 'views/import.html'
      })
      .when('/device/:deviceId', {
        templateUrl: 'views/device/index.html'
      })
      .when('/device/:deviceId/advanced', {
        templateUrl: 'views/device/advanced.html'
      })
      .when('/device/:deviceId/settings', {
        templateUrl: 'views/device/settings.html'
      })
      .when('/device/:deviceId/recovery', {
        templateUrl: 'views/device/recovery.html'
      })
      .when('/device/:deviceId/wipe', {
        templateUrl: 'views/device/wipe.html'
      })
      .when('/send/:uri*', {
        resolve: {
          uriRedirect: 'uriRedirect'
        }
      })
      .otherwise({
        redirectTo: '/'
      });
  }

  /**
   * Register Bitcoin URI handler
   *
   * Requests to this URI are then handled by the `uriRedirect` service.
   *
   * @see  services/uriRedirect.js
   */
  function registerUriHandler() {
    var URI_PROTOCOL = 'bitcoin',
      URI_TEMPLATE = '/#/send/%s',
      URI_NAME = 'MyTrezor: Send Bitcoins to address',
      url;

    url = location.protocol + '//' + location.host + URI_TEMPLATE;
    if (navigator.registerProtocolHandler &&
      (!navigator.isProtocolHandlerRegistered ||
        !navigator.isProtocolHandlerRegistered(URI_PROTOCOL, url))) {
      navigator.registerProtocolHandler(
        URI_PROTOCOL,
        url,
        URI_NAME
      );
    }
  }

}(this.angular));
