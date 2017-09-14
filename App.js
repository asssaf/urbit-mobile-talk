import React from 'react';
import { StyleSheet, Text, View, FlatList, TextInput, KeyboardAvoidingView,
    TouchableOpacity, Image, AsyncStorage } from 'react-native';
import Autolink from 'react-native-autolink';
import Header from './Header';
import Urbit from "./Urbit";

export default class App extends React.Component {
  state = {
    loggedIn: false,
    inChannel: false,
    loading: true,
    formError: "",
    formStatusStyle: styles.formLabel,
    typing: "",
    user: "",
    code: "",
    stationShip: "",
    stationChannel: "",
    messages: [],
  };

  urbit = null
  urbitAnon = null

  componentDidMount() {
    this.loadState('user').then(v => {
      this.setState({ user: v })
      this.checkLogin();
    })
    this.loadState('stationShip').then(v => this.setState({ stationShip: v }))
    this.loadState('stationChannel').then(v => this.setState({ stationChannel: v }))
  }

  loadState(key) {
    return AsyncStorage.getItem('@urbit-mobile-talk:' + key)
  }

  async saveState(key, value) {
    try {
      await AsyncStorage.setItem('@urbit-mobile-talk:' + key, value);
    } catch (error) {
      console.log(error)
    }
  }

  async checkLogin() {
    if (!this.urbit) {
      var server = 'https://' + this.state.user + '.urbit.org'
      this.urbit = new Urbit(server, this.state.user)
      var result = await this.urbit.isAuthenticated()
      if (result) {
        this.setState({ loggedIn: true })
      }
    }
  }

  async doLogin() {
    this.setState({ formError: "Connecting...", formStatusStyle: styles.formLabel })
    var server = 'https://' + this.state.user + '.urbit.org'
    this.urbit = new Urbit(server, this.state.user)
    var result = await this.urbit.authenticate(this.state.code)
    if (result) {
      // store the user for next time
      this.saveState('user', this.state.user)

      this.setState({ loggedIn: true, formError: "" })

    } else {
      this.setState({ formError: "Failed to login", formStatusStyle: styles.formLabel })
    }
  }

  async doLogout() {
    var res = await this.urbit.deleteSession()
    if (!res) {
      console.log("Failed to logout")
    }

    this.setState({ loggedIn: false })
  }

  async doJoin() {
    this.setState({ formError: "Joining...", formStatusStyle: styles.formLabel })
    var server = 'https://' + this.state.stationShip + '.urbit.org'
    this.urbitAnon = new Urbit(server, null)

    // create a session
    await this.urbitAnon.isAuthenticated()

    res = await this.urbitAnon.subscribe(this.state.stationShip, 'talk', '/afx/' + this.state.stationChannel, data => {
      var newMessages = this.state.messages.slice()

      if (data.grams) {
        this.setState({ loading: false })
        data.grams.tele.forEach(t => {
          var speech = t.thought.statement.speech
          this.processSpeech(newMessages, t.thought.serial, t.ship, speech)
        })

        this.setState({
          messages: newMessages
        })
      }
    })

    if (!res) {
      this.setState({
        formError: "Failed to join " + this.formatStation(),
        formStatusStyle: styles.formError
      })

    } else {
      this.setState({ inChannel: true, formError: "" })
      this.saveState('stationShip', this.state.stationShip)
      this.saveState('stationChannel', this.state.stationChannel)
    }
  }

  processSpeech(messages, serial, sender, speech) {
    var item = {
      key: serial,
      sender: sender,
      style: styles.message
    }
    var type = Object.keys(speech)[0]
    if (type == 'lin' || type == 'url' || type == 'exp') {
      item["message"] = speech[type].txt
      if (!item["message"]) {
        item["message"] = ' '
      }

      if (type == 'lin' && !speech.lin.say) {
        item["style"] = styles.messageAct

      } else if (type == 'exp') {
        item["style"] = styles.messageCode
      }

    } else if (type == 'app') {
      item["message"] = speech[type].src + ": " + speech[type].txt

    } else if (type == 'mor') {
      var subItems = speech.mor
      var i
      for (i = 0; i < subItems.length; ++i) {
        this.processSpeech(messages, serial + i, sender, subItems[i])
      }

    } else if (type == 'fat') {
      var subMessages = []
      this.processSpeech(subMessages, serial, sender, speech.fat.taf)
      item = subMessages[0]
      if (speech.fat.tor.text) {
        item.attachment = speech.fat.tor.text

      } else if (speech.fat.tor.tank) {
        item.attachment = speech.fat.tor.tank.join('\n')

      } else if (speech.fat.tor.name) {
        //TODO add name label
        item.attachment = speech.fat.tor.name.mon
      }

    } else {
      console.log("Unhandled speech: %" + type)
      item["message"] = 'Unhandled speech: %' + type
    }

    if (!item["message"]) {
      item["message"] = ' '
    }

    messages.push(item)
  }

