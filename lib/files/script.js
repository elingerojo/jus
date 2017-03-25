'use strict'

const fs              = require('fs')
const path            = require('upath')
const browserify      = require('browserify')
const babelify        = require('babelify')
const preset_es2015   = require('babel-preset-es2015')
const preset_react    = require('babel-preset-react')
const concat          = require('concat-stream')
// const File            = require('./lib/file')
const pluralize       = require('inflection').pluralize

module.exports = (MyFile) => class extends MyFile {
  setType () {
    this.type = path.basename(__filename.toLowerCase(), '.js')
    this.typePlural = pluralize(this.type)
  }
/*
  constructor(filepath, sourceDir, targetDir) {
    super(filepath, sourceDir, targetDir)
  }

  squeeze() {
    this.squeezed = false
    this.read()
    this.squeezed = true
  }
*/
  render(context, done) {
    return browserify(this.path.processRelative)
      .transform(babelify, {presets: [preset_es2015, preset_react]})
      .bundle()
      .pipe(concat(function(buffer){
        return done(null, buffer.toString())
      }))
      .on('error', function(err){
        console.error('uh oh, browserify problems', err)
      });
  }

}
