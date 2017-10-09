import React from 'react';
import { StyleSheet, Text, View, FlatList, TextInput, KeyboardAvoidingView,
    TouchableOpacity, Image, AsyncStorage, Alert, Linking } from 'react-native';
import Autolink from 'react-native-autolink';
import { Notifications } from 'expo';
import Header from './Header';
import Login from './Login';
import Loading from './Loading';
import JoinStation from './JoinStation';
import Urbit from "./Urbit";


function _isUrl(s) {
  var pattern = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/
  var re = new RegExp(pattern)
  return s.match(re)
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
    stationShip: "",
    stationChannel: "",
    stationServer: "",
    messages: [],
    lastUpdate: null,
    firstItem: -1,
    refreshing: false,
  };

  urbit = new Urbit()
  pokeSession = null
  subscribedSession = null
  listRef = null

  async componentDidMount() {
    this.loadState([ 'user', 'server', 'stationShip', 'stationChannel', 'stationServer' ])
      .then(v => this.checkLogin())
      .catch(e => this.checkLogin())
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

  handleLogin(session, user, server) {
    this.setState({ user: user, server: server, loggedIn: true })
    this.pokeSession = session

    // store the user for next time
    this.saveState('user', user)
    this.saveState('server', server)
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
    var res = await this.urbit.deleteSession(this.pokeSession)
    if (!res) {
      console.log("Failed to logout")
    }

    this.setState({ loggedIn: false, loggedOut: true })
  }

  handleJoin(session, stationShip, stationChannel, server) {
    this.subscribedSession = session
    this.setState({
      stationShip: stationShip,
      stationChannel: stationChannel,
      stationServer: server,
      inChannel: true
    })

    this.saveState('stationShip', stationShip)
    this.saveState('stationChannel', stationChannel)
    this.saveState('stationServer', server)
  }

  confirmLeave() {
    Alert.alert('Leave Channel', 'Are you sure you want to leave the channel?', [
      { text: 'Ok', onPress: () => this.doLeave() },
      { text: 'Cancel' },
    ])
  }

  async doLeave() {
    res = await this.urbit.unsubscribe(this.subscribedSession, this.state.stationShip, '/',
        'talk', '/afx/' + this.state.stationChannel)

    if (!res) {
      console.log("Failed to unsubscribe")
    }

    this.setState({
      inChannel: false,
      messages: [],
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
      var newMessages = []

      data.grams.tele.forEach(t => {
        var speech = t.thought.statement.speech
        var messages = this.processSpeech(
            t.thought.serial,
            t.thought.statement.date,
            t.ship,
            speech)

        for (var i = 0; i < messages.length; ++i) {
          this.addMessage(newMessages, messages[i])
        }
      })

      if (!isRefresh && this.state.firstItem != -1) {
        newMessages.forEach(m => {
          if (m.sender != this.state.user) {
            var title = "~" + this.urbit.formatShip(m.sender, true)
            // merge sub messages for the item
            var body = ""
            m.messages.forEach(sub => body += sub["text"])
            var iconUrl = this.getAvatarUrl(m)
            this.presentNotification(title, body, iconUrl)
          }
        })
      }

      if (this.state.firstItem == -1 || data.grams.num < this.state.firstItem) {
        this.setState({ firstItem: data.grams.num })
      }

      var updatedMessages
      if (isRefresh) {
        updatedMessages = newMessages.concat(this.state.messages.slice())

        var path = wire.substring('/refresh'.length)
        this.urbit.unsubscribe(this.subscribedSession, this.state.stationShip, wire, 'talk', path)

      } else {
        updatedMessages = this.state.messages.slice()
        newMessages.forEach(m => this.addMessage(updatedMessages, m))
      }

      this.setState({ messages: updatedMessages })
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

  addMessage(messages, newMessage) {
    if (messages.length > 0 && messages[messages.length - 1].sender == newMessage.sender
        && ((newMessage.ts - messages[messages.length - 1].ts)) < 3600000) {
      item = messages[messages.length - 1]
      item.messages.push(newMessage.messages[0])

    } else {
      messages.push(newMessage)
    }
  }

  processSpeech(serial, date, sender, speech) {
    var type = Object.keys(speech)[0]

    var items = []

    var item = {
      key: serial,
      sender: sender,
      ts: date,
      messages: [],
    }

    var message = {
      key: serial,
      ts: date,
      style: styles.message,
      type: type,
    }

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
      for (i = 0; i < subItems.length; ++i) {
        items = items.concat(this.processSpeech(serial + "/" + i, date, sender, subItems[i]))
      }

      item = null

    } else if (type == 'fat') {
      items = this.processSpeech(serial + 1, date, sender, speech.fat.taf)
      item = null
      message = items[0].messages[0]

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

    if (item) {
      item.messages.push(message)
      items.push(item)
    }

    return items
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
    var aud = this.formatStation()
    var audi = {}
    audi[aud] = {
      envelope: {
        visible: true,
        sender: null
      },
      delivery: "pending"
    }

    var message = {
        serial: this.urbit.uuid32(),
        audience: audi,
        statement: {
          bouquet: [],
          speech: speech,
          date: Date.now()
        }
    }

    this.urbit.poke(this.pokeSession, 'talk', 'talk-command', '/', {
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

    var lastUpdatedAt = this.state.lastUpdate.toLocaleTimeString()

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
    var path = '/afx/' + this.state.stationChannel
        + '/' + this.urbit.formatNumber(start)
        + '/' + this.urbit.formatNumber(end)

    var res = await this.urbit.subscribe(this.subscribedSession, this.state.stationShip,
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

    if (!this.state.inChannel) {
      return (
        <JoinStation
          stationShip={this.state.stationShip}
          stationChannel={this.state.stationChannel}
          server={this.state.stationServer}
          onJoin={this.handleJoin.bind(this)}
          onMessages={this.handleMessages.bind(this)}
          onPoll={this.handlePoll.bind(this)}
          onBackPress={this.confirmLogout.bind(this)}
        />
      )
    }

    return (
      <View style={styles.container}>
        <Header title={this.formatStation(true)} onLeftButtonPress={this.confirmLeave.bind(this)}/>

        <FlatList
          ref={(list) => this.listRef = list}
          data={this.state.messages}
          renderItem={this.renderItem.bind(this)}
          ListFooterComponent={this.listFooter.bind(this)}
          refreshing={this.state.refreshing}
          onRefresh={this.refresh.bind(this)}
        />

        <KeyboardAvoidingView behavior="padding">
          <View style={styles.footer}>
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
        </KeyboardAvoidingView>
      </View>
    );
  }

  getAvatarUrl(item) {
    return 'https://robohash.org/~.~' + item.sender
  }

  renderItem({item}) {
    var avatarUrl = this.getAvatarUrl(item)

    var sender = this.urbit.formatShip(item.sender, true)
    var time
    if (new Date().toLocaleDateString() == new Date(item.ts).toLocaleDateString()) {
      time = new Date(item.ts).toLocaleTimeString()

    } else {
      time = new Date(item.ts).toLocaleString();
    }

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
          </View>
          <View>
            {messages}
          </View>
        </View>
      </View>
    );
  }

  renderItemMessage(message) {
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
    color: 'gray'
  },
  footer: {
    flexDirection: 'row',
    backgroundColor: '#eee',
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
