const attempt = require('lodash').attempt
const dateutil = require('dateutil')
const isError = require('lodash').isError
const yaml = require('js-yaml')
const pattern =
  new RegExp('^(?:\r\n?|\n)*<!--([^]*?)-->') // eslint-disable-line
const moreThanOneLine =
  new RegExp('.*[\n].*')  // eslint-disable-line

const parse = module.exports = function parse (input) {
  if (!input.match(pattern)) return // no html comments on top of file found

  var obj

  var textToBeParsed = pattern.exec(input)[1]
  console.log('........................YAMAL................................')
  console.log('textToBeParsed = ', textToBeParsed)
  if (moreThanOneLine.test(textToBeParsed)) {
    console.log('||||||||||||||||||||||| OBJ |||||||||||||||||||||||||||||??')
    // is valid YAML
    if (!isError(attempt(yaml.safeLoad.bind(null, textToBeParsed)))) {
      obj = yaml.safeLoad(textToBeParsed)
      console.log('||||||||||||||||||||||| OBJ |||||||||||||||||||||||||||||||')
      console.log('obj =', obj)
      console.log('^^^^^^^^^^^^^^^^^^^^^^^ OBJ ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^')
    }
  }

  return obj
}

parse.pattern = pattern
