# Express.js controller versioning

Versioning is implemented on controller level. Url and header versioning are supported.

Package does not currently support full semantic versioning. Supported versions are: v1, v2, v3 etc.

## Install

`npm install express-routes-versioning`

or

`yarn add express-controller-versioning`

## Getting started

Package contain two main functions to be used.

- `withVersioning` is used on app level to enable versioning for specific routes.

- `controllerWithVersioning` is used on controller level to enable and to add logic for multiple versions.

## withVersioning

`withVersioning` function accepts:

- routes: Array of routes that supports versioning
- base: APi base url
- url: [optional] Name of url version param. Used if versioning supports url version param.
- header: [optional]  Name of header with version number. Used if versioning supports header version param.
- app: Express.js app object
- latestVersion: Latest version that is supported.
- lastSupportedVersion: Last version tha is still supported

```javascript
withVersioning({
  routes: [{
    users: usersController
  }],
  base: '/api',
  url: 'version',
  header: 'X-Api-Version',
  app: app,
  latestVersion: 'v3',
  lastSupportedVersion: 'v2'
})
```

## controllerWithVersioning

`controllerWithVersioning` functions accepts:

- controller: latest version controller logic.
- versions: Object with keys which values are supported versions names and values are controllers with logic.

Specific version should contain only logic that is sprecific to that version. There is no need to copy all logic as this package is using prototype chaining.

```javascript
const {controllerWithVersioning} = require('express-controller-versioning')

module.exports = controllerWithVersioning(require('./latest'), {
  v1: require('./v1')
})
```

## Directory structure

Example directory contain proposed controllers directory structure

## Example

## FAQ

- What if client ask for unsupported version number?
  - Versioning will not allow that request and will send 400 status code with 'API Version not supported' mesage.
- What if client does not define api version?
  - Versioning will return latest supported api version.

## License


MIT License. © Željko Marković 2018