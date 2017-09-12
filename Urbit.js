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
      console.error(error);
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
      console.error(error);
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

      console.log("Authenticated successfully")
      return true

    } catch (error) {
      console.error(error)
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
      console.error(error)
      return false
    }
  }

  async subscribe(ship, app, path, callback) {
    try {
      var url = this.server + "/~/is/~" + this.user + "/" + app + path + "/.json?PUT"
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
      console.error(error)
      return false
    }
  }

  async unsubscribe(ship, app, path) {
    try {
      var url = this.server + "/~/is/~" + this.user + "/" + app + path + "/.json?DELETE"
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
      console.log(error)
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
          callback(responseJson.data.json)
          this.event++
        }

      } catch (error) {
        console.log(error)
        continue
      }
    }
  }

}
