import React from 'react';
import { StyleSheet, Text, View, FlatList, TextInput, KeyboardAvoidingView,
    TouchableOpacity, Image, AsyncStorage, Alert, Linking, AppState } from 'react-native';
import Autolink from 'react-native-autolink';
import { Notifications } from 'expo';
import Header from './Header';
import Login from './Login';
import Loading from './Loading';
import Urbit from "./Urbit";


function _isUrl(s) {
  var pattern = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/
  var re = new RegExp(pattern)
  return s.match(re)
}

function _formatTime(date) {
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

export default class App extends React.Component {
  state = {
    loggedIn: false,
    loggedOut: false,
    inChannel: false,
    loading: true,
    loadingStatus: "Loading...",
    typing: "",
    user: "",
    server: "",
    items: [],
    lastUpdate: null,
    firstItem: -1,
    refreshing: false,
    audience: null,
    appState: AppState.currentState,
  };

  urbit = new Urbit()
  session = null
  listRef = null

  async componentDidMount() {
    this.loadState([ 'user', 'server' ])
      .then(v => this.checkLogin())
      .catch(e => this.checkLogin())

    AppState.addEventListener('change', this._handleAppStateChange)
  }

  componentWillUnmount() {
    AppState.removeEventListener('change', this._handleAppStateChange)
    if (this.state.inChannel === true) {
      this.doLeave()
    }
  }

  _handleAppStateChange = (nextAppState) => {
    if (this.state.appState !== 'active' && nextAppState === 'active') {
      // application foregrounded - clear notifications
      Expo.Notifications.dismissAllNotificationsAsync()
    }
    this.setState({ appState: nextAppState })
  }

  async checkLogin() {
    if (this.state.user == "") {
      this.setState({ loading: false })
      return
    }

    this.setState({ loadingStatus: "Logging in..." })
    var server
    if (this.state.server.length > 0) {
      server = this.state.server

    } else {
      server = 'https://' + this.state.user + '.urbit.org'
    }
    var session = await this.urbit.getSession(server, this.state.user)
    this.setState({ loading: false })
    if (session && session.authenticated) {
      this.handleLogin(session, this.state.user, this.state.server)
    }
  }

  loadState(keys) {
    promises = []
    keys.forEach(key => {
      promises.push(AsyncStorage.getItem('@urbit-mobile-talk:' + key)
        .then(v => this.setState({ [key]: v || '' })))
    })
    return Promise.all(promises)
  }

  async saveState(key, value) {
    try {
      await AsyncStorage.setItem('@urbit-mobile-talk:' + key, value);
    } catch (error) {
      console.log(error)
    }
  }

  async handleLogin(session, user, server) {
    this.setState({ user: user, server: server, loggedIn: true })
    this.session = session

    // store the user for next time
    this.saveState('user', user)
    this.saveState('server', server)

    var wire = "/messages"
    var path = "/f/" + this.urbit.getPorch(user)
    var res = await this.urbit.subscribe(session, user, wire, "talk", path, (wire, data) => this.handleMessages(wire, data))

    if (res) {
      this.setState({ inChannel: true })

    } else {
      console.log("Failed to load from " + porch)
    }
  }

  handleLoadingCancel() {
    //TODO cancel request in progress
    this.setState({ loading: false })
  }

  confirmLogout() {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Ok', onPress: () => this.doLogout() },
      { text: 'Cancel' },
    ])
  }

  async doLogout() {
    await this.doLeave()

    var res = await this.urbit.deleteSession(this.session)
    if (!res) {
      console.log("Failed to logout")
    }

    this.setState({ loggedIn: false, loggedOut: true })
  }

  async doLeave() {
    res = await this.urbit.unsubscribe(this.session, this.state.user, '/messages',
        'talk', '/f/' + this.urbit.getPorch(this.state.user))

    if (!res) {
      console.log("Failed to unsubscribe")
    }

    this.setState({
      inChannel: false,
      items: [],
      refreshing: false,
      firstItem: -1
    })
  }

  presentNotification(title, body, iconUrl) {
    var localNotification = {
      title: title,
      body: body,
      icon: iconUrl,
    }

    Notifications.presentLocalNotificationAsync(localNotification);
  }

  handleMessages(wire, data) {
    var isRefresh = wire.startsWith('/refresh')

    if (data == null) {
      // got %quit
      console.log("got %quit for: " + wire)
      if (isRefresh) {
        this.setState({ refreshing: false })

      } else {
        //TODO resubscribe
      }

    } else if (data.grams) {
      var newItems = []
      data.grams.tele.forEach(t => {
        t.subMessages = this.processSpeech(t, t.thought.statement.speech)
        this.addMessage(newItems, t)
      })


      if (!isRefresh && this.state.firstItem != -1 && this.state.appState !== 'active') {
        newItems.filter(item => { item.ship !== this.state.user }).forEach(item => {
          item.messages.forEach(m => {
            var messages = this.processSpeech(m, m.thought.statement.speech)
            var title = "~" + this.urbit.formatShip(m.ship, true)
            // merge sub messages for the item
            var body = ""
            messages.forEach(sub => body += sub["text"])
            var iconUrl = this.getAvatarUrl(m)
            this.presentNotification(title, body, iconUrl)
          })
        })
      }

      if (this.state.firstItem == -1 || data.grams.num < this.state.firstItem) {
        this.setState({ firstItem: data.grams.num })
      }

      if (this.state.audience === null) {
        var lastItem = newItems[newItems.length - 1]
        var audience = Object.keys(lastItem.messages[0].thought.audience)
        this.setState({ audience: audience })
      }

      var updatedItems
      if (isRefresh) {
        updatedItems = newItems.concat(this.state.items.slice())

        var path = wire.substring('/refresh'.length)
        this.urbit.unsubscribe(this.session, this.state.user, wire, 'talk', path)

      } else {
        // concatenate with possible merge of middle item
        updatedItems = this.concatItems(this.state.items.slice(), newItems)
      }

      this.setState({ items: updatedItems })
      if (isRefresh) {
        this.setState({ refreshing: false })

      } else {
        this.setState({ loading: false })
      }
    }
  }

  handlePoll() {
    this.setState({ lastUpdate: new Date() })
  }

  /**
   * concatenate arrays of items, possibly merging the middle item
   */
  concatItems(items, newItems) {
    // see if first new item can be merged with last old item
    if (items.length > 0) {
      var lastItem = items[items.length - 1]
      if (this.canMerge(lastItem, newItems[0].messages[0])) {
        lastItem.messages = lastItem.messages.concat(newItems[0].messages)
        newItems = newItems.slice(1)
      }
    }

    return items.concat(newItems)
  }

  /**
   * add a new message, either as a new item or merged into the last item
   */
  addMessage(items, newMessage) {
    if (items.length == 0 || !this.canMerge(items[items.length - 1], newMessage)) {
      newItem = {
        key: newMessage.thought.serial,
        messages: [newMessage]
      }
      items.push(newItem)

    } else {
      items[items.length - 1].messages.push(newMessage)
    }
  }

  /**
   * check whether a message can be merged into the last item
   */
  canMerge(item, newMessage) {
    var lastMessage = item.messages[item.messages.length - 1]
    if (lastMessage.ship !== newMessage.ship) {
      return false
    }

    if (!this.sameAudience(Object.keys(lastMessage.thought.audience),
        Object.keys(newMessage.thought.audience))) {
      return false
    }

    if (newMessage.thought.statement.date - lastMessage.thought.statement.date > 3600000) {
      return false
    }

    return true
  }

  sameAudience(audience1, audience2) {
    return audience1.length == audience2.length && audience1.every((a, i) => a == audience2[i])
  }

  processSpeech(m, speech, serial) {
    var type = Object.keys(speech)[0]

    var message = {
      key: serial || m.thought.serial,
      date: m.thought.statement.date,
      sender: m.ship,
      audience: m.thought.audience,
      style: styles.message,
      type: type,
    }

    var messages = [message]

    if (type == 'lin' || type == 'url' || type == 'exp') {
      message["text"] = speech[type].txt

      if (type == 'lin' && !speech.lin.say) {
        message["style"] = styles.messageAct

      } else if (type == 'exp') {
        message["style"] = styles.messageCode
      }

    } else if (type == 'app') {
      message["text"] = speech[type].src + ": " + speech[type].txt

    } else if (type == 'mor') {
      var subItems = speech.mor
      var i
      messages = []
      for (i = 0; i < subItems.length; ++i) {
        messages = messages.concat(this.processSpeech(m, subItems[i], serial + "/" + i))
      }

    } else if (type == 'fat') {
      messages = this.processSpeech(m, speech.fat.taf, serial + 1)
      message = messages[0]

      if (speech.fat.tor.text) {
        message["attachment"] = speech.fat.tor.text

      } else if (speech.fat.tor.tank) {
        message["attachment"] = speech.fat.tor.tank.join('\n')

      } else if (speech.fat.tor.name) {
        //TODO add name label
        message["attachment"] = speech.fat.tor.name.mon
      }

    } else {
      console.log("Unhandled speech: %" + type)
      message["text"] = 'Unhandled speech: %' + type
    }

    if (!message["text"]) {
      message["text"] = ' '
    }

    return messages
  }

  async sendMessage() {
    var text = this.state.typing
    var speeches = []
    if (_isUrl(text)) {
      speeches.push(this.buildSpeech("url", text))

    } else if (text.charAt(0) == '#') {
      speeches.push(this.buildSpeech("eval", text.substring(1)))

    } else {
      var say = true
      if (text.charAt(0) == '@') {
        text = text.substring(1)
        say = false
      }

      this.breakTextToLines(text).forEach(line => {
        if (line.trim().length > 0) {
          speeches.push(this.buildSpeech('lin', line, say))
        }
      })
    }

    this.listRef.scrollToEnd()
    for (var i = 0; i < speeches.length; ++ i) {
      await this.sendMessageSpeech(speeches[i])
    }
  }

  async sendMessageSpeech(speech) {
    var audi = {}
    this.state.audience.forEach(aud => {
      audi[aud] = {
        envelope: {
          visible: true,
          sender: null
        },
        delivery: "pending"
      }
    })
    var message = {
        serial: this.urbit.uuid32(),
        audience: audi,
        statement: {
          bouquet: [],
          speech: speech,
          date: Date.now()
        }
    }

    this.urbit.poke(this.session, 'talk', 'talk-command', '/', {
      publish: [
        message
      ]
    })

    // set the component state (clears text input)
    this.setState({
      typing: '',
    });
  }

  buildSpeech(type, text, arg) {
    var speech
    if (type == "lin") {
      speech = {
        txt: text,
        say: arg
      }

    } else {
      speech = text
    }

    return {
      [type]: speech
    }
  }

  breakTextToLines(text) {
    var lines = []
    var max = 64

    while (text.length > max) {
      var lastBreak = text.lastIndexOf(' ', max - 1)
      var next = lastBreak + 1
      if (lastBreak < 0) {
        lastBreak = max
        next = max
      }
      first = text.substring(0, lastBreak)
      text = text.substring(next)
      if (first.trim().length > 0) {
        lines.push(first)
      }
    }

    lines.push(text)

    return lines
  }

  formatStation(short) {
    return this.urbit.formatStation(this.state.stationShip, this.state.stationChannel, short)
  }


  listFooter() {
    if (this.state.lastUpdate == null) {
      return null
    }

    var lastUpdatedAt = _formatTime(this.state.lastUpdate)

    return (
      <View style={styles.listFooter}>
        <Text style={styles.lastUpdated}>Last updated at {lastUpdatedAt}</Text>
      </View>
    );
  }

  async refresh() {
    if (this.state.firstItem == 0 || this.state.refreshing) {
      return
    }

    this.setState({ refreshing: true })

    var maxFetchItems = 32
    var end = this.state.firstItem + 1
    var start = Math.max(0, end - maxFetchItems)
    var path = '/f/' + this.urbit.getPorch(this.state.user)
        + '/' + this.urbit.formatNumber(start)
        + '/' + this.urbit.formatNumber(end)

    var res = await this.urbit.subscribe(this.session, this.state.user,
        '/refresh' + path, 'talk', path, this.handleMessages.bind(this))

    if (!res) {
      console.log("refresh failed")
      this.setState({ refreshing: false })
    }
  }

  render() {
    if (this.state.loading) {
      return (
        <Loading
          statusMessage={this.state.loadingStatus}
          onCancel={this.handleLoadingCancel.bind(this)}
        />
      );
    }

    if (!this.state.loggedIn) {
      return (
        <Login
          user={this.state.user}
          server={this.state.server}
          onLogin={this.handleLogin.bind(this)}
          loggedOut={this.loggedOut}
        />
      );
    }

    return (
      <View style={styles.container}>
        <Header
          title={'~' + this.urbit.formatShip(this.state.user, true)}
          onLeftButtonPress={this.confirmLogout.bind(this)}
        />

        <FlatList
          ref={(list) => this.listRef = list}
          data={this.state.items}
          renderItem={this.renderItem.bind(this)}
          ListFooterComponent={this.listFooter.bind(this)}
          refreshing={this.state.refreshing}
          onRefresh={this.refresh.bind(this)}
        />

        <KeyboardAvoidingView behavior="padding">
          <View style={styles.footer}>
            <View style={styles.footerAudience}>
              <TextInput
                value={this.formatAudience(this.state.audience)}
                onChangeText={text => this.setState({ audience: text.split(/,\s*/) })}
                style={styles.input}
                underlineColorAndroid="transparent"
                placeholder="Audience"
              />
            </View>
            <View style={styles.footerRow}>
              <TextInput
                value={this.state.typing}
                onChangeText={text => this.setState({typing: text})}
                style={styles.input}
                underlineColorAndroid="transparent"
                placeholder="Type something nice"
              />

              <TouchableOpacity onPress={this.sendMessage.bind(this)}>
                <Text style={styles.send}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    );
  }

  formatAudience(audience, short) {
    if (audience == null) {
      return null
    }
    var f = audience.join(", ")
    if (short && f.length > 32) {
      f = f.substring(0, 31) + ".."
    }
    return f
  }

  getAvatarUrl(message) {
    return 'https://robohash.org/~.~' + message.ship
  }

  renderItem({item}) {
    var firstMessage = item.messages[0]
    var avatarUrl = this.getAvatarUrl(firstMessage)
    var sender = this.urbit.formatShip(firstMessage.ship, true)
    var audience = this.formatAudience(Object.keys(firstMessage.thought.audience), true)
    var time = _formatTime(new Date(firstMessage.thought.statement.date))

    var messages = []
    for (var i = 0; i < item.messages.length; ++i) {
      messages.push(this.renderItemMessage(item.messages[i]))
    }

    return (
      <View style={styles.row}>
        <Image style={styles.avatar} source={{uri: avatarUrl}} />
        <View style={styles.rowText}>
          <View style={styles.itemHeader}>
            <Text style={styles.sender}>~{sender}</Text>
            <Text style={styles.timestamp}>{time}</Text>
            <Text style={styles.audience}>{audience}</Text>
          </View>
          <View>
            {messages}
          </View>
        </View>
      </View>
    );
  }

  renderItemMessage(message) {
    var rendered = []
    message.subMessages.forEach(m => rendered.push(this.renderItemSubMessage(m)))

    return (
      <View key={message.thought.serial}>
        {rendered}
      </View>
    )
  }

  renderItemSubMessage(message) {
    var linkOrText
    if (message.type == 'url') {
      linkOrText = (
        <TouchableOpacity onPress={() => Linking.openURL(message.text)}>
          <Text style={styles.messageUrl}>{message.text}</Text>
        </TouchableOpacity>
      )

    } else {
      linkOrText = (
        <Autolink style={message.style} text={message.text} />
      )
    }

    return (
      <View key={message['key']}>
        {linkOrText}
        {message.attachment &&
          <View style={styles.attachment}>
            <Text>{message.attachment}</Text>
          </View>
        }
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  row: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row'
  },
  listFooter: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lastUpdated: {
    fontSize: 14,
    color: 'lightgray',
  },
  itemHeader: {
    flexDirection: 'row'
  },
  message: {
    fontSize: 16,
  },
  messageAct: {
    fontSize: 16,
    fontStyle: 'italic'
  },
  messageCode: {
    fontSize: 16,
    fontFamily: 'monospace'
  },
  messageUrl: {
    fontSize: 16,
    color: '#0E7AFE',
  },
  attachment: {
    borderColor: 'black',
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    marginTop: 10,
    marginBottom: 10,
  },
  sender: {
    fontWeight: 'bold',
    paddingRight: 10,
  },
  timestamp: {
    paddingRight: 10,
    color: 'gray',
  },
  audience: {
    paddingRight: 10,
    color: 'gray',
  },
  footer: {
    flexDirection: 'column',
    backgroundColor: '#eee',
  },
  footerAudience: {
    height: 50,
    borderBottomWidth: 1,
    borderBottomColor: 'black',
  },
  footerRow: {
    flexDirection: 'row',
  },
  input: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    fontSize: 16,
    flex: 1,
  },
  send: {
    alignSelf: 'center',
    color: 'lightseagreen',
    fontSize: 16,
    fontWeight: 'bold',
    padding: 20,
  },
  avatar: {
    borderRadius: 20,
    width: 40,
    height: 40,
    marginRight: 10,
  },
  rowText: {
    flex: 1,
  },
});
