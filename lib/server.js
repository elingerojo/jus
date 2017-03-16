#!/usr/bin/env node

const express         = require('express')
const contextualize   = require('./contextualize')
const cors            = require('cors')
const decontextualize = require('./decontextualize')
const morgan          = require('morgan')
const path            = require('upath')
const inflect         = require('inflection').inflect
const env             = require('lil-env-thing')
const jus             = require('./jus')
const log             = require('./log')

const BROWSER_SYNC_DELAY = 500 // milliseconds

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
    reloadDelay: BROWSER_SYNC_DELAY,
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

// TODO: Refractor local tryToContextualize() in file-add and file-update

      // Local functiion to overcome setInterval() No parameters requirement
      function tryToContextualize() {
        // Still not squeezed files? then abort and wait for next interval
        if (!file.squeezed) return
        contextualize(server.context, [file])
        clearInterval(tryToContextualize)
      }

      log(`  ${file.path.relative} added`, 'dim')
      if (!server.started) return
      tryToContextualize = setInterval(tryToContextualize, 100)
    })
    .on('file-update', (file) => {
      // Local functiion to overcome setInterval() No parameters requirement
      function tryToContextualize() {
        // Still not squeezed files? then abort and wait for next interval
        if (!file.squeezed) return
        contextualize(server.context, [file])
        // release semaphore (set in emit file-update)
        file.inUpdateQueue = false
        clearInterval(tryToContextualize)
      }

      log(`  ${file.path.relative} updated`, 'dim')
//      console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@ on file-update vvvvvvvvv')
//      console.log('file.stats = ',file.stats)
//      console.log('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%% on file-update ^^^^^^^^^')
      decontextualize(server.context, [file])
      file.squeeze()
      tryToContextualize = setInterval(tryToContextualize, 0)
    })
    .on('file-delete', (file) => {
      log(`  ${file.path.relative} deleted`, 'dim')
      decontextualize(server.context, [file])
    })
}
