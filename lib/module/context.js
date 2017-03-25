'use strict'

// const forIn           = require('lodash').forIn
const pluralize       = require('inflection').pluralize
//const primitives      = require('require-dir')('../files')
const ContextFile     = require('./contextFile')
const fileTypes       = require('require-dir')('./files')
var customTypes
var extendedFileClass

module.exports = class Contexter {
  //
  //  Create an empty holding structure like:
  //
  //   {
  //      files: [],
  //      datafiles: [],
  //      images: [],
  //      layouts: [],
  //      scripts: [],
  //      stylesheets: [],
  //      unknowns: []
  //  }
  //
  //  ...from the plural of all the filenames on directory /lib/files
  //
  //  (...more info below)
  //
  constructor (_classExtenderDir) {
//    const FilesFile          = require(_classExtenderDir +'/file')
    customTypes         = require('require-dir')(_classExtenderDir)

    // Is there a custom function to "extend" File class
    if (customTypes.file) {
      extendedFileClass = class MyExtendedFileClass extends customTypes.file(ContextFile) {}
      delete customTypes.file
    } else {
      extendedFileClass = class MyExtendedFileClass extends ContextFile {}
    }
/*
    // Load default module file types
    forIn(fileTypes, (val, key) => {
      fileTypes[key] = val(extendedFileClass)
    })

    // Extend default file types with custom file types, if any
    forIn(customTypes, (val, key) => {
      fileTypes[key] = (fileTypes[key]) ? val(fileTypes[key]) : val(extendedFileClass)
    })
*/
    Object.keys(fileTypes).forEach(type => {
      fileTypes[type] = fileTypes[type](extendedFileClass)
    })

    Object.keys(customTypes).forEach(type => {
      if (fileTypes[type]) {
        fileTypes[type] = customTypes[type](fileTypes[type])
      } else {
        fileTypes[type] = customTypes[type](extendedFileClass)
      }
    })

    this.context = {}
    this.context.files =  [] // start with files array empty
    Object.keys(fileTypes).forEach(type => {
      const t = pluralize(type)
      this.context[t] = [] // add primitive keys and initialize to an empty array
    })
    this.fileTypes = fileTypes
  }
}
//
// This structure will be used to hold all the data related and extracted from
// the user files.
// The structure is organized by file's type.
// If you want to add a new type, you need to add a script with the new class
// in the directory /lib/files so this structure will have a new key named
// by your new script filename
//
// Every time a new file is added, it is added in four places. One in the
// `files` array, second in the same array but under a named key for easy access
// by handlebars, third in its type array (ex. `stylesheets`) and finally again
// added in the same type array but also under a named key.
//
// ex. If a user stylesheet is added, it is added in `files` array twice AND
//     also added to `stylesheets` array twice.
//
// Every modfication like updating or deleting user files is also done in four
// places to reflect this behaivor.
