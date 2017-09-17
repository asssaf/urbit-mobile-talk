export default class Urbit {
  constructor (server, user) {
    this.server = server
    this.user = user
    this.oryx = null;
    this.ixor = null;
    this.event = -1
  }

  async isAuthenticated() {
    try {
      let response = await fetch(this.server + "/~/auth.json", {
        credentials: 'same-origin'
      })
      if (!response.ok) {
        console.log("isAuthenticated: Request failed: " + response.status)
        return false
      }

      let responseJson = await response.json();

      var authenticated = responseJson.auth.includes(this.user)
      this.oryx = responseJson.oryx
      this.ixor = responseJson.ixor

      return authenticated;

    } catch(error) {
      console.error("isAuthenticated: " + error)
      return false
    }
  }

  async deleteSession() {
    var authenticated = await this.isAuthenticated()
    if (!authenticated) {
      console.log("Not authenticated")
      return true
    }

    try {
      let response = await fetch(this.server + "/~/auth.json?DELETE", {
          method: 'POST',
          body: JSON.stringify({
            oryx: this.oryx,
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

  async authenticate(code) {
    var authenticated = await this.isAuthenticated()
    if (authenticated) {
      console.log("Already authenticated")
      return true
    }
    try {
      let response = await fetch(this.server + "/~/auth.json?PUT", {
          method: 'POST',
          body: JSON.stringify({
            ship: this.user,
            code: code,
            oryx: this.oryx,
          })
      })
      if (!response.ok) {
        console.log("authenticate: Request failed: " + response.status)
        return false
      }

      let responseJson = await response.json();
      var authenticated = responseJson.auth.includes(this.user)
      if (!authenticated) {
        console.log("Failed to authenticate")
        return false
      }

      this.oryx = responseJson.oryx
      this.ixor = responseJson.ixor
      console.log("Authenticated successfully")
      return true

    } catch (error) {
      console.error("authenticate: " + error)
    }
  }

  async poke(app, mark, wire, data) {
    try {
      var url = this.server + "/~~/~/to/" + app + "/" + mark
      let response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({
          oryx: this.oryx,
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

  async subscribe(ship, app, path, callback) {
    try {
      var url = this.server + "/~/is/~" + ship + "/" + app + path + "/.json?PUT"
      let response = await fetch(url, {
        credentials: "same-origin",
        headers: {
          "Content-type": "application/json"
        },
        method: 'POST',
        body: JSON.stringify({
          oryx: this.oryx,
          wire: path,
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
      this.event = 1;

      console.log("Subscribed successfully")
      this.poll(callback);
      return true

    } catch (error) {
      console.error("subscribe: " + error)
      return false
    }
  }

  async unsubscribe(ship, app, path) {
    try {
      var url = this.server + "/~/is/~" + ship + "/" + app + path + "/.json?DELETE"
      let response = await fetch(url, {
        credentials: "same-origin",
        headers: {
          "Content-type": "application/json"
        },
        method: 'POST',
        body: JSON.stringify({
          oryx: this.oryx,
          wire: path,
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

      // cancel polling
      this.event = -1
      console.log("Unsubscribed successfully")

      return true

    } catch (error) {
      console.log("unsubscribe: " + error)
      return false
    }
  }

  async poll(callback) {
    while (true) {
      try {
        var url = this.server + "/~/of/" + this.ixor + "?poll=" + this.event
        var response = await fetch(url)

        if (this.event == -1) {
          // polling cancelled
          return true
        }

        if (!response.ok) {
          console.log("poll: Request failed: " + response.status)
          console.log(await response.text())
          continue
        }

        var responseJson = await response.json()
        if (!responseJson.beat) {
          // got a change
          if (responseJson.type == 'rush') {
            callback(responseJson.data.json)
          }
          this.event++
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
