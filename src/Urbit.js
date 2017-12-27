import RCTNetworking from 'RCTNetworking'

export default class Urbit {
  async clearCookies() {
    return new Promise((resolve, reject) => {
      RCTNetworking.clearCookies((cleared) => resolve(cleared))
    })
  }

  async getSession(server, user) {
    try {
      let response = await fetch(server + "/~/auth.json", {
        credentials: 'same-origin'
      })
      if (!response.ok) {
        console.log("getSession: Request failed: " + response.status)
        return null
      }

      let responseJson = await response.json();

      var session = {
        server: server,
        ship: responseJson.ship,
        user: user,
        authenticated: responseJson.auth.includes(user),
        oryx: responseJson.oryx,
        ixor: responseJson.ixor,
        event: 1,
        polling: false,
        subscriptions: {},
        lastUpdate: new Date(),
        beatListeners: [],
      }

      return session;

    } catch(error) {
      console.error("getSession: " + error + ' - ' + server)
      return null
    }
  }

  async isAuthenticated(session) {
    if (!session.authenticated) {
      return false
    }

    var dummySession = await getSession(session.server, session.user)
    return dummySession.authenticated
  }

  async deleteSession(session) {
    if (!session.authenticated) {
      console.log("Not authenticated")
      return true
    }

    try {
      let response = await fetch(session.server + "/~/auth.json?DELETE", {
          credentials: 'same-origin',
          method: 'POST',
          body: JSON.stringify({
            oryx: session.oryx,
          })
      })
      if (!response.ok) {
        console.log("deleteSession: Request failed: " + response.status)
        return false
      }

      let responseJson = await response.json();
      if (!responseJson.ok) {
        console.log("Failed to deauthenticate")
        return false
      }

      console.log("Deauthenticated successfully")
      return true

    } catch(error) {
      console.error("deleteSession: " + error);
      return false
    }
  }

  async authenticate(session, code) {
    if (session.authenticated) {
      console.log("Already authenticated")
      return true
    }
    try {
      let response = await fetch(session.server + "/~/auth.json?PUT", {
          credentials: 'same-origin',
          method: 'POST',
          body: JSON.stringify({
            ship: session.user,
            code: code,
            oryx: session.oryx,
          })
      })
      if (!response.ok) {
        console.log("authenticate: Request failed: " + response.status)
        return false
      }

      let responseJson = await response.json();
      var authenticated = responseJson.auth.includes(session.user)
      if (!authenticated) {
        console.log("Failed to authenticate")
        return false
      }

      session.authenticated = true
      session.oryx = responseJson.oryx
      session.ixor = responseJson.ixor
      session.lastUpdate = new Date()

      console.log("Authenticated successfully")
      return true

    } catch (error) {
      console.error("authenticate: " + error)
      return false
    }
  }

  async poke(session, app, mark, wire, data) {
    try {
      var url = session.server + "/~~/~/to/" + app + "/" + mark
      let response = await fetch(url, {
        credentials: 'same-origin',
        method: 'POST',
        body: JSON.stringify({
          oryx: session.oryx,
          wire: wire,
          xyro: data
        })
      })

      if (!response.ok) {
        console.log("poke: Request failed: " + response.status)
        console.log(await response.text())
        return false
      }

      return true

    } catch (error) {
      console.error("poke: " + error)
      return false
    }
  }

  async subscribe(session, ship, wire, app, path, callback) {
    try {
      if (session.subscriptions[wire]) {
        console.log("Already subscribed to wire: " + wire)
        return false
      }

      var url = session.server + "/~/is/~" + ship + "/" + app + path + ".json?PUT"

      let response = await fetch(url, {
        credentials: "same-origin",
        headers: {
          "Content-type": "application/json"
        },
        method: 'POST',
        body: JSON.stringify({
          oryx: session.oryx,
          wire: wire,
          path: path,
          appl: app,
          mark: 'json',
          ship: ship
        })
      })

      if (!response.ok) {
        console.log("subscribe: Request failed: " + response.status)
        console.log(await response.text())
        return false
      }

      var responseJson = await response.json()
      console.log("Subscribed successfully: " + wire)
      session.subscriptions[wire] = {
        path,
        callback
      }
      if (Object.keys(session.subscriptions).length === 1 && !session.polling) {
        this.poll(session);
      }
      return true

    } catch (error) {
      console.error("subscribe: " + error)
      return false
    }
  }

  async unsubscribe(session, ship, wire, app) {
    try {
      var sub = session.subscriptions[wire]
      if (!sub) {
        console.log("Not subscribed to wire: " + wire)
        return true
      }
      var url = session.server + "/~/is/~" + ship + "/" + app + sub.path + ".json?DELETE"
      let response = await fetch(url, {
        credentials: "same-origin",
        headers: {
          "Content-type": "application/json"
        },
        method: 'POST',
        body: JSON.stringify({
          oryx: session.oryx,
          wire: wire,
          appl: app,
          mark: 'json',
          ship: ship
        })
      })

      if (!response.ok) {
        console.log("unsubscribe: Request failed: " + response.status)
        console.log(await response.text())
        return false
      }

      delete session.subscriptions[wire]
      console.log("Unsubscribed successfully: " + wire)

      return true

    } catch (error) {
      console.log("unsubscribe: " + error)
      return false
    }
  }

  async poll(session) {
    if (session.polling) {
      console.log("Already polling")
      return
    }
    session.polling = true
    while (true) {
      try {
        var url = session.server + "/~/of/" + session.ixor + "?poll=" + session.event
        var response = await fetch(url)

        if (Object.keys(session.subscriptions).length === 0) {
          // stop polling
          session.polling = false
          return true
        }

        if (!response.ok) {
          console.log("poll: Request failed: " + response.status)
          console.log(await response.text())
          continue
        }

        session.lastUpdate = new Date()
        session.beatListeners.forEach(listener => listener())

        var responseJson = await response.json()
        if (!responseJson.beat) {
          // got a change
          var wire = responseJson.from.path
          var sub = session.subscriptions[wire]

          if (sub) {
            var callback = sub.callback
            if (responseJson.type == 'rush') {
              callback(wire, responseJson.data.json)

            } else if (responseJson.type == 'quit') {
              callback(wire, null)
            }

          } else {
            console.log("No callback for wire: " + wire)
          }

          session.event++
        }

      } catch (error) {
        console.log("poll: " + error)
        continue
      }
    }
  }

  /**
   * format a number the urbit way (1.024)
   */
  formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  /**
   * format a date the urbit way (~2017.12.27..18.48.00..0000)
   */
  formatDate(dat) {
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

  formatStation(stationShip, stationChannel, short) {
    return "~" + this.formatShip(stationShip, short) + "/" + stationChannel
  }

  formatShip(ship, short) {
    if (short) {
      if (ship.length == 56) {
        ship = ship.substring(0, 6) + "_" + ship.substring(50)
      }
    }
    return ship
  }

  getPorch(ship) {
    return "inbox"
  }

  getPorchStation(ship) {
    return "~" + ship + "/" + this.getPorch(ship)
  }
}
