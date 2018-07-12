/**
 * Versioning
 */

const BAD_REQUEST_STATUS_CODE = 400

let supportedVersions = {
  from: null,
  to: null
}

/**
 * Set range of supported versions
 * @param {String} from - last supported api version
 * @param {String} to - latest supported api version
 */
function setSupportedVersions(from, to) {
  if (!from || !to || !from.length || !to.length) {
    throw new Error('setSupportedVersions Bad function arguments')
  }
  supportedVersions = {
    from,
    to
  }
}

/**
 * Get versions range object
 * @returns {Object} - supported versions
 */
function getSupportedVersions() {
  return supportedVersions
}


/**
 * Use with controllers to enable versioning support
 * @param {Object} controller - Passed controller
 * @param {Object} versions - Supported controller versions
 * @return {Object}
 */
function controllerWithVersioning(controller, versions) {
  if (!controller) {
    throw new Error('Bad function aruments')
  }
  // user should follow strict versioning format
  if (!versions) {
    return controller
  }
  setVersionChain(controller, versions)
  return new Proxy(controller, {
    get: (target, prop) => {
      return (req, res, next) => {
        const reqVersion = res && res.locals && res.locals.apiVersion
        if (reqVersion && versions[reqVersion]) {
          return versions[reqVersion][prop](req, res, next)
        }
        return controller[prop](req, res, next)
      }
    }
  })
}

/**
 * Add routes with and without versioning
 * @param {Object} config - Configuration object
 * @param {Object} config.app - Express app object
 * @param {Array} config.routes - Array of routes
 * @param {String} config.base - Base url
 * @param {String} config.header - Header name with version value
 * @param {String} config.url - url name of version
 */
function withVersioning(config) {
  if (
    !config ||
    !config.routes ||
    !config.base ||
    !config.app ||
    !config.lastSupportedVersion ||
    !config.latestVersion
  ) {
    throw new Error('Bad function aruments')
  }
  setSupportedVersions(config.lastSupportedVersion, config.latestVersion)
  config.routes.forEach(route => {
    const name = Object.keys(route)[0]
    if (config.header && config.header.length) {
      config.app.use(`${config.base}/${name}/`, headerMiddleware(config.header), route[name])
    }
    if (config.url && config.url.length) {
      config.app.use(`${config.base}/:${config.url}/${name}/`, urlMiddleware(config.url), route[name])
    }
  })
}

/**
 * Helper function to set up prototype chain
 * @param {Object} controller - Passed controller
 * @param {Object} versions - Supportet controller versions
 */
function setVersionChain(controller, versions) {
  if (!controller || !versions) {
    throw new Error('Bad function aruments')
  }
  const keys = Object.keys(versions).sort()

  keys.forEach((name, index) => {
    if (index === keys.length - 1) {
      return Object.setPrototypeOf(versions[keys[keys.length - 1]], controller)
    }
    Object.setPrototypeOf(versions[name], versions[keys[`${index + 1}`]])
  })
}

/**
 * Return number from passed version string
 * @param {String} version  - Return version number
 * @returns {Number}
 */
function getVersionNumber(version) {
  if (!version) {
    throw new Error('Bad function aruments')
  }
  return Number(version.replace('v', ''))
}

/**
 * Check if version is active
 * @param {String} version
 * @returns {Boolean}
 */
function isVersionActive(version) {
  if (!version) {
    throw new Error('Bad function aruments')
  }
  return (
    getVersionNumber(version) >= getVersionNumber(getSupportedVersions().from) &&
    getVersionNumber(version) <= getVersionNumber(getSupportedVersions().to)
  )
}

/**
 * Express middleware that extract version from header
 * and sets res.locals.apiVersion (stackoverflow suggestion)
 * Failback to latest api verison
 * Note: Version from url will override version from header is passed
 *
 * @param {Object} name - header name
 * @returns {Function} - Standard express middleware
 */
function headerMiddleware(name) {
  return function(req, res, next) {
    let version = null
    if (req.headers && req.headers[`${name}`]) {
      version = req.headers[`${name}`]
    }

    if (!version) {
      res.locals.apiVersion = getSupportedVersions().to
      return next()
    }
    if (!isVersionActive(version)) {
      return res.status(BAD_REQUEST_STATUS_CODE).json({message: 'Requested API version is not supported'})
    }

    res.locals.apiVersion = version
    next()
  }
}

/**
 * Express middleware that extract version from url
 * and sets res.locals.apiVersion (stackoverflow suggestion)
 * Failback to latest api verison
 * Note: Version from url will override version from header is passed
 *
 * @param {Object} name - header name
 * @returns {Function} - Standard express middleware
 */
function urlMiddleware(name) {
  return function(req, res, next) {
    let version = null
    if (req.params && req.params[`${name}`]) {
      version = req.params[`${name}`]
    }
    if (!version) {
      res.locals.apiVersion = getSupportedVersions().to
      return next()
    }
    if (!isVersionActive(version)) {
      return res.status(BAD_REQUEST_STATUS_CODE).json({message: 'Requested API version is not supported'})
    }
    res.locals.apiVersion = version
    next()
  }
}

module.exports = {
  controllerWithVersioning,
  getVersionNumber,
  headerMiddleware,
  isVersionActive,
  setVersionChain,
  urlMiddleware,
  withVersioning,
  setSupportedVersions,
  getSupportedVersions
}
