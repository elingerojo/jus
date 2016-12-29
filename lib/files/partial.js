'use strict'

const fs              = require('fs')
const path            = require('upath')
const File            = require('../file')

module.exports = class Partial extends File {

  constructor(filepath, sourceDir, targetDir) {
    super(filepath, sourceDir, targetDir)
  }

  squeeze() {
    this.squeezed = false
    this.setName()
    this.read()
    this.squeezed = true
  }

  wrap(content) {
    return this.input.replace('{{{body}}}', content)
  }

  setName() {
/*
    if (this.path.name === 'layout') {
      this.name = 'default'
      return
    }
*/
    this.name = this.path.name
      .replace(/partial/i, '')
      .replace(/^(-|_)+/, '')
      .replace(/(-|_)+$/, '')
  }

  static test(filename) {
    return !!filename.match(/\/partial.*\.(html|hbs|handlebars|markdown|md|mdown)$/i)
  }

}
