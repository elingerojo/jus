'use strict'

const backmatter      = require('../backmatter')
const fs              = require('fs')
const path            = require('upath')
const marky           = require('marky-markdown')
const cheerio         = require('cheerio')
const frontmatter     = require('../extracter') // enhanced with YAML syntax
const handlebars      = require('handlebars')
const isEmpty         = require('lodash').isEmpty
const keys            = require('lodash').keys
const lobars          = require('lobars')
const hrefType        = require('href-type')
const titlecase       = require('inflection').titleize
const startsWith      = require('lodash').startsWith
const File            = require('../file')

const separatorPattern =   new RegExp('<hr>')
  //  new RegExp('(?:\r\n?|\n)\s*---+(?:\r\n?|\n)') // eslint-disable-line

handlebars.registerHelper(lobars)

// Hack  for isNotEqual because it is not available in lobars library
// TODO extend lobars with negation of boolean functions
handlebars.registerHelper('isNotEqual', function(arg1, arg2, options) {
    return (arg1 !== arg2) ? options.fn(this) : options.inverse(this);
});

handlebars.registerHelper("math", function(lvalue, operator, rvalue, options) {
    if (arguments.length < 4) {
        // Operator omitted, assuming "+"
        options = rvalue;
        rvalue = operator;
        operator = "+";
    }

    lvalue = parseFloat(lvalue);
    rvalue = parseFloat(rvalue);

    return {
        "+": lvalue + rvalue,
        "-": lvalue - rvalue,
        "*": lvalue * rvalue,
        "/": lvalue / rvalue,
        "%": lvalue % rvalue
    }[operator];
});

