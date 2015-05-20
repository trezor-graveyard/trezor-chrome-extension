/*global angular*/

'use strict';

/**
 * Flash Messages
 *
 * Usage Examples
 *
 * 1. Simple success message
 *
 * flash('My success message');
 *
 * 2. Error message
 *
 * flash('error', 'My error message');
 *
 * or
 *
 * flash.error('My error message');
 *
 * 3. Message with a custom template:
 *
 * flash.warning({
 *   template: 'Angular template as string <strong>{{foo}}</strong> {{bar}}.',
 *   foo: 'Foooo',
 *   bar: 'bar baz'
 * });
 *
 * 4. List of messages
 *
 * flash(
 *   [
 *     'My success message',
 *     {
 *       level: 'error',
 *       info: 'My info message'
 *     }
 *   ]
 * );
 */
angular.module('webwalletApp')
  .factory('flash', function ($rootScope, $timeout, $interpolate) {
    'use strict';

    var messages = [],
      reset;

    function cleanup() {
      $timeout.cancel(reset);
      reset = $timeout(function () {
        messages = [];
      });
    }

    function emit() {
      $rootScope.$emit('flash:message', messages, cleanup);
    }

    $rootScope.$on('$locationChangeSuccess', emit);

    function asMessage(level, text) {
      if (!text) {
        text = level;
        level = 'success';
      } else if (text.template) {
        return {
          html: $interpolate(text.template)(text),
          level: level
        };
      }
      return {
        level: level,
        text: text
      };
    }

    function asArrayOfMessages(level, text) {
      if (level instanceof Array) {
        return level.map(function (message) {
          if (message.level || message.text) {
            return asMessage(message.level, message.text);
          }
          return asMessage(message);
        });
      }
      return [asMessage(level, text)];
    }

    var flash = function (level, text) {
      messages = asArrayOfMessages(level, text);
      emit(messages);
    };

    ['error', 'warning', 'info', 'success'].forEach(function (level) {
      flash[level] = function (text) {
        flash(level, text);
      };
    });

    flash.clear = function () {
      emit(null);
    };

    return flash;
  })

.directive('flashMessages', function () {
  return {
    controller: function ($scope, $rootScope) {
      $rootScope.$on('flash:message', function (_, messages, done) {
        $scope.messages = messages;
        done();
      });
    },
    restrict: 'EA',
    replace: true,
    template: '<span ng-transclude></span>',
    transclude: true
  };
});
