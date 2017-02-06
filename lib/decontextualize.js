const pluralize       = require('inflection').pluralize
const remove          = require('lodash').remove


module.exports = function decontextualize(context, files) {
  var partialsToDecontex
  var datafilesToDecontex
  var imagesToDecontex
  var pagesToDecontex

//  console.log('d d d decontextualize d d d')
//  console.log('d d d decontextualize d d d')
// Backwards order than `contextualize()`
  // (to perform like an Undo contextualize)
  // ********
  // STEP ONE
  // ********
  // First remove the `files` relations from all `pages`
  //
  // prepare filters for `files` that have a relation in `pages`
  partialsToDecontex = files.filter(f => f.type === 'partial')
  datafilesToDecontex = files.filter(f => f.type === 'datafile')
  imagesToDecontex = files.filter(f => f.type === 'image')
  // ...including `pages` that have relation with other `pages`
  pagesToDecontex = files.filter(f => f.type === 'page')
  //
  // Remove relations
  context.pages.forEach(page => {

    // Remove `partials` data from `page`
    partialsToDecontex.forEach(partial => {
      delete page.data[partial.name]
      delete page[partial.name]
    })

    // Remove `datafiles` data from `page`
    datafilesToDecontex.forEach(datafile => {
      delete page.data[datafile.path.name]
    })

    // Remove `images` data from `page`
    imagesToDecontex.forEach(image => {
      delete page.images[image.path.name]
    })

    // remove any reference to the page been decontextualized
    remove(page.autoLinkedReferences, elem => pagesToDecontex.includes(elem.page))
  })
  // Undo relations created by "add loose pages into arrays" feature
  pagesToDecontex.forEach(decontex => {
//    console.log('d d d decontextualize d d d - decontex.href = ', decontex.href)
//    console.log('d d d decontextualize d d d - decontex.type = ', decontex.type)
//    console.log('d d d decontextualize d d d - decontex.autoLinkedReferences.length = ', decontex.autoLinkedReferences.length)
    // Was this page a "loose page added into array"? if so, substract it
    decontex.autoLinkedReferences.forEach(linked => {
      var gKey = linked.gKey
      // remove element added by page been decontextualized
//      console.log('d d d decontextualize d d d d d d - gKey = ', gKey)
//      console.log('d d d decontextualize d d d d d d - linked.page.href = ', linked.page.href)
//      console.log('d d d decontextualize d d d d d d - $$$$ before remove $$$$ linked.page[gKey] = ', linked.page[gKey])
//      console.log('d d d decontextualize d d d d d d - decontex[gKey] = ', decontex[gKey])
      remove(linked.page[gKey], elem => elem === decontex[gKey])
//      console.log('d d d decontextualize d d d d d d - $$$$ after remove  $$$$ linked.page[gKey] = ', linked.page[gKey])
    })
  })


  // ********
  // STEP TWO
  // ********
  // Now is safe to remove `files` from `context`
  files.forEach(file => {
    const t = pluralize(file.type)

    if (file.type === 'page') {
      // remove from globals whether they are in or not
      file.globalKeys.forEach(gKey => {
        if (gKey in context.globals.NotArrayKeysAndOwners)
          remove(context.globals.NotArrayKeysAndOwners[gKey], elem => elem === file)
        if (gKey in context.globals.ArrayKeysAndOwners)
          remove(context.globals.ArrayKeysAndOwners[gKey], elem => elem === file)
        // delete all globalkeys added
        delete file[gKey]
      })
      // delete data key itself
      delete file.data
    }
    if (file.type === 'partial') delete context[t][file.name]
    if (file.type === 'layout') delete context[t][file.name]

    delete context[t][file.keyName]

    // Oposite operation to context[t].push(file) but first save default layout
    var defaultLayout = context[t].default
    context[t] = context[t].filter(f => f.path.full !== file.path.full)
    // Restore default layout, if any
    if (defaultLayout) context[t].default = defaultLayout

    delete context.files[file.keyName]

    // Oposite operation to context.files.push(file)
    context.files = context.files.filter(f => f.path.full !== file.path.full)

  })

  // ********
  // FINAL STEP
  // ********
  // Nothing else to do, just return modified context
  return context
}
