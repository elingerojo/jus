#!/usr/bin/env node

const express  = require('express')
const cors     = require('cors')
const morgan   = require('morgan')
const path     = require('upath')
const inflect  = require('inflection').inflect
const env      = require('lil-env-thing')
const jus      = require('./jus')
const log      = require('./log')
const singleContextualize = require('./singleContextualize')

var server = module.exports = express()
server.use(cors())

if (env.production) server.use(morgan('combined'))
if (!env.production && !env.test) server.use(morgan('dev'))

server.start = (sourceDir, cb) => {
  if (!sourceDir) sourceDir = process.cwd()
  sourceDir = path.normalize(sourceDir)

  server.port = Number(process.env.JUS_PORT) || 3000
  server.sourceDir = sourceDir

  const bs = require('browser-sync')({
    port: 3030,
    files: path.join(sourceDir, '/**/*'),
    logSnippet: false
  })
  server.use(require('connect-browser-sync')(bs))

  require('./routes')(server)

  jus(server.sourceDir)
    .on('started', () => {
      log(`Juicing ${path.basename(server.sourceDir)}...`)
    })
    .on('squeezing', (files) => {
      log(`Squeezing ${files.length} ${inflect('file', files.length)}...`)
    })
    .on('squeezed', (context) => {
      server.context = context
      if (server.started) return
      server.listen(server.port, function (err) {
        if (err) throw (err)
        server.started = true
        server.url = `http://localhost:${server.port}`
        log(`Et Voila!\nThe server is running at ${server.url}\n`)
        if (cb) return cb(null)
      })
    })
    .on('file-add',    (file) => {
      log(`  ${file.path.relative} added`, 'dim')
      if (!server.started) return
      singleContextualize(server.context, file)
    })
    .on('file-update', (file) => log(`  ${file.path.relative} updated`, 'dim') )
    .on('file-delete', (file) => log(`  ${file.path.relative} deleted`, 'dim') )
}
