import React from 'react';
import { StyleSheet, Text, View, FlatList, TextInput, KeyboardAvoidingView,
    TouchableOpacity, Image, AsyncStorage, Alert, Linking, AppState } from 'react-native';
import Autolink from 'react-native-autolink';
import { Notifications } from 'expo';
import urbit from '@asssaf/urbit';
import Item from './Item'
import Message from './Message';
import ToolBar from './ToolBar';
import Loading from './Loading';
import { formatDate, formatNumber, formatShip, getPorch } from './urbit-utils';
import { loadState, saveState } from './persistence';
import { formatTime, formatAudience, getAvatarUrl } from './formatting';

function _isUrl(s) {
  var pattern = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/
  var re = new RegExp(pattern)
  return s.match(re)
}

export default class Chat extends React.Component {
  static navigationOptions = ({ navigation }) => ({
    title: `${navigation.state.params.title}`,
    headerRight: <ToolBar onLogout={navigation.state.params.onLogout} onMenu={() => navigation.navigate('DrawerOpen')} />,
  })

  state = {
    user: this.props.screenProps.session.user,
    session: this.props.screenProps.session,
    typing: '',
    audience: null,
    items: [],
    inChannel: false,
    refreshing: false,
    firstItem: -1,
    lastItem: -1,
    lastUpdate: null,
    appState: AppState.currentState,
    submitted: false,
  }

