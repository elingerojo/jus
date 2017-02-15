'use strict'

const fs              = require('fs')
const marky           = require('marky-markdown')
const yaml            = require('js-yaml')
const snakeCase       = require('lodash').snakeCase
const File            = require('../file')

const separatorPattern =
  new RegExp(/\[\/\/\]: # \(---\)/g) // eslint-disable-line

module.exports = class datafile extends File {
  constructor(filepath, sourceDir, targetDir) {
    super(filepath, sourceDir, targetDir)
  }

  squeeze() {
    this.squeezed = false
    if (this.isJSON) {
      // if not the first time, delete cache
      if (this.data) delete require.cache[require.resolve(this.path.full)]
      this.data = require(this.path.full)
    }
    if (this.isYML) this.data = yaml.safeLoad(fs.readFileSync(this.path.full, 'utf8'))
    this.squeezed = true
    if (this.isMarkdown) {
      var arr = []
      var input = fs.readFileSync(this.path.full, 'utf8')
      input.split(separatorPattern).forEach(elm => {
        arr.push(marky(elm, {
          sanitize: false,            // allow script tags and stuff
          linkify: true,              // turn orphan URLs into hyperlinks
          highlightSyntax: true,      // run highlights on fenced code blocks
          prefixHeadingIds: false,    // prevent DOM id collisions
        }).html())
      })
      this.data = arr
    }
    this.squeezed = true
  }

  get isJSON() {
    return this.path.ext.toLowerCase() === '.json'
  }

  get isYML() {
    var ext = this.path.ext.toLowerCase()
    return ext === '.yml' || ext === '.yaml'
  }

  get isMarkdown() {
    var ext = this.path.ext.toLowerCase()
    return ext === '.md' || ext === '.markdown' || ext === '.mdown'
  }

  get keyName() {
    return snakeCase(`${this.path.dir}_${this.path.name}`)
  }

  static test(filename) {
    return !!filename
      .match(/\/.*datafile.*\.(markdown|md|mdown)$/i)
  }

}
