import React from 'react';
import { StyleSheet, Text, View, FlatList, TextInput, KeyboardAvoidingView,
    TouchableOpacity, Image, AsyncStorage } from 'react-native';
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
          var ship = t.ship
          var speech = t.thought.statement.speech
          var ts = t.thought.statement.date
          if (speech.lin) {
            var item = {
              key: t.thought.serial,
              sender: ship,
              message: speech.lin.txt
            }
            newMessages.push(item)

          } else {
            var type = Object.keys(speech)[0]
            console.log("Unhandled speech: " + type)
            var item = {
              key: t.thought.serial,
              sender: ship,
              message: 'Unhandled speech: %' + type
            }
            newMessages.push(item)
          }
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
      this.setState({ inChannel: true })
      this.saveState('stationShip', this.state.stationShip)
      this.saveState('stationChannel', this.state.stationChannel)
    }
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
          <Header title="Join a Station" />

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
        <Header title={this.formatStation()} />

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
          <Text style={styles.message}>{item.message}</Text>
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