  componentDidMount() {
    AppState.addEventListener('change', this._handleAppStateChange)
    this.props.screenProps.refs["Chat"] = this
    loadState.bind(this)({ audience: null })
    this.doJoin()
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

  _handleSessionBeat = () => {
    this.setState({ lastUpdate: new Date() })
  }

  async doJoin() {
    var wire = "/messages"
    var path = "/circle/" + getPorch(this.state.user) + "/grams/"
    if (this.state.lastItem > -1) {
      path += formatNumber(this.state.lastItem + 1)

    } else {
      // start from 6 hours ago
      var startDate = new Date(new Date().getTime() - 1000*60*60*6)
      path += formatDate(new Date(startDate))
    }

    var res = await urbit.webapi.subscribe(this.state.session, this.state.user, wire, "hall", path, (wire, data) => this.handleMessages(wire, data))

    if (res) {
      this.setState({ inChannel: true })
      this.state.session.beatListeners[0] = this._handleSessionBeat

    } else {
      console.log("Failed to load from " + getPorch(this.state.user))
    }
  }

  async doLeave() {
    res = await urbit.webapi.unsubscribe(this.state.session, this.state.user, '/messages', 'hall')

    if (!res) {
      console.log("Failed to unsubscribe")
    }
  }

  async doRejoin() {
    await this.doLeave()
    await this.doJoin()
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

    } else if (data.circle && (data.circle.nes || data.circle.gram)) {
      var grams
      if (data.circle.nes) {
        grams = data.circle.nes

      } else {
        grams = [data.circle.gram]
      }

      if (grams.length > 0) {
        var newItems = []

        // if the first new message is a duplicate of the last old message, skip it
        if (this.state.items.length > 0) {
          var lastItem = this.state.items[this.state.items.length - 1]
          var lastMessage = lastItem.messages[lastItem.messages.length - 1]
          if (grams[0].gam.uid === lastMessage.gam.uid) {
            if (grams.length == 1) {
              return
            }
            grams = grams.slice(1)
          }
        }

        grams.forEach(t => {
          t.subMessages = this.processSpeech(t, t.gam.sep)
          this.addMessage(newItems, t)
        })


        if (!isRefresh && this.state.firstItem != -1 && this.state.appState !== 'active') {
          newItems.filter(item => (item.gam.aut !== this.state.user)).forEach(item => {
            item.messages.forEach(m => {
              var messages = this.processSpeech(m, m.gam.sep)
              var title = "~" + formatShip(m.gam.aut, true)
              // merge sub messages for the item
              var body = ""
              messages.forEach(sub => body += sub["text"])
              var iconUrl = getAvatarUrl(m)
              this.presentNotification(title, body, iconUrl)
            })
          })
        }

        if (this.state.audience === null) {
          var lastItem = newItems[newItems.length - 1]
          var audience = lastItem.messages[0].gam.aud
          this.setState({ audience: audience })
        }

        var updatedItems
        if (isRefresh) {
          updatedItems = newItems.concat(this.state.items.slice())
          urbit.webapi.unsubscribe(this.state.session, this.state.user, wire, 'hall')

        } else {
          // concatenate with possible merge of middle item
          updatedItems = this.concatItems(this.state.items.slice(), newItems)
          this.setState({ lastItem: grams[grams.length - 1].num })
        }

        this.setState({ items: updatedItems })
      }

      var firstItem = 0
      if (grams.length > 0) {
        firstItem = grams[0].num
      }
      if ((this.state.firstItem == -1 || firstItem < this.state.firstItem)) {
        this.setState({ firstItem: firstItem })
      }

      if (isRefresh) {
        this.setState({ refreshing: false })
      }
    }
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
        key: newMessage.gam.uid,
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
    if (lastMessage.gam.aut !== newMessage.gam.aut) {
      return false
    }

    if (!this.sameAudience(lastMessage.gam.aud, newMessage.gam.aud)) {
      return false
    }

    if (newMessage.gam.wen - lastMessage.gam.wen > 3600000) {
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
      key: serial || m.gam.uid,
      date: m.gam.wen,
      sender: m.gam.aut,
      audience: m.gam.aud,
      style: styles.message,
      type: type,
    }

    var messages = [message]

    if (type == 'lin') {
      message["text"] = speech[type].msg

      if (speech.lin.pat) {
        message["style"] = styles.messageAct
      }

    } else if (type == 'url') {
      message["text"] = speech.url
      message["style"] = styles.messageUrl

    } else if (type == 'exp') {
      message["text"] = speech.exp.exp
      message["attachment"] = speech.exp.res.map(r => r.join('\n')).join('\n')
      message["style"] = styles.messageCode


    } else if (type == 'app') {
      messages = this.processSpeech(m, speech.app.sep, serial + 1)
      message = messages[0]
      message["text"] = "[" + speech.app.app + "]: " + message["text"]

    } else if (type == 'fat') {
      messages = this.processSpeech(m, speech.fat.sep, serial + 1)
      message["text"] = messages[0]["text"]
      messages[0] = message

      if (speech.fat.tac.text) {
        message["attachment"] = speech.fat.tac.text

      } else if (speech.fat.tac.tank) {
        message["attachment"] = speech.fat.tac.tank.join('\n')

      } else if (speech.fat.tac.name) {
        //TODO add name label
        message["attachment"] = speech.fat.tac.name.tac.text
      }

    } else if (type == 'ire') {
      //TODO link to origin message speech.ire.top
      messages = this.processSpeech(m, speech.ire.sep, serial)
      message = messages[0]

    } else {
      console.log("Unhandled speech: %" + type, speech)
      message["text"] = 'Unhandled speech: %' + type
    }

    if (!message["text"]) {
      message["text"] = ' '
    }

    return messages
  }

  async sendMessage() {
    this.setState({ submitted: true })
    var text = this.state.typing
    var speeches = []
    if (_isUrl(text)) {
      speeches.push(this.buildSpeech("url", text))

    } else if (text.charAt(0) == '#') {
      speeches.push(this.buildSpeech("eval", text.substring(1)))

    } else {
      var pat = false
      if (text.charAt(0) == '@') {
        text = text.substring(1)
        pat = true
      }

      this.breakTextToLines(text).forEach(line => {
        if (line.trim().length > 0) {
          speeches.push(this.buildSpeech('lin', line, pat))
        }
      })
    }

    if (this.listRef) {
      this.listRef.scrollToEnd()
    }

    this.setState({ typing: '' })
    for (var i = 0; i < speeches.length; ++ i) {
      var res = await this.sendMessageSpeech(speeches[i])

      if (!res) {
        Alert.alert('Send Error', 'An error occured while sending the message')
        this.setState({ submitted: false })
        return
      }
    }

    this.setState({
      submitted: false,
    });

    saveState('audience', this.state.audience)
  }