module.exports = class Page extends File {
  constructor(filepath, sourceDir, targetDir) {
    super(filepath, sourceDir, targetDir)
  }

  squeeze() {
    this.squeezed = false
    this.read()
    // Place to hold keys added by getFrontmatter()
    this.globalKeys = []
    // Place to hold pages and keys added by "add loose pages into arrays"
    // used in contextualize() and latter used to decontextualize
    this.autoLinkedReferences = []
    this.getFrontmatter()
    this.getBackmatter()
//    this.getDOMObject()
//    this.setBasedir()
//    this.setTitle()
    this.squeezed = true
  }

  setHref() {
    var tail = this.isIndex ? this.path.dir : path.join(this.path.dir, this.path.name)
    this.href = path.join(process.env.JUS_BASEDIR, tail)
  }

  getFrontmatter() {
    this.data = {}
    var data = frontmatter(this.input)
//    console.log('//////////////////////////////////////')
//    console.log('this.path.base = ', this.path.base)
//    console.log('data = ', data)
    if (!isEmpty(data)) { // If no data, just skip it
      // save keys for decontextualize()
      this.globalKeys = this.globalKeys.concat(keys(data))
      // Attach data twice at two different levels
//      Object.assign(this, data) // for handlebars convenience
//      Object.assign(this.data, data) // for JSON rendering in routing.js
      // Remove frontmatter block to hide when rendered
      this.input = this.input.replace(frontmatter.pattern, '')
    }
  }

  getBackmatter() {
    var lastComment = backmatter(this.input)
    if (lastComment) {
      // remove <!-- -->
      var commentContent = lastComment.slice(4,lastComment.length-3)
      var markdownContent = marky(commentContent, {
        sanitize: false,            // allow script tags and stuff
        linkify: true,              // turn orphan URLs into hyperlinks
        highlightSyntax: true,      // run highlights on fenced code blocks
        prefixHeadingIds: false,    // prevent DOM id collisions
      })
      var output = markdownContent.html()
      // special named key blabla
      var data = {'_jus_blabla_': output.split(separatorPattern)}
      // save keys for decontextualize()
      this.globalKeys = this.globalKeys.concat(keys(data))
      // Attach data twice at two different levels
//      Object.assign(this, data) // for handlebars convenience
//      Object.assign(this.data, data) // for JSON rendering in routing.js
      // Remove frontmatter block to hide when rendered
      this.input = this.input.replace(lastComment, '')
    }
  }
/*
  getDOMObject() {
    if (this.isMarkdown) {
      this.$ = marky(this.input, {
        sanitize: false,            // allow script tags and stuff
        linkify: true,              // turn orphan URLs into hyperlinks
        highlightSyntax: true,      // run highlights on fenced code blocks
        prefixHeadingIds: false,    // prevent DOM id collisions
      })
    } else {
     this.$ = cheerio.load(this.input)
    }
  }

  setBasedir() {
    var $ = this.$

    // Set root path on `src` attributes in the DOM
    $('[src]').each(function() {
      var src = $(this).attr('src')
      if (hrefType(src) != 'relative') return
      if (startsWith(src, '/'+process.env.JUS_BASEDIR)) return
      // $(this).attr('src', path.join(process.env.JUS_BASEDIR, src).replace(/^\//, ''))
    })

    // Set root path on `href` attributes in the DOM
    $('[href]').each(function() {
      var href = $(this).attr('href')
      if (hrefType(href) != 'relative') return
      if (startsWith(href, '/'+process.env.JUS_BASEDIR)) return
      // $(this).attr('href', path.join(process.env.JUS_BASEDIR, href).replace(/^\//, ''))
    })
  }

  // Precedence: HTML frontmatter, <title> tag, filename
  setTitle() {
    this.title = this.title
      || this.$('title').text()
      || titlecase(this.path.name)
  }
*/
  render(context, done) {
//    var $ = this.$
    var ctx = Object.assign({page: this}, context)
    var layouts = context.layouts
    var layout
    var partials = context.partials
    var output = this.input

    if (this.layout) {
      // Use layout specified in frontmatter
      layout = layouts[this.layout]
    } else if (layouts.default && this.layout !== false) {
      // Use default layout if it exists, (unless set to `false` in frontmatter)
      layout = layouts.default
    }

    // Convert DOM to HTML so it can be handlebarred
//    output = $.html()

    // Wrap layout around page
    if (layout) output = layout.wrap(output)

    // decode quotes and partial (greater than) symbol in handlebars statements
    var mustaches = output.match(/{([^{}]*)}/g)

    if (mustaches) {
      mustaches.forEach(block => {
        output = output.replace(block,
          block.replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          .replace(/&gt;/g, ">"))
      })
    }

    // Register all partial in handlebars before calling handlebars.compile
    try {
      partials.forEach(partial => {
        handlebars.registerPartial(partial.name, partial.input)
      })
    } catch (e) {
      return done('<br>...handlebars.registerPartial() in file: '
        + this.keyName +'<br>' + e, null)
    }

    // Render page with Handlebars
    try {
      output = handlebars.compile(output)(ctx)
    } catch (e) {
      return done('<br>...handlebars.compile() in file: '
        + this.keyName +'<br>' + e +'<br>' + output, null)
    }

    // Back to DOM again
//    $ = cheerio.load(output)
    if (this.isMarkdown) {
      this.$ = marky(output, {
        sanitize: false,            // allow script tags and stuff
        linkify: true,              // turn orphan URLs into hyperlinks
        highlightSyntax: true,      // run highlights on fenced code blocks
        prefixHeadingIds: false,    // prevent DOM id collisions
      })
    } else {
     this.$ = cheerio.load(output)
    }

    // Set root path on `src` attributes in the DOM
    var $ = this.$
    $('[src]').each(function() {
      var src = $(this).attr('src')
      if (hrefType(src) != 'rooted') return
      if (startsWith(src, process.env.JUS_BASEDIR)) return
       $(this).attr('src', '/'+path.join(process.env.JUS_BASEDIR, src).replace(/^\//, ''))
    })

    // Set root path on `href` attributes in the DOM
    $('[href]').each(function() {
      var href = $(this).attr('href')
      if (hrefType(href) != 'rooted') return
      if (startsWith(href, process.env.JUS_BASEDIR)) return
       $(this).attr('href', '/'+path.join(process.env.JUS_BASEDIR, href).replace(/^\//, ''))
    })

    // Precedence: HTML frontmatter, <title> tag, filename
    this.title = this.title
      || this.$('title').text()
      || titlecase(this.path.name)

    // Add title tag to head, if missing
    if (!$('title').length && $('head').length) {
      $('head').prepend(`<title>${this.title}</title>`)
    }
    return done(null, $.html())
  }

  get isMarkdown() {
    var ext = this.path.ext.toLowerCase()
    return ext === '.md' || ext === '.markdown' || ext === '.mdown'
  }

  get isIndex() {
    return this.path.name === 'index'
  }
}
