const isEmpty         = require('lodash').isEmpty
const keys            = require('lodash').keys
const mapValues       = require('lodash').mapValues
const oFilter         = require('lodash').filter
const oForEach         = require('lodash').forEach
const uniq            = require('lodash').uniq
const pluralize       = require('inflection').pluralize
const primitives      = require('require-dir')('./files')

module.exports = function contextualize(context, files) {
  // Receives a prexisting context and add new files to it
  // Returns the updated context
  const indirectKey = '_jus_indirect_' // indirect key reserved word

//  var notArrayGlobalKeys = {} // temporay holding globalKeys that are not arrays
  var arr

//  console.log('||||| ||||| ||||| ||||| Entering contextualize ||||| |||||')
//  console.log('files.length = ', files.length)

  // ********
  // STEP ONE
  // ********
  // Only operations that affect `context` and operations that do not affect
  // relations between `files`
  files.forEach(file => {
    const t = pluralize(file.type)

    // ADD FILE FIRST TIME IN `FILES` ARRAY
    // ====================================
    //
    // Add file to a general array named `files`
    // Ex. context.files = [file0, file1, file2, ...etc]
    context.files.push(file)

    // ADD FILE SECOND TIME - NAMED KEYS IN SAME `FILES` ARRAY
    // ========================================
    //
    // Create named key in the array, for easy access
    // Ex. context.files['/styles/foo.sass']
    context.files[file.keyName] = file

    // ADD FILE THIRD TIME IN ITS TYPE ARRAY
    // =====================================
    // They are already present in the `files` array, but this makes the data
    // easier to use within a handlebars template
    //
    // Add file to its type array
    // Ex. context.stylesheets = [file0, file1, file2, ...etc]
    context[t].push(file)

    // ADD FILE FOURTH TIME - NAMED KEYS IN ITS TYPE ARRAY
    // =====================================
    // Create named keys, for easy access
    // context.pages['/index.md']
    // context.stylesheets['/styles/foo.sass']
    // context.datafiles.baz_wibble
    context[t][file.keyName] = file

    // MORE ADDING PER SPECIAL CASES
    // =============================
    //
    // --- Only for 'layout' type ---
    // Add by name. Ex. context.layouts.foo <-- file
    if (file.type === 'layout') {
      context[t][file.name] = file
      // set layouts.default if the file.name === 'default'
      if (file.name === 'default') context[t].default = file
    }

    // --- Only for 'partial' type ---
    // Add by name. Ex. context.partial.bar <-- file
    if (file.type === 'partial') context[t][file.name] = file

    // --- Only for 'page' type ---
    // This does not affect context directly. Just will add feature to the file
    // It is used for a special feature that auto includes all loose pages into
    // arrays to be rendered as lists using handlebars #each blocks
    // this is the feature first step:
    // Add globalKeys to a directory of all globalKeys that are not ARRAY
    if (file.type === 'page') {
//      console.log('file.href = ', file.href)
      // array of page.globalKeys that are not arrays
//      console.log('file.globalKeys = ', file.globalKeys)
//      arr = file.globalKeys.filter(gKey => !Array.isArray(file.data[gKey]))
//      console.log('arr = ', arr)
      // hold all files that have those type of keys indexed by the key itself
      var obj
//      arr.forEach(gKey => {
      file.globalKeys.forEach(gKey => {
//        console.log('*-*-*-**-* gKey = ', gKey)
//        if (!(gKey in notArrayGlobalKeys)) {

        // separate by whether the file globalkey is array or not
        if (Array.isArray(file.data[gKey])) {
          if (!(gKey in context.globals.ArrayKeysAndOwners)) {
  //          notArrayGlobalKeys[gKey] = []
            context.globals.ArrayKeysAndOwners[gKey] = []
//            console.log('*-*-*-**-* gKey es array y NO existia fue agregada')
          }
  //        notArrayGlobalKeys[gKey].push(file)
            context.globals.ArrayKeysAndOwners[gKey].push(file)
//          console.log('*-*-*-**-*   context.globals.ArrayKeysAndOwners[gKey].length = ',   context.globals.ArrayKeysAndOwners[gKey].length)
        } else {
          if (!(gKey in context.globals.NotArrayKeysAndOwners)) {
  //          notArrayGlobalKeys[gKey] = []
            context.globals.NotArrayKeysAndOwners[gKey] = []
//            console.log('*-*-*-**-* gKey no es array y NO existia fue agregada')
          }
  //        notArrayGlobalKeys[gKey].push(file)
            context.globals.NotArrayKeysAndOwners[gKey].push(file)
//          console.log('*-*-*-**-*   context.globals.NotArrayKeysAndOwners[gKey].length = ',   context.globals.NotArrayKeysAndOwners[gKey].length)
        }

      })
//      console.log('^')
    }

  })
  // Make pages in notArrayGlobalKeys[gKey] array unique for each gKey
//  notArrayGlobalKeys = mapValues(notArrayGlobalKeys, (arr) => uniq(arr))
  // ********
  // STEP TWO
  // ********
  // Once previous and new `files` are in context, perform operations that
  // affect relation bewteen `files`
  // Only `files` of type `page` are recontextualized to reflect changes
  context.pages.forEach(page => {
    // Attach image metadata to pages in the same directory
    page.images = {}
    context.images.forEach(image => {
      if (image.path.dir === page.path.dir) {
        page.images[image.path.name] = image
      }
    })

    // Attach JSON and YAML data to pages in the same directory
//    page.data = {}
    context.datafiles.forEach(datafile => {
      if (datafile.path.dir === page.path.dir) {
        page.data[datafile.path.name] = datafile.data
      }
    })

    // Add (all) partial.data to page in two places
    // one under partialname and other deeper under partialname.data
    // ex. page.partialFoo.frontmatterBar and
    //       page.partialFoo.data.frontmatterBar
    context.partials.forEach(partial => {
      var data = partial.data
      if (!isEmpty(data)) { // If no data, just skip to next partial
        page[partial.name] = {}
        page.data[partial.name] = {}
        // Attach data twice at two different levels
        Object.assign(page[partial.name], data)
        Object.assign(page.data[partial.name], data) // for JSON rendering
      }
    })

  })

  // ********
  // FINAL STEP
  // ********
  //
  // Continuing for spacial feature "add loose pages into arrays"
  // this is feature last step:
  // Add "not-arried" globalKeys to pages that have "arried" globalKeys
  //
//  console.log('2 -----------------------------------------------')
/*
  var arrayKeysInBoth = oFilter(context.globals.ArrayKeysAndOwners,
    (arr, aKey) => {
      console.log('2 ---- arr = ', arr)
      console.log('2 ---- aKey = ', aKey)
      return (aKey in context.globals.NotArrayKeysAndOwners)
    })
*/
  oForEach(context.globals.ArrayKeysAndOwners, (pagesWithArrayedKeys, aKey) => {
//    console.log('2 ---- aKey = ', aKey)
    if (aKey in context.globals.NotArrayKeysAndOwners) {
//      console.log('2 ---- ---- pagesWithArrayedKeys.length = ', pagesWithArrayedKeys.length)
      pagesWithArrayedKeys.forEach(aPage => {
//        console.log('2 ---- ---- ---- aPage.path.relative = ', aPage.path.relative)
        oForEach(context.globals.NotArrayKeysAndOwners[aKey], (naPage) => {
//          console.log('2 ---- ---- ---- ---- naPage.path.relative = ', naPage.path.relative)
          if (!(naPage[aKey] in aPage[aKey])) {
//            console.log('2 ---- ---- ---- ---- ---- naPage.autoLinkedReferences.length = ', naPage.autoLinkedReferences.length)
//            console.log('2 ---- ---- ---- ---- ---- naPage[aKey] = ', naPage[aKey])
//            console.log('2 ---- ---- ---- ---- ---- before aPage[aKey].length = ', aPage[aKey].length)
            // Only add to the array if in not already in it
            if (oFilter(naPage.autoLinkedReferences, ['page', aPage]).length <= 0)  {
              aPage[aKey].push(naPage[aKey])
//              console.log('2 ---- ---- ---- ---- ---- ---- added, now new aPage[aKey].length = ', aPage[aKey].length)
              naPage.autoLinkedReferences.push({page: aPage, gKey: aKey})
//              console.log('2 ---- ---- ---- ---- ---- ---- also added, now new naPage.autoLinkedReferences.length = ', naPage.autoLinkedReferences.length)
            }
          }
        })
      })
    }

  })
/*
  // array of page.globalKeys that are arrays
  console.log('2nd cycle - page.href = ', page.href)
//    var arr = page.globalKeys.filter(gKey => Array.isArray(page.data[gKey]))

  // Add all loose items into corresponding arrays
  console.log('2nd cycle - arr = ', arr)
  arr.forEach(gKey => {
    console.log('2nd cycle - gKey = ', gKey)
    // first find pages that have a loose item for a particular globalKey
//      if (gKey in notArrayGlobalKeys) {
//        var loosePages = notArrayGlobalKeys[gKey]
    if (gKey in context.NotArrayKeysAndOwners) {
      var loosePages = context.NotArrayKeysAndOwners[gKey]
      console.log('2nd cycle - keys(loosePages) = ', keys(loosePages))
      // Gather all loose items for this particular globalKey
      var looseItems = []
      loosePages.forEach(lp => {
        console.log('lp.href = ', lp.href)
        console.log('lp[gKey] = ', lp[gKey])
        // Save a reference for removing when loose page is decontextualized
        lp.autoLinkedReferences.push({page: page, gKey: gKey})
        looseItems.push(lp[gKey])
      })
      console.log('looseItems = ', looseItems)
      // Add them to the corresponding array depending
      page[gKey] = page[gKey].concat(looseItems)
//        if (page[gKey].length) { page[gKey].concat(looseItems) }
//          else { Object.assign(page,{[gKey]: looseItems}) }
    }
  })
*/
  // load indirect data _jus_indirect_ so it can be contextualized
  //
  function isValidIndirectToken(elm) {
    var toString = Object.prototype.toString
    return elm[indirectKey] &&
//    elm[indirectKey].href &&
//    typeOf elm[indirectKey].href === 'string' &&
    toString.call(elm[indirectKey].href) == '[object String]' &&
//    elm[indirectKey].key &&
//    typeOf elm[indirectKey].key === 'string'
    toString.call(elm[indirectKey].key) == '[object String]'
  }

  files
    .filter(f => f.type === 'page')
    .forEach(page => {
//      console.log('FINAL STEP - page.href = ', page.href)
//      console.log('FINAL STEP - page.path.relative = ', page.path.relative)
//      console.log('FINAL STEP - page.path.relative.length = ', page.path.relative.length)
      // array of possible indirect data request (they only come in arrays)
      arr = page.globalKeys.filter(gKey => Array.isArray(page.data[gKey]))
//      console.log('FINAL STEP - arr = ', arr)
      arr.forEach(gKey => {
//        console.log('FINAL STEP - - gKey = ', gKey)
        // Look for _jus_indirect_ token in each element of the array
        page[gKey].forEach( (elm, idx) => {
//          console.log('FINAL STEP - - - idx = ', idx)
          // if current element is a valid indirect token then ...
          if (isValidIndirectToken(elm)) {
            // ...grab the page where the final value is and ...
            var indirectKeyName = elm[indirectKey].href.toString()
            var indirectPage = context.pages[indirectKeyName]
//            console.log('FINAL STEP - - - - is valid indirect token')
//            console.log('FINAL STEP - - - - indirectKeyName = ', indirectKeyName)
//            console.log('FINAL STEP - - - - indirectKeyName.length = ', indirectKeyName.length)
//            console.log('FINAL STEP - - - - indirectPage = ', indirectPage)
//            console.log('FINAL STEP - - - - context.pages.length = ', context.pages.length)
            indirectPage = context.pages.filter(f => f.path.relative === indirectKeyName)[0]
            if (indirectPage) {
//              console.log('FINAL STEP - - - - - indirectPage.href = ', indirectPage.href)
              // ...grab the final value inside the indirect page
              var indirectValue = indirectPage[elm[indirectKey].key]
//              console.log('FINAL STEP - - - - - indirectValue = ', indirectValue)
              // Here is the magic
              // ...replace the current element with the final value
              if (indirectValue) page[gKey][idx] = indirectValue
            }
          }
        })
      })
    })
  // Nothing else to do, just return filled context
  return context
}
