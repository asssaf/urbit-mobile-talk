import React from 'react';
import { StyleSheet, Text, View, FlatList, TextInput, KeyboardAvoidingView,
    TouchableOpacity, Image } from 'react-native';
import {send, subscribe} from 'react-native-training-chat-server';
import Header from './Header';
import Urbit from "./Urbit";

const NAME = 'Your Name252345';
const AVATAR = 'https://pbs.twimg.com/profile_images/806501058679816192/ZHFWIF-z_400x400.jpg';

const USER = ''
const SERVER = 'https://' + USER + '.urbit.org'
const CODE = ''

const CHANNEL_SHIP = USER
const CHANNEL = 'sandbox'

export default class App extends React.Component {
  state = {
    typing: "",
    messages: [],
  };

  urbit = new Urbit(SERVER, USER);

  componentDidMount() {
    this.urbit.authenticate(CODE)
      .then(v => {
        this.urbit.subscribe(CHANNEL_SHIP, 'talk', '/afx/' + CHANNEL, data => {
          var newMessages = this.state.messages.slice()

          if (data.grams) {
            data.grams.tele.forEach(t => {
              var ship = t.ship
              var speech = t.thought.statement.speech
              var ts = t.thought.statement.date
              if (speech.lin) {
                var item = {
                  key: t.thought.serial,
                  avatar: AVATAR,
                  sender: ship,
                  message: speech.lin.txt
                }
                newMessages.push(item)
              } else {
                console.log("Unhandled speech: " + speech)
              }
            })

            this.setState({
              messages: newMessages
            })
          }
        })
      })
  }

  async sendMessage() {
    var speech = {
      lin: {
        txt: this.state.typing,
        say: true
      }
    };

    var aud = "~" + CHANNEL_SHIP + "/" + CHANNEL
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

  render() {
    return (
      <View style={styles.container}>
        <Header title={CHANNEL} />

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
    return (
      <View style={styles.row}>
        <Image style={styles.avatar} source={{uri: item.avatar}} />
        <View style={styles.rowText}>
          <Text style={styles.sender}>~{item.sender}</Text>
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
});