  async sendMessageSpeech(speech) {
    return urbit.webapi.poke(this.state.session, 'hall', 'hall-action', '/', {
      phrase: {
        aud: this.state.audience,
        ses: [ speech ],
      }
    })
  }

  buildSpeech(type, text, arg) {
    var speech
    if (type == "lin") {
      speech = {
        msg: text,
        pat: arg
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

  async refresh() {
    if (this.state.firstItem == 0 || this.state.refreshing) {
      return
    }

    this.setState({ refreshing: true })

    var maxFetchItems = 32
    var end = this.state.firstItem - 1
    var start = Math.max(0, end - maxFetchItems)
    var path = '/circle/' + getPorch(this.state.user) + '/grams'
        + '/' + formatNumber(start)
        + '/' + formatNumber(end)

    var res = await urbit.webapi.subscribe(this.state.session, this.state.user,
        '/refresh' + path, 'hall', path, this.handleMessages.bind(this))

    if (!res) {
      console.log("refresh failed")
      this.setState({ refreshing: false })
    }
  }

  handleMessagePress(message) {
    this.props.navigation.navigate('ViewMessage', { message: message })
  }

  confirmAudience(audience) {
    Alert.alert('Set Audience', 'Set the audience to: "' + formatAudience(audience) + '" ?', [
      { text: 'Ok', onPress: () => this.setState({ audience }) },
      { text: 'Cancel' },
    ])
  }

  isSendDisabled() {
    if (this.state.audience == null
        || this.state.audience.length == 0
        || this.state.audience[0].length == 0) {
      return true
    }

    if (this.state.typing.length == 0) {
      return true
    }

    return false
  }

  listFooter() {
    if (this.state.lastUpdate == null) {
      return null
    }

    var lastUpdatedAt = formatTime(this.state.lastUpdate, true)

    return (
      <View style={styles.listFooter}>
        <Text style={styles.lastUpdated}>Last updated at {lastUpdatedAt}</Text>
      </View>
    );
  }

  emptyList() {
    return (
      <View style={styles.listFooter}>
        <Text>No messages to show</Text>
      </View>
    )
  }

  render() {
    if (this.state.firstItem == -1) {
      return (
        <Loading
          statusMessage='Loading messages...'
        />
      )
    }

    return (
      <View style={styles.container}>
        <FlatList
          ref={(list) => this.listRef = list}
          data={this.state.items}
          renderItem={this.renderItem.bind(this)}
          ListFooterComponent={this.listFooter.bind(this)}
          ListEmptyComponent={this.emptyList.bind(this)}
          refreshing={this.state.refreshing}
          onRefresh={this.refresh.bind(this)}
        />

        <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={80}>
          <View style={styles.footer}>
            <View style={styles.footerAudience}>
              <TextInput
                value={formatAudience(this.state.audience)}
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

              <TouchableOpacity disabled={this.isSendDisabled()} onPress={this.sendMessage.bind(this)}>
                <Text style={this.isSendDisabled() ? styles.sendDisabled : styles.send}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    )
  }

  renderItem({item}) {
    return (
      <View style={styles.row} key={item.messages[0].gam.uid}>
        <Item messages={item.messages} onMessagePress={this.handleMessagePress.bind(this)}
          onSenderPress={this.confirmAudience.bind(this)}
          onAudiencePress={this.confirmAudience.bind(this)}
        />
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
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
  sendDisabled: {
    alignSelf: 'center',
    color: 'grey',
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
