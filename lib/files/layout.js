'use strict'

const fs              = require('fs')
const path            = require('upath')
const frontmatter     = require('html-frontmatter')
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
    this.setName()
    this.read()
    this.getFrontmatter()
    this.squeezed = true
  }
*/
  preRead() {
    this.setName()
  }

  postRead() {
    this.getFrontmatter()
  }

  distinctContextualize (ctx) {
    // Create ctx.layouts.default, ctx.layouts.foo, etc
    ctx[this.typePlural][this.name] = this
  }

  distinctDecontextualize (ctx) {
    // Remove ctx.layouts.default, ctx.layouts.foo, etc
    delete ctx[this.typePlural][this.name]
  }

  wrap(content) {
    return this.input.replace('{{{body}}}', content)
  }

  setName() {
    if (this.path.name === 'layout') {
      this.name = 'default'
      return
    }

    this.name = this.path.name
      .replace(/layout/i, '')
      .replace(/^(-|_)+/, '')
      .replace(/(-|_)+$/, '')
  }

  getFrontmatter() {
    Object.assign(this, frontmatter(this.input))
  }

  static test(filename) {
    return !!filename.match(/\/layout.*\.(html|hbs|handlebars|markdown|md|mdown)$/i)
  }

}
