
export function formatTime(date, short) {
  if (!short) {
    return date.toString()
  }
  var hours = date.getHours()
  var minutes = date.getMinutes()

  var f = date.getHours() + ':'
  var f = ':'
  if (minutes < 10) {
    f += '0'
  }
  f += minutes

  if (hours > 12) {
    f = (hours-12) + f + ' PM'

  } else {
    if (hours == 0) {
      hours = 12
    }
    f = hours + f + ' AM'
  }

  return f
}

export function formatShip(ship, short) {
  if (short) {
    if (ship.length == 56) {
      ship = ship.substring(0, 6) + "_" + ship.substring(50)
    }
  }
  return ship
}

export function formatAudience(audience, short) {
  if (audience == null) {
    return null
  }
  var f = audience.join(", ")
  if (short) {
    f = truncate(f, 32)
  }
  return f
}


export function getAvatarUrl(message) {
  return 'https://robohash.org/~.~' + message.sender
}


export function truncate(s, limit) {
  if (s && s.length > limit) {
    s = s.substring(0, limit - 2) + ".."
  }
  return s
}