  async doLeave() {
    res = await this.urbitAnon.unsubscribe(this.state.stationShip, 'talk', '/afx/' + this.state.stationChannel)
    if (!res) {
      console.log("Failed to unsubscribe")
    }

    this.setState({ inChannel: false })
  }

  async sendMessage() {
    var text = this.state.typing
    while (text.length > 64) {
      var first = text.substring(0, 64)
      text = text.substring(64)
      await this.sendMessageText(first)
    }

    await this.sendMessageText(text)
  }

  async sendMessageText(text) {
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

  formatStation() {
    return "~" + this.state.stationShip + "/" + this.state.stationChannel
  }

  render() {
    if (!this.state.loggedIn) {
      return (
        <View style={styles.container}>
          <Header title="Login to your Urbit" />

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>User</Text>
            <TextInput
              value={this.state.user}
              onChangeText={text => this.setState({user: text.trim()})}
              style={styles.input}
              underlineColorAndroid="transparent"
              placeholder="zod"
            />
          </View>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Code</Text>
            <TextInput
              secureTextEntry={true}
              value={this.state.code}
              onChangeText={text => this.setState({code: text.trim()})}
              style={styles.input}
              underlineColorAndroid="transparent"
              placeholder="code"
            />
          </View>

          <View style={styles.formRow}>
            <Text style={this.state.formStatusStyle}>{this.state.formError}</Text>
          </View>

          <TouchableOpacity onPress={this.doLogin.bind(this)}>
            <Text style={styles.send}>Login</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!this.state.inChannel) {
      return (
        <View style={styles.container}>
          <TouchableOpacity onPress={this.doLogout.bind(this)}>
            <Header title="Join a Station" />
          </TouchableOpacity>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Ship</Text>
            <TextInput
              value={this.state.stationShip}
              onChangeText={text => this.setState({stationShip: text.trim()})}
              style={styles.input}
              underlineColorAndroid="transparent"
              placeholder="marzod"
            />
          </View>

          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Channel</Text>
            <TextInput
              value={this.state.stationChannel}
              onChangeText={text => this.setState({stationChannel: text.trim()})}
              style={styles.input}
              underlineColorAndroid="transparent"
              placeholder="urbit-meta"
            />
          </View>

          <View style={styles.formRow}>
            <Text style={this.state.formStatusStyle}>{this.state.formError}</Text>
          </View>

          <TouchableOpacity onPress={this.doJoin.bind(this)}>
            <Text style={styles.send}>Join</Text>
          </TouchableOpacity>

        </View>
      )
    }

    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={this.doLeave.bind(this)}>
          <Header title={this.formatStation()} />
        </TouchableOpacity>

        <FlatList inverted data={this.state.messages} renderItem={this.renderItem} />

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

    var sender = item.sender
    if (sender.length == 56) {
      sender = sender.substring(0, 6) + "_" + sender.substring(50)
    }

    return (
      <View style={styles.row}>
        <Image style={styles.avatar} source={{uri: avatarUrl}} />
        <View style={styles.rowText}>
          <Text style={styles.sender}>~{sender}</Text>
          <Autolink style={item.style} text={item.message} />
          {item.attachment &&
            <View style={styles.attachment}>
              <Text>{item.attachment}</Text>
            </View>
          }
        </View>
      </View>
    );
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
  formRow: {
    flexDirection: 'row',
  },
  formLabel: {
    alignSelf: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    padding: 20,
  },
  formError: {
    alignSelf: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    padding: 20,
    color: 'red'
  },
});
