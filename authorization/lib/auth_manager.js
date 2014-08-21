/**
 * AuthManager
 *
 * Note: New roles, permissions and associations can only be made on the server.
 */

AuthManager = {};

(function() {
  'use strict';

  /**
   * Define TYPE constants.
   */
  AuthManager.TYPES = {
    ROLE: 'role',
    PERMISSION: 'permission'
  };

  var userAuthItemsCache = {};

  // allow caching of auth items (since computation is expensive)
  // but only start caching when we have collections fully loaded
  var cachingEnabled = false;

  /**
   * Check if this user has access to this authItem.
   * If it's a role, check all child permissions.
   *
   * @method checkAccess
   * @param User|String user     User object or userId
   * @param String authItemName  Name of the authItem to check
   * @return Boolean             If user has this authItem
   */
  AuthManager.checkAccess = function(user, authItemName) {
    if ('string' === typeof user) {
      user = Meteor.users.findOne({ _id: user }); // convert to user object
    }
    if (!user) {
      return false;
    }


    // Require user's auth items to be loaded before doing the checks
    if (user.authItems === undefined) {
      return false;
    }

    var userAuthItems = getUserAuthItems(user);
    var hasAccess = _.contains(userAuthItems, authItemName);

    return hasAccess;
  }

  /**
   * Return this user's auth items.
   * Building the auth item tree is computationally expensive, so compute once and cache.
   *
   * @param User user   Meteor.user object
   * @return Strings[]  List of auth items
   */
  function getUserAuthItems(user) {
    if (Meteor.isServer || !cachingEnabled) {
      // Don't use cache on the server, since we don't have cache invalidation.
      // Will cause issues on the client, since users access checks will be using cached values.
      return buildValidAuthItems(user.authItems);
    }

    // use cache
    if (userAuthItemsCache[user._id] === undefined) {
      userAuthItemsCache[user._id] = buildValidAuthItems(user.authItems);
    }

    return userAuthItemsCache[user._id];
  }

  /**
   * Build an array of auth items that this user has.
   * Including any nested items
   * TODO: This code is in need of a rewrite and to be given some thought.
   *
   * @param String[] rawAuthItems   Auth item names
   * @return Strings[]
   */
  function buildValidAuthItems(rawAuthItems) {
    if (!_.isArray(rawAuthItems) || rawAuthItems.length === 0)
      return []; // user has no auth items

    var authItems = []; // array of all possible auth items including nested permissions
    _.each(rawAuthItems, function(name) {
      authItems.push(name);
      var authItem = Meteor.authItems.findOne({ name: name });
      if (typeof authItem !== 'undefined') {
        if (authItem.type === AuthManager.TYPES.ROLE) {
          // add any items that are nested
          _.each(authItem.children, function(childName) { // loop through each child
            authItems.push(childName);
            var childItems = buildValidAuthItems([ childName ]);
            authItems = _.union(authItems, childItems);
          });
        }
      }
    });

    return authItems;
  }

  /**
   * Enabled caching.
   */
  AuthManager.enableCache = function() {
    cachingEnabled = true;
  }

  /**
   * Disable caching.
   */
  AuthManager.disableCache = function() {
    cachingEnabled = false;
  }

  /**
   * Check if user is in role
   *
   * @method userIsInRole
   * @param {String|Object} user Id of user or actual user object
   * @param {String|Array} roles Name of role or Array of roles to check against.  If array, will return true if user is in _any_ role.
   * @return {Boolean} true if user is in _any_ of the target roles
   */
  AuthManager.userIsInRole = function (user, roles) {
    if ('string' === typeof user)
      user = Meteor.users.findOne({ _id: user }); // convert to user object
    if (!user)
      return false;

    // ensure array to simplify code
    if (!_.isArray(roles)) {
      roles = [roles];
    }

    var userAuthItems = user.authItems;
    if (_.isArray(userAuthItems)) {
      return _.some(roles, function (role) {
        return _.contains(userAuthItems, role)
      });
    }

    return false;
  }

  /**
   * Check if user has a permission.
   *
   * @method userHasPermission
   * @param {String|Object} user Id of user or actual user object
   * @param {String|Array} permissions Name of permission or Array of permissions to check against.  If array, will return true if user is in _any_ permission.
   * @return {Boolean} true if user is in _any_ of the target permissions
   */
  AuthManager.userHasPermission = function (user, permissions) {
    if ('string' === typeof user)
      user = Meteor.users.findOne({ _id: user }); // convert to user object
    if (!user)
      return false;

    // ensure array to simplify code
    if (!_.isArray(permissions)) {
      permissions = [permissions];
    }

    var userAuthItems = user.authItems;
    if (_.isArray(userAuthItems)) {
      return _.some(permissions, function (permission) {
        return _.contains(userAuthItems, permission);
      });
    }

    return false;
  }

  /**
   * Retrieve users roles
   *
   * @method getRolesForUser
   * @param {String} user Id of user
   * @return {Array} Array of user's roles, unsorted
   */
  AuthManager.getRolesForUser = function (user) {
    user = Meteor.users.findOne(
      { _id: user},
      { _id: 0, authItems: 1}
    );

    return user ? user.authItems : undefined;
  }

  /**
   * Retrieve all existing roles
   *
   * @method getAllRoles
   * @return {Cursor} cursor of existing roles
   */
  AuthManager.getAllRoles = function () {
    return Meteor.authItems.find({}, { sort: { name: 1 } });
  }

  /**
   * Retrieve all users who are in target role
   *
   * @method getUsersInRole
   * @param {String} role Name of role
   * @return {Cursor} cursor of users in role
   */
  AuthManager.getUsersInRole = function (role) {
    return Meteor.users.find(
      { authItems: { $in: [role] } }
    );
  }

}());
