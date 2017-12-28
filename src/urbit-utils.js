
/**
 * format a number the urbit way (1.024)
 */
export function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * format a date the urbit way (~2017.12.27..18.48.00..0000)
 */
export function formatDate(dat) {
  var mils = Math.floor((0x10000 * dat.getUTCMilliseconds()) / 1000).toString(16)
  function pad(num, str){
    return ((new Array(num + 1)).join('0') + str).substr(-num,num)
  }
  return  '~' + dat.getUTCFullYear() +
          '.' + (dat.getUTCMonth() + 1) +
          '.' + dat.getUTCDate() +
         '..' + pad(2, dat.getUTCHours()) +
          '.' + pad(2, dat.getUTCMinutes()) +
          '.' + pad(2, dat.getUTCSeconds()) +
         '..' + pad(4, mils)
}

export function formatStation(stationShip, stationChannel, short) {
  return "~" + this.formatShip(stationShip, short) + "/" + stationChannel
}

export function formatShip(ship, short) {
  if (short) {
    if (ship.length == 56) {
      ship = ship.substring(0, 6) + "_" + ship.substring(50)
    }
  }
  return ship
}

export function getPorch(ship) {
  return "inbox"
}

export function getPorchStation(ship) {
  return "~" + ship + "/" + this.getPorch(ship)
}
