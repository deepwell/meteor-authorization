AuthItems = {};

(function () {
  'use strict';

/**
 * Convenience functions for use on client.
 *
 * NOTE: You must restrict user actions on the server-side; any
 * client-side checks are strictly for convenience and must not be
 * trusted.
 *
 * @module Helpers
 */

////////////////////////////////////////////////////////////
// Handlebars helpers
//
// Use a semi-private variable rather than declaring Handlebars
// helpers directly so that we can unit test the helpers.
// XXX For some reason, the Handlebars helpers are not registered
// before the tests run.
//
AuthItems._handlebarsHelpers = {

  /**
   * Handlebars helper to check if current user is in at least one
   * of the target roles.  For use in client-side templates.
   *
   * @method isInRole
   * @param {String} role name of role or comma-seperated list of roles
   * @return {Boolean} true if current user is in at least one of the target roles
   */
  isInRole: function (role) {
    var user = Meteor.user(),
      comma = role && role.indexOf(','),
      roles

    if (!user) return false

    if (comma !== -1) {
      roles = _.reduce(role.split(','), function (memo, r) {
        if (!r || !r.trim()) {
          return memo
        }
        memo.push(r.trim())
        return memo
      }, [])
    } else {
      roles = [role]
    }

    return AuthManager.userIsInRole(user, roles)
  },

  /**
   * Handlebars helper to check if the current user has this role or permission.
   *
   * @method checkAccess
   * @param authItemName string
   * @return boolean true if current user has access
   */
  checkAccess: function(authItemName) {
    var user = Meteor.user()
    if (!user) return false
    return AuthManager.checkAccess(user, authItemName)
  }

}

if (Package.ui) { // meteor >= 0.8
  _.each(AuthItems._handlebarsHelpers, function (func, name) {
    Package.ui.UI.registerHelper(name, func)
  })
} else if ('undefined' !== typeof Handlebars) { // meteor < 0.8
  _.each(AuthItems._handlebarsHelpers, function (func, name) {
    Handlebars.registerHelper(name, func)
  })
} else {
  console.log('WARNING: authorization Handlebars helpers not registered. Handlebars not defined')
}

}());
