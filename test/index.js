'use strict'

const should = require('should')
const {
  controllerWithVersioning,
  withVersioning,
  setVersionChain,
  getVersionNumber,
  isVersionActive,
  urlMiddleware,
  headerMiddleware,
  setSupportedVersions,
  getSupportedVersions
} = require('../src')

const emptyFn = () => {}

describe('Versioning', () => {
  before(() => {
    setSupportedVersions('v1', 'v2')
  })
  describe('setSupportedVersions', () => {
    it('should be defined', () => {
      should.exist(setSupportedVersions)
    })
    it('should throw on bad parameters', () => {
      should.throws(() => setSupportedVersions(null))
      should.throws(() => setSupportedVersions(null, null))
      should.throws(() => setSupportedVersions('', 'v2'))
      should.throws(() => setSupportedVersions('v1', ''))
    })
  })

  describe('getSupportedVersions', () => {
    it('should be defined', () => {
      should.exist(getSupportedVersions)
    })
    it('should get versions range', () => {
      setSupportedVersions('v4', 'v5')
      getSupportedVersions().should.deepEqual({
        from: 'v4',
        to: 'v5'
      })
    })

  })
  describe('controllerWithVersioning', () => {
    const latestController = {
      test: () => 'v3'
    }
    const controllers = {
      v1: {
        test: () => 'v1'
      },
      v2: {
        test: () => 'v2'
      }
    }
    const controller = controllerWithVersioning(latestController, controllers)
    it('should be defined', () => {
      should.exist(controllerWithVersioning)
    })
    it('should throw on bad parameters', () => {
      should.throws(() => controllerWithVersioning(null))
    })

    it('should return passed controller', () => {
      controllerWithVersioning(latestController).should.deepEqual(latestController)
    })
    it('should decorate passed object and invoke latest version ', () => {
      controller.test().should.equal('v3')
    })
    it('should invoke function version from res.locals.apiVersion', () => {
      controller.test(null, {locals: {apiVersion: 'v1'}}).should.equal('v1')
      controller.test(null, {locals: {apiVersion: 'v2'}}).should.equal('v2')
    })
    it('should failback to latest api version if desired is not available', () => {
      const controller = controllerWithVersioning(latestController, controllers)
      controller.test(null, {locals: {apiVersion: 'v4'}}).should.equal('v3')
    })

  })

  describe('withVersioning', () => {
    it('should be defined', () => {
      should.exist(withVersioning)
    })
    it('should throw on bad parameters passed', () => {
      should.throws(() => withVersioning(null))
    })
    it('should iterate passed routes array and set header and url', () => {
      let routes = {}
      const app = {
        use: (name, func) => {
          routes[name] = func
        },
        params: () => {}
      }
      withVersioning({
        routes: [{
          test: emptyFn
        }],
        base: '/api',
        url: 'version',
        header: 'X-Api-Version',
        lastSupportedVersion: 'v1',
        latestVersion: 'v2',
        app})

      Object.keys(routes).should.deepEqual([
        '/api/test/','/api/:version/test/'
      ])
    })
  })

  describe('setVersionChain', () => {
    it('should be defined', () => {
      should.exist(setVersionChain)
    })
    it('should throw on bad parameters passed', () => {
      should.throws(() => setVersionChain(null))
      should.throws(() => setVersionChain(null, {}))
      should.throws(() => setVersionChain({}, null))
    })
    it('should set prototype chain', () => {
      const v1 = {
        test: 'testV1'
      }
      const v2 = {
        test: 'testV2',
      }
      const latest = {
        test: 'testV3',
        notExtended: 'notExtendedV1'
      }

      setVersionChain(latest, {
        v1,
        v2
      })
      Object.getPrototypeOf(v1).should.deepEqual(v2)
      Object.getPrototypeOf(v2).should.deepEqual(latest)
    })
  })
  describe('getVersionNumber', () => {
    it('should be defined', () => {
      should.exist(getVersionNumber)
    })
    it('should throw on bad parameters passed', () => {
      should.throws(() => getVersionNumber(null))
    })
    it('should return version number', () => {
      getVersionNumber('v1').should.equal(1)
      getVersionNumber('v2').should.equal(2)
      getVersionNumber('v15').should.equal(15)
    })
  })
  describe('isVersionActive', () => {
    it('should be defined', () => {
      should.exist(isVersionActive)
    })
    it('should throw on bad parameters passed', () => {
      should.throws(() => isVersionActive(null))
    })
    it('should return version number', () => {
      isVersionActive('v1').should.equal(true)
      isVersionActive('v2').should.equal(true)
      isVersionActive('v15').should.equal(false)
    })
  })
})

describe('API Version middleware', () => {
  before(() => {
    setSupportedVersions('v1', 'v5')
  })
  after(function() {
    setSupportedVersions('v1', 'v2')
  })

  it('should be defined', () => {
    should.exist(urlMiddleware)
    should.exist(headerMiddleware)
  })
  it('should get version from header', () => {
    const req = {
      headers: {
        'x-api-version': 'v2'
      }
    }
    const res = {
      locals: {}
    }
    headerMiddleware('x-api-version')(req, res, () => {})
    res.should.deepEqual({
      locals: {
        apiVersion: 'v2'
      }
    })
  })
  it('should get version from url', () => {
    const req = {
      params: {
        version: 'v2'
      }
    }
    const res = {
      locals: {}
    }
    urlMiddleware('version')(req, res, () => {})
    res.should.deepEqual({
      locals: {
        apiVersion: 'v2'
      }
    })
  })
  it('should fallback to latest if version is not defined', () => {
    const req = {}
    const res = {
      locals: {}
    }
    headerMiddleware('x-api-version')({}, res, () => {})
    res.should.deepEqual({
      locals: {
        apiVersion: 'v5'
      }
    })
    urlMiddleware('version')({}, res, () => {})
    res.should.deepEqual({
      locals: {
        apiVersion: 'v5'
      }
    })
  })
  it('should return 400 if asked for unsupported version', () => {
    let sendMessage = 200
    let status = ''
    const req = {
      params: {
        version: 'v7'
      }
    }
    const res = {
      locals: {},
      status: (number) => {
        status = number
        return res
      },
      json: (st) => {sendMessage = st.message}
    }
    urlMiddleware('version')(req, res, () => {})
    status.should.equal(400)
    sendMessage.should.equal('Requested API version is not supported')
  })
  it('should return 400 if asked for unsupported version', () => {
    let sendMessage = 200
    let status = ''
    const req = {
      headers: {
        'x-api-version': 'v7'
      }
    }
    const res = {
      locals: {},
      status: (number) => {
        status = number
        return res
      },
      json: (st) => {sendMessage = st.message}
    }
    headerMiddleware('x-api-version')(req, res, () => {})
    status.should.equal(400)
    sendMessage.should.equal('Requested API version is not supported')
  })
})