
const commentPattern =
  new RegExp(/<!--([^]*?)-->/g) // eslint-disable-line
const anyCaractersPattern =
  new RegExp('[a-zA-Z0-9]') // eslint-disable-line

module.exports = function(input) {
  var lastComment = null

  if (!input.match(commentPattern)) return // no html comments of file
  lastComment = input.match(commentPattern).pop()
  const afterLastComment = input.split(commentPattern).pop()
   // something after last Comment means it is not backmatter
  if (anyCaractersPattern.test(afterLastComment)) return
  return lastComment
}
