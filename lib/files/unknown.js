'use strict'

// const fs              = require('fs')
// const path            = require('upath')
// const File            = require('./lib/file')
const path            = require('upath')
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
*/
}
