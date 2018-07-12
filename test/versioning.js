'use strict'

const supertest = require('supertest')
const should = require('should')
const express = require('express')
const bodyParser = require('body-parser')
const versioning = require('../src')
const sinon = require('sinon')

const app = express()
app.use(bodyParser.json())

const controller = versioning.controllerWithVersioning({
  test: (req, res, next) => {
    res.sendStatus(200) // latest returns 200
  }
}, {
  v1: {
    test: (req, res, next) => {
      res.sendStatus(201) // v1 returns 201
    }
  }
})
const router = express.Router().get('/', controller.test)

versioning.withVersioning({
  routes:[
    {test: router}
  ],
  base: '/api',
  url: 'version',
  header: 'x-api-version',
  lastSupportedVersion: 'v1',
  latestVersion: 'v2',
  app
})

describe('Versioning test', () => {
  it('should set version param from header', async () => {
    await supertest(app)
      .get('/api/test')
      .set('x-api-version', 'v1')
      .expect(201)

    await supertest(app)
      .get('/api/test')
      .set('x-api-version', 'v2')
      .expect(200)
  })

  it('should set version param from url', async () => {
    await supertest(app)
      .get('/api/v1/test')
      .expect(201)

    await supertest(app)
      .get('/api/v2/test')
      .expect(200)
  })
  it('should use latest version if not specified', async () => {
    await supertest(app)
      .get('/api/test')
      .expect(200)
  })
  it('should return 400 on bad version', async () => {
    await supertest(app)
    .get('/api/v0/test')
    .expect(400)

    await supertest(app)
      .get('/api/v8/test')
      .expect(400)

    await supertest(app)
      .get('/api/test')
      .set('x-api-version', 'v0')
      .expect(400)

    await supertest(app)
      .get('/api/test')
      .set('x-api-version', 'v8')
      .expect(400)
  })
})