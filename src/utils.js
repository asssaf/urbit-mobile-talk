// override console log function
(function(){
  console.items = []
  var orig = {
    log: console.log,
    error: console.error,
  }

  Object.keys(orig).forEach(k => {
    console[k] = function() {
      orig[k].apply(console, arguments)

      console.items.push({
        type: k,
        timestamp: new Date(),
        arguments: arguments,
      })
    }
  })
})();
