import React from 'react';
import { StyleSheet, Text, View, FlatList, TextInput, KeyboardAvoidingView,
    TouchableOpacity, Image, AsyncStorage } from 'react-native';
import Autolink from 'react-native-autolink';
import Header from './Header';
import Login from './Login';
import JoinStation from './JoinStation';
import Urbit from "./Urbit";

export default class App extends React.Component {
  state = {
    loggedIn: false,
    loggedOut: false,
    inChannel: false,
    loading: true,
    typing: "",
    user: "",
    stationShip: "",
    stationChannel: "",
    messages: [],
  };

  urbit = null
  urbitAnon = null
  listRef = null

  componentDidMount() {

    this.loadState([ 'user', 'stationShip', 'stationChannel' ])
      .then(v => this.setState({ loading: false }))
      .catch(e => this.setState({ loading: false }))

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

  handleLogin(urbit, user) {
    this.urbit = urbit
    this.setState({ user: user, loggedIn: true })

    // store the user for next time
    this.saveState('user', user)
  }

  async doLogout() {
    var res = await this.urbit.deleteSession()
    if (!res) {
      console.log("Failed to logout")
    }

    this.setState({ loggedIn: false, loggedOut: true })
  }

  handleJoin(urbit, stationShip, stationChannel) {
    this.urbitAnon = urbit
    this.setState({
      stationShip: stationShip,
      stationChannel: stationChannel,
      inChannel: true
    })

    this.saveState('stationShip', stationShip)
    this.saveState('stationChannel', stationChannel)
  }

  async doLeave() {
    res = await this.urbitAnon.unsubscribe(this.state.stationShip, 'talk', '/afx/' + this.state.stationChannel)
    if (!res) {
      console.log("Failed to unsubscribe")
    }

    this.setState({ inChannel: false, messages: [] })
  }

  handleMessages(data) {
    var newMessages = this.state.messages.slice()

    if (data.grams) {
      this.setState({ loading: false })
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

      this.setState({
        messages: newMessages
      })
    }
  }

  addMessage(messages, newMessage) {
    if (messages.length > 0 && messages[messages.length - 1].sender == newMessage.sender) {
      item = messages[messages.length - 1]
      item.messages.push(newMessage.messages[0])

    } else {
      messages.push(newMessage)
    }
  }

  processSpeech(serial, date, sender, speech) {
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
      style: styles.message
    }

    var type = Object.keys(speech)[0]
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
    while (text.length > 64) {
      var first = text.substring(0, 64)
      text = text.substring(64)
      await this.sendMessageText(first)
    }

    await this.sendMessageText(text)
    this.listRef.scrollToEnd()
  }

  async sendMessageText(text) {
    if (text.trim().length == 0) {
      return
    }
    var speech = {
      lin: {
        txt: text,
        say: true
      }
    };

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

    this.urbit.poke('talk', 'talk-command', '/', {
      publish: [
        message
      ]
    })

    // set the component state (clears text input)
    this.setState({
      typing: '',
    });
  }

  formatStation(short) {
    return this.urbit.formatStation(this.state.stationShip, this.state.stationChannel, short)
  }

  render() {
    if (this.state.loading) {
      return (
        <View style={styles.container}>
          <Text>Loading...</Text>
        </View>
      );
    }

    if (!this.state.loggedIn) {
      return (
        <Login
          user={this.state.user}
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
          onJoin={this.handleJoin.bind(this)}
          onMessages={this.handleMessages.bind(this)}
          onHeaderClick={this.doLogout.bind(this)}
        />
      )
    }

    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={this.doLeave.bind(this)}>
          <Header title={this.formatStation(true)} />
        </TouchableOpacity>

        <FlatList
          ref={(list) => this.listRef = list}
          data={this.state.messages}
          renderItem={this.renderItem.bind(this)}
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

  renderItem({item}) {
    var avatarUrl = 'https://robohash.org/~.~'+item.sender

    var sender = this.urbit.formatShip(item.sender, true)
    var time = new Date(item.ts).toLocaleString();

    var messages = []
    for (var i = 0; i < item.messages.length; ++i) {
      messages.push(this.renderItemMessage(item.messages[i]))
    }

    return (
      <View style={styles.row}>
        <Image style={styles.avatar} source={{uri: avatarUrl}} />
        <View style={styles.rowText}>
          <Text style={styles.sender}>~{sender}</Text>
          <Text style={styles.timestamp}>{time}</Text>
          <View>
            {messages}
          </View>
        </View>
      </View>
    );
  }

  renderItemMessage(message) {
    return (
      <View key={message['key']}>
        <Autolink style={message.style} text={message.text} />
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
  message: {
    fontSize: 18,
  },
  messageAct: {
    fontSize: 18,
    fontStyle: 'italic'
  },
  messageCode: {
    fontSize: 18,
    fontFamily: 'monospace'
  },
  attachment: {
    borderColor: 'black',
    borderWidth: 1,
    borderRadius: 5,
    padding: 10
  },
  sender: {
    fontWeight: 'bold',
    paddingRight: 10,
  },
  timestamp: {
    paddingRight: 10,
  },
  footer: {
    flexDirection: 'row',
    backgroundColor: '#eee',
  },
  input: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    fontSize: 18,
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
