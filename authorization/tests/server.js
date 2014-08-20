(function () {
  'use strict';

  var users = {},
      roles = [ 'admin', 'editor', 'sales' ],
      permissions = [ 'create', 'edit', 'delete' ];


  function addUser (name) {
    return Accounts.createUser({'username': name});
  }

  function reset () {
    Meteor.authItems.remove({});
    Meteor.users.remove({});

    users = {
      'eve': addUser('eve'),
      'bob': addUser('bob'),
      'joe': addUser('joe')
    };
  }


  function testUserRole (test, user, expectedRoles) {
    var userId = users[user];

    _.each(roles, function (role) {
      var expected = _.contains(expectedRoles, role),
          msg = user + ' is not in expected role ' + role,
          nmsg = user + ' is in un-expected role ' + role;

      if (expected) {
        test.isTrue(AuthManager.userIsInRole(userId, role), msg);
      } else {
        test.isFalse(AuthManager.userIsInRole(userId, role), nmsg);
      }
    })
  }

  function testUserPermission (test, user, expectedPermissions) {
    var userId = users[user];

    _.each(permissions, function (permission) {
      var expected = _.contains(expectedPermissions, permission),
          msg = user + ' is not in expected permission ' + permission,
          nmsg = user + ' is in un-expected permission ' + permission;

      if (expected) {
        test.isTrue(AuthManager.userHasPermission(userId, permission), msg);
      } else {
        test.isFalse(AuthManager.userHasPermission(userId, permission), nmsg);
      }
    });
  }

  Tinytest.add(
    'AuthManager - can create and delete roles',
    function (test) {
      reset();

      AuthManager.createRole('test1');
      var role1 = Meteor.authItems.findOne();
      test.equal(role1.name, 'test1');
      test.equal(role1.type, AuthManager.TYPES.ROLE);

      AuthManager.createRole('test2');
      var role2 = Meteor.authItems.findOne({'name':'test2'});
      test.equal(role2.name, 'test2');
      test.equal(role2.type, AuthManager.TYPES.ROLE);

      test.equal(Meteor.authItems.find().count(), 2);

      AuthManager.deleteAuthItem('test2');
      test.equal(typeof Meteor.authItems.findOne({'name':'test2'}), 'undefined');

      AuthManager.deleteAuthItem('test1');
      test.equal(typeof Meteor.authItems.findOne({'name':'test1'}), 'undefined');

      test.equal(typeof Meteor.authItems.findOne(), 'undefined');
    });

  Tinytest.add(
    'AuthManager - can create and delete permissions',
    function (test) {
      reset();

      var permissionDescription = 'Testing permission';
      AuthManager.createPermission('test1', permissionDescription);
      var perm1 = Meteor.authItems.findOne();
      test.equal(perm1.name, 'test1');
      test.equal(perm1.type, AuthManager.TYPES.PERMISSION);
      test.equal(perm1.description, permissionDescription);

      AuthManager.createPermission('test2');
      var perm2 = Meteor.authItems.findOne({'name':'test2'});
      test.equal(perm2.name, 'test2');
      test.equal(perm2.type, AuthManager.TYPES.PERMISSION);
      test.equal(perm2.description, undefined);

      test.equal(Meteor.authItems.find().count(), 2);

      AuthManager.deleteAuthItem('test2');
      test.equal(typeof Meteor.authItems.findOne({'name':'test2'}), 'undefined');

      AuthManager.deleteAuthItem('test1');
      test.equal(typeof Meteor.authItems.findOne({'name':'test1'}), 'undefined');

      test.equal(typeof Meteor.authItems.findOne(), 'undefined');
    })

  Tinytest.add(
    'AuthManager - can\'t create duplicate auth items',
    function (test) {
      reset();

      AuthManager.createRole('test1');
      test.throws(function () {AuthManager.createRole('test1')});

      test.throws(function () {AuthManager.createPermission('test1')});
    });

  Tinytest.add(
    'AuthManager - can check if user is in role',
    function (test) {
      reset();

      Meteor.users.update(
        {"_id":users.eve},
        {$addToSet: { authItems: { $each: ['admin', 'user'] } } }
      );
      testUserRole(test, 'eve', ['admin', 'user']);
    });

  Tinytest.add(
    'AuthManager - can check if user has a permission',
    function (test) {
      reset();

      Meteor.users.update(
        {"_id":users.eve},
        {$addToSet: { authItems: { $each: ['admin', 'user'] } } }
      );
      testUserPermission(test, 'eve', ['admin', 'user']);
    });

  Tinytest.add(
    'AuthManager - can check if non-existant user is in role',
    function (test) {
      reset();

      _.each(roles, function (role) {
        AuthManager.createRole(role);
      });

      test.isFalse(AuthManager.userIsInRole('1', 'admin'));
    });

  Tinytest.add(
    'AuthManager - can check user in role via object',
    function (test) {
      var user;

      reset();

      _.each(roles, function (role) {
        AuthManager.createRole(role);
      });

      AuthManager.addUsersToRoles(users.eve, ['admin', 'user']);
      user = Meteor.users.findOne({_id:users.eve});

      test.isTrue(AuthManager.userIsInRole(user, 'admin'));
    });

  Tinytest.add(
    'AuthManager - userIsInRole returns false when user is null',
    function (test) {
      var user;

      reset();

      _.each(roles, function (role) {
        AuthManager.createRole(role);
      });

      user = null;

      test.isFalse(AuthManager.userIsInRole(user, 'admin'));
    });

  Tinytest.add(
    'AuthManager - can check user against several roles at once',
    function (test) {
      var user;

      reset();

      _.each(roles, function (role) {
        AuthManager.createRole(role);
      });

      AuthManager.addUsersToRoles(users.eve, ['admin', 'user']);
      user = Meteor.users.findOne({_id:users.eve});

      test.isTrue(AuthManager.userIsInRole(user, ['editor','admin']));
    });

  Tinytest.add(
    'AuthManager - can add individual users to roles',
    function (test) {
      reset();

      _.each(roles, function (role) {
        AuthManager.createRole(role);
      });

      AuthManager.addUsersToRoles(users.eve, ['admin', 'user']);

      testUserRole(test, 'eve', ['admin', 'user']);
      testUserRole(test, 'bob', []);
      testUserRole(test, 'joe', []);

      AuthManager.addUsersToRoles(users.joe, ['editor', 'user']);

      testUserRole(test, 'eve', ['admin', 'user']);
      testUserRole(test, 'bob', []);
      testUserRole(test, 'joe', ['editor', 'user']);
    });

  Tinytest.add(
    'AuthManager - can add user to roles multiple times',
    function (test) {
      reset();

      _.each(roles, function (role) {
        AuthManager.createRole(role);
      });

      AuthManager.addUsersToRoles(users.eve, ['admin', 'user']);
      AuthManager.addUsersToRoles(users.eve, ['admin', 'user']);

      testUserRole(test, 'eve', ['admin', 'user']);
      testUserRole(test, 'bob', []);
      testUserRole(test, 'joe', []);
    });

  Tinytest.add(
    'AuthManager - can add multiple users to roles',
    function (test) {
      reset();

      _.each(roles, function (role) {
        AuthManager.createRole(role);
      });

      AuthManager.addUsersToRoles([users.eve, users.bob], ['admin', 'user']);

      testUserRole(test, 'eve', ['admin', 'user']);
      testUserRole(test, 'bob', ['admin', 'user']);
      testUserRole(test, 'joe', []);

      AuthManager.addUsersToRoles([users.bob, users.joe], ['editor', 'user']);

      testUserRole(test, 'eve', ['admin', 'user']);
      testUserRole(test, 'bob', ['admin', 'editor', 'user']);
      testUserRole(test, 'joe', ['editor', 'user']);
    });

  Tinytest.add(
    'AuthManager - can\'t add non-exist user to role',
    function (test) {
      reset();

      _.each(roles, function (role) {
        AuthManager.createRole(role);
      });

      AuthManager.addUsersToRoles(['1'], ['admin']);
      test.equal(Meteor.users.findOne({_id:'1'}), undefined);
    });

  Tinytest.add(
    'AuthManager - can remove individual users from roles',
    function (test) {
      reset();

      _.each(roles, function (role) {
        AuthManager.createRole(role);
      });

      // remove user role - one user
      AuthManager.addUsersToRoles([users.eve, users.bob], ['editor', 'user']);
      testUserRole(test, 'eve', ['editor', 'user']);
      testUserRole(test, 'bob', ['editor', 'user']);
      AuthManager.removeUsersFromRoles(users.eve, ['user']);
      testUserRole(test, 'eve', ['editor']);
      testUserRole(test, 'bob', ['editor', 'user']);
    });

  Tinytest.add(
    'AuthManager - can remove user from roles multiple times',
    function (test) {
      reset();

      _.each(roles, function (role) {
        AuthManager.createRole(role);
      });

      // remove user role - one user
      AuthManager.addUsersToRoles([users.eve, users.bob], ['editor', 'user']);
      testUserRole(test, 'eve', ['editor', 'user']);
      testUserRole(test, 'bob', ['editor', 'user']);
      AuthManager.removeUsersFromRoles(users.eve, ['user']);
      testUserRole(test, 'eve', ['editor']);
      testUserRole(test, 'bob', ['editor', 'user']);

      // try remove again
      AuthManager.removeUsersFromRoles(users.eve, ['user']);
      testUserRole(test, 'eve', ['editor']);
    });

  Tinytest.add(
    'AuthManager - can remove multiple users from roles',
    function (test) {
      reset();

      _.each(roles, function (role) {
        AuthManager.createRole(role);
      });

      // remove user role - two users
      AuthManager.addUsersToRoles([users.eve, users.bob], ['editor', 'user']);
      testUserRole(test, 'eve', ['editor', 'user']);
      testUserRole(test, 'bob', ['editor', 'user']);

      test.isFalse(AuthManager.userIsInRole(users.joe, 'admin'));
      AuthManager.addUsersToRoles([users.bob, users.joe], ['admin', 'user']);
      testUserRole(test, 'bob', ['admin', 'user', 'editor']);
      testUserRole(test, 'joe', ['admin', 'user']);
      AuthManager.removeUsersFromRoles([users.bob, users.joe], ['admin']);
      testUserRole(test, 'bob', ['user', 'editor']);
      testUserRole(test, 'joe', ['user']);
    });

  Tinytest.add(
    'AuthManager - can\'t create role with empty names',
    function (test) {
      reset();

      AuthManager.createRole('');
      AuthManager.createRole(null);

      test.equal(Meteor.authItems.find().count(), 0);

      AuthManager.createRole(' ');
      test.equal(Meteor.authItems.find().count(), 0);
    });

  Tinytest.add(
    'AuthManager - can get all roles for user',
    function (test) {
      reset();
      _.each(roles, function (role) {
        AuthManager.createRole(role);
      });

      AuthManager.addUsersToRoles([users.eve], ['admin', 'user']);
      test.equal(AuthManager.getRolesForUser(users.eve), ['admin', 'user']);
    });

  Tinytest.add(
    'AuthManager - can\'t get roles for non-existant user',
    function (test) {
      reset();
      _.each(roles, function (role) {
        AuthManager.createRole(role);
      });

      test.equal(AuthManager.getRolesForUser('1'), undefined);
    });

  Tinytest.add(
    'AuthManager - can get all roles',
    function (test) {
      reset();
      _.each(roles, function (role) {
        AuthManager.createRole(role);
      });

      // compare roles, sorted alphabetically
      var expected = roles,
          actual = _.pluck(AuthManager.getAllRoles().fetch(), 'name');

      test.equal(actual, expected);
    });

  Tinytest.add(
    'AuthManager - can get all users in role',
    function (test) {
      reset();
      _.each(roles, function (role) {
        AuthManager.createRole(role);
      });

      AuthManager.addUsersToRoles([users.eve, users.joe], ['admin', 'user']);
      AuthManager.addUsersToRoles([users.bob, users.joe], ['editor']);

      var expected = [users.eve, users.joe],
          actual = _.pluck(AuthManager.getUsersInRole('admin').fetch(), '_id');

      // order may be different so check difference instead of equality
      test.equal(_.difference(actual, expected), []);
      test.equal(_.difference(expected, actual), []);
    });

  Tinytest.add(
    'AuthManager - can check if user has a role or a permission',
    function (test) {
      reset();
      AuthManager.createRole('document');
      AuthManager.createPermission('createDoc');

      Meteor.users.update(
        {"_id":users.eve},
        {$addToSet: { authItems: { $each: ['document', 'createDoc'] } } }
      );

      var user = AuthManager.getUsersInRole('document').fetch()[0];

      test.equal(AuthManager.checkAccess(user, 'document'), true);
      test.equal(AuthManager.checkAccess(user, 'createDoc'), true);
    });

  Tinytest.add(
    'AuthManager - can have access to a child item (inherit)',
    function (test) {
      reset();
      AuthManager.createRole('document');
      AuthManager.createPermission('createDoc');

      AuthManager.addItemChild('document', 'createDoc');

      AuthManager.addUsersToRoles(users.eve, ['document']);

      var user = AuthManager.getUsersInRole('document').fetch()[0];

      test.equal(AuthManager.checkAccess(user, 'createDoc'), true);
    });

  Tinytest.add(
    'AuthManager - can have access to a child of a child role (inherit)',
    function (test) {
      reset();
      AuthManager.createRole('admin');
      AuthManager.createRole('management');
      AuthManager.createPermission('test');

      AuthManager.addItemChild('management', 'test');
      AuthManager.addItemChild('admin', 'management');

      AuthManager.addUsersToRoles(users.eve, ['admin']);

      var user = AuthManager.getUsersInRole('admin').fetch()[0];

      test.equal(AuthManager.checkAccess(user, 'test'), true);
    });

}());
