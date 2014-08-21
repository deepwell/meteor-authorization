Package.describe({
  summary: "Role based access control system"
})

Package.on_use(function (api) {
  var both = ['client', 'server'];
  api.use(['underscore', 'handlebars', 'accounts-base'], both);

  // This is needed due to Meteor Issue #1358
  // https://github.com/meteor/meteor/issues/1358
  // The 'weak' flag doesn't work with packages that aren't
  // in meteor's internal cache (ie. non-core packages)
  if(uiExists()) {
    api.use(['ui'], 'client', {weak: true});
  }

  api.export && api.export('AuthManager');

  api.add_files('collections.js', both);
  api.add_files('collections_server.js', 'server');

  api.add_files('lib/auth_manager.js', both);
  api.add_files('lib/auth_manager_server.js', 'server');

  api.add_files('models/auth_item.js', both);

  api.add_files('publications.js', 'server');
  api.add_files('subscriptions.js', 'client');

  api.add_files('roles_client.js', 'client');
})

Package.on_test(function (api) {
  // include accounts-password so Meteor.users exists
  api.use(['authorization', 'accounts-password', 'tinytest'], 'server');

  api.add_files('tests/server.js', 'server');
  api.add_files('tests/client.js', 'client');
})


// workaround for meter issue #1358
// https://github.com/meteor/meteor/issues/1358
function uiExists() {
  var fs = Npm.require('fs'),
      path = Npm.require('path'),
      meteorPackages = fs.readFileSync(path.resolve('.meteor/packages'), 'utf8');

  if (!meteorPackages) {
    return false;
  }

  if (/^\s*ui\s*$/m.test(meteorPackages)) {
    // definitely there
    return true;
  }

  return false;
}
