
// override console log function
(function(){
  const LOG_SIZE = 1000
  console.items = []
  var orig = {
    log: console.log,
    error: console.error,
  }

  Object.keys(orig).forEach(k => {
    console[k] = function() {
      orig[k].apply(console, arguments)

      if (console.items.length == LOG_SIZE) {
        console.items = console.items.slice(1)
      }

      console.items.push({
        type: k,
        timestamp: new Date(),
        arguments: arguments,
      })
    }
  })
})();
