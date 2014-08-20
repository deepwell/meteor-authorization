/**
 * AuthManager
 *
 * Note: New roles, permissions and associations can only be made on the server.
 */

(function() {
  'use strict';

  /**
   * Create a new role. Whitespace will be trimmed.
   *
   * @method createRole
   * @param name string  Role name
   * @param type string  AuthItem type
   * @return AuthItem
   */
  AuthManager.createRole = function (name) {
    if (!name
        || 'string' !== typeof name
        || name.trim().length === 0) {
      return;
    }

    var role = {
      'name': name.trim(),
      'type': AuthManager.TYPES.ROLE,
      'children': []
    };

    var id = createItem(role);
    return Meteor.authItems.findOne({ _id: id });
  }

  /**
   * Create a new permission. Whitespace will be trimmed.
   *
   * @method createPermission
   * @param name string  Permission name
   * @param description string description of this permission
   * @return AuthItem
   */
  AuthManager.createPermission = function(name, description) {
    if (!name
        || 'string' !== typeof name
        || name.trim().length === 0) {
      return;
    }

    var permission = {
      'name': name.trim(),
      'type': AuthManager.TYPES.PERMISSION
    };

    if (description && 'string' === typeof description) {
      permission.description = description.trim();
    };

    var id = createItem(permission);
    return Meteor.authItems.findOne({ _id: id });
  }

  /**
   * Delete an existing AuthItem.  Will throw "Auth Item X is in use" error if any users
   * are currently assigned to the target name.
   *
   * @method deleteAuthItem
   * @param name  Name of AuthItem
   */
  AuthManager.deleteAuthItem = function (name) {
    if (!name)
      return;

    var foundExistingUser = Meteor.users.findOne({authItems: {$in: [name]}}, {_id: 1});
    if (foundExistingUser) {
      throw new Meteor.Error(403, 'AuthItem ' + name + 'is in use');
    }

    var authItem = Meteor.authItems.findOne({ name: name });
    if (authItem) {
      Meteor.authItems.remove({ _id: authItem._id });
    }
  }

  /**
   * Add users to roles. Will create roles as needed.
   *
   * Makes 2 calls to database:
   *  1. retrieve list of all existing roles
   *  2. update users' roles
   *
   * @method addUsersToRoles
   * @param {Array|String} users id(s) of users to add to roles
   * @param {Array|String} roles name(s) of roles to add users to
   */
  AuthManager.addUsersToRoles = function (users, roles) {
    if (!users) throw new Error ("Missing 'users' param");
    if (!roles) throw new Error ("Missing 'roles' param");

    var existingRoles;

    // ensure arrays
    if (!_.isArray(users)) users = [users];
    if (!_.isArray(roles)) roles = [roles];

    // remove invalid roles
    roles = _.reduce(roles, function (memo, role) {
      if (role &&
          'string' === typeof role &&
          role.trim().length > 0) {
        memo.push(role.trim())
      }
      return memo;
    }, []);

    if (roles.length === 0) {
      return;
    }

    // ensure all roles exist in 'authItems' collection
    existingRoles = _.reduce(Meteor.authItems.find({}).fetch(), function (memo, role) {
      memo[role.name] = true;
      return memo;
    }, {});
    _.each(roles, function (role) {
      if (!existingRoles[role]) {
        AuthManager.createRole(role);
      }
    });

    // update all users, adding to roles set
    if (Meteor.isClient) {
      _.each(users, function (user) {
        // Iterate over each user to fulfill Meteor's 'one update per ID' policy
        Meteor.users.update(
          {       _id: user },
          { $addToSet: { authItems: { $each: roles } } },
          {     multi: true }
        );
      });
    } else {
      // On the server we can leverage MongoDB's $in operator for performance
      Meteor.users.update(
        {       _id: { $in: users } },
        { $addToSet: { authItems: { $each: roles } } },
        {     multi: true }
      );
    }
  }

  /**
   * Remove users from roles
   *
   * @method removeUsersFromRoles
   * @param {Array|String} users id(s) of users to add to roles
   * @param {Array|String} roles name(s) of roles to add users to
   */
  AuthManager.removeUsersFromRoles = function (users, roles) {
    if (!users) throw new Error ("Missing 'users' param");
    if (!roles) throw new Error ("Missing 'roles' param");

    // ensure arrays
    if (!_.isArray(users)) users = [users];
    if (!_.isArray(roles)) roles = [roles];

    // update all users, remove from roles set
    if (Meteor.isClient) {
      // Iterate over each user to fulfill Meteor's 'one update per ID' policy
      _.each(users, function (user) {
        Meteor.users.update(
          {      _id: user },
          { $pullAll: { authItems: roles } },
          {    multi: true}
        );
      });
    } else {
      // On the server we can leverage MongoDB's $in operator for performance
      Meteor.users.update(
        {      _id: {   $in: users } },
        { $pullAll: { authItems: roles } },
        {    multi: true}
      );
    }
  }

  /**
   * Add child item to item name.
   *
   * @param itemName   Parent auth item name
   * @param childName  Child auth item name
   */
  AuthManager.addItemChild = function(itemName, childName) {
    return Meteor.authItems.update(
      {      name: itemName },
      { $addToSet: { children: childName } }
    );
  }

  /**
   * Create auth item in Mongo.
   *
   * @return string  Mongo Item ID
   */
  function createItem(doc) {
    try {
      return Meteor.authItems.insert(doc);;;;
    } catch (e) {
      // (from Meteor accounts-base package, insertUserDoc func)
      // XXX string parsing sucks, maybe
      // https://jira.mongodb.org/browse/SERVER-3069 will get fixed one day
      if (e.name !== 'MongoError') throw e;
      var match = e.err.match(/^E11000 duplicate key error index: ([^ ]+)/);
      if (!match) throw e;
      if (match[1].indexOf('$name') !== -1)
        throw new Meteor.Error(403, "Cannot add '" + name + "' because AuthItem already exists");
      throw e;
    }
  }

}());
