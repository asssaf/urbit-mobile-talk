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
        event: -1,
        subscriptions: 0,
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

  async subscribe(session, ship, wire, app, path, callback, pollback) {
    try {
      var url = session.server + "/~/is/~" + ship + "/" + app + path + "/.json?PUT"
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
        console.log("subscribe: Request failed: " + response.status)
        console.log(await response.text())
        return false
      }

      var responseJson = await response.json()
      console.log("Subscribed successfully: " + wire)
      session.subscriptions++
      if (session.event == -1) {
        session.event = 1;
        this.poll(session, callback, pollback);
      }
      return true

    } catch (error) {
      console.error("subscribe: " + error)
      return false
    }
  }

  async unsubscribe(session, ship, wire, app, path) {
    try {
      var url = session.server + "/~/is/~" + ship + "/" + app + path + "/.json?DELETE"
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

      session.subscriptions--
      if (session.subscriptions == 0) {
        // cancel polling
        session.event = -1
      }
      console.log("Unsubscribed successfully: " + wire)

      return true

    } catch (error) {
      console.log("unsubscribe: " + error)
      return false
    }
  }

  async poll(session, callback, pollback) {
    while (true) {
      try {
        var url = session.server + "/~/of/" + session.ixor + "?poll=" + session.event
        var response = await fetch(url)

        if (session.event == -1) {
          // polling cancelled
          return true
        }

        if (!response.ok) {
          console.log("poll: Request failed: " + response.status)
          console.log(await response.text())
          continue
        }

        if (pollback) {
          pollback()
        }

        var responseJson = await response.json()
        if (!responseJson.beat) {
          // got a change
          if (responseJson.type == 'rush') {
            callback(responseJson.from.path, responseJson.data.json)

          } else if (responseJson.type == 'quit') {
            callback(responseJson.from.path, null)
          }
          session.event++
        }

      } catch (error) {
        console.log("poll: " + error)
        continue
      }
    }
  }

  uuid32() {
    var _str, i, j, str;
    str = "0v";
    str += Math.ceil(Math.random() * 8) + ".";
    for (i = j = 0; j <= 5; i = ++j) {
      _str = Math.ceil(Math.random() * 10000000).toString(32);
      _str = ("00000" + _str).substr(-5, 5);
      str += _str + ".";
    }
    return str.slice(0, -1);
  }

  /**
   * format a number the urbit way (with dots)
   */
  formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
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
}
