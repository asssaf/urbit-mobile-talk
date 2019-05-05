import React from 'react';
import { StyleSheet, Text, View, FlatList, TextInput, KeyboardAvoidingView,
    TouchableOpacity, Image, AsyncStorage, Alert, Linking, AppState, Platform } from 'react-native';
import Autolink from 'react-native-autolink';
import { Notifications } from 'expo';
import { client as hall } from '@asssaf/urbit-hall-client';
import Item from './Item'
import Message from './Message';
import ToolBar from './ToolBar';
import Loading from './Loading';
import { loadState, saveState } from './persistence';
import { formatTime, formatShip, formatAudience, getAvatarUrl } from './formatting';

export default class Chat extends React.Component {
  static navigationOptions = ({ navigation }) => ({
    title: `${navigation.state.params.title}`,
    headerRight: <ToolBar onLogout={navigation.state.params.onLogout} onMenu={navigation.openDrawer} />,
  })

  state = {
    user: this.props.screenProps.session.user,
    session: this.props.screenProps.session,
    typing: '',
    audience: null,
    items: [],
    inChannel: false,
    loading: true,
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
    var from
    if (this.state.lastItem > -1) {
      from = hall.formatNumber(this.state.lastItem + 1)

    } else {
      // start with latest 64 messages
      from = "-64"
    }

    var res = await hall.subscribe(this.state.session, wire, (wire, data) => this.handleMessages(wire, data), from)

    if (res) {
      this.setState({ inChannel: true })
      this.state.session.beatListeners[0] = this._handleSessionBeat

    } else {
      console.log("Failed to load messages")
    }
  }

  async doLeave() {
    res = await hall.unsubscribe(this.state.session, '/messages')

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

  handleMessages(wire, messages) {
    var isRefresh = wire.startsWith('/refresh')

    if (messages == null) {
      // got %quit
      console.log("got %quit for: " + wire)
      if (isRefresh) {
        this.setState({ refreshing: false })

      } else {
        //TODO resubscribe
      }

    } else {
      if (messages.length > 0) {
        var newItems = []

        // if the first new message is a duplicate of the last old message, skip it
        if (this.state.items.length > 0) {
          var lastItem = this.state.items[this.state.items.length - 1]
          var lastMessage = lastItem.messages[lastItem.messages.length - 1]
          if (messages[0].key === lastMessage.key) {
            if (messages.length == 1) {
              return
            }
            messages = messages.slice(1)
          }
        }

        messages.forEach(m => {
          this.addMessage(newItems, m)
        })

        if (!isRefresh && this.state.firstItem != -1 && this.state.appState !== 'active') {
          newItems.filter(item => (item.sender !== this.state.user)).forEach(item => {
            item.messages.forEach(m => {
              var title = "~" + formatShip(m.sender, true)
              // merge sub messages for the item
              var iconUrl = getAvatarUrl(m)
              this.presentNotification(title, message.text, iconUrl)
            })
          })
        }

        if (this.state.audience === null) {
          var lastItem = newItems[newItems.length - 1]
          var audience = lastItem.messages[0].audience
          this.setState({ audience: audience })
        }

        var updatedItems
        if (isRefresh) {
          updatedItems = newItems.concat(this.state.items.slice())
          hall.unsubscribe(this.state.session, wire)

        } else {
          // concatenate with possible merge of middle item
          updatedItems = this.concatItems(this.state.items.slice(), newItems)
          this.setState({ lastItem: messages[messages.length - 1].num })
        }

        this.setState({ items: updatedItems })

        var firstItem = messages[0].num
        if ((this.state.firstItem == -1 || firstItem < this.state.firstItem)) {
          this.setState({ firstItem: firstItem })
        }
      }

      if (isRefresh) {
        this.setState({ refreshing: false })

      } else {
        this.setState({ loading: false })
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
        key: newMessage.key,
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
    if (lastMessage.sender !== newMessage.sender) {
      return false
    }

    if (!this.sameAudience(lastMessage.audience, newMessage.audience)) {
      return false
    }

    if (newMessage.date - lastMessage.date > 3600000) {
      return false
    }

    return true
  }

  sameAudience(audience1, audience2) {
    return audience1.length == audience2.length && audience1.every((a, i) => a == audience2[i])
  }

  async sendMessage() {
    this.setState({ submitted: true })
    var text = this.state.typing

    if (this.listRef) {
      this.listRef.scrollToEnd()
    }

    this.setState({ typing: '' })
    var res = await hall.sendMessage(this.state.session, text, this.state.audience)

    if (!res) {
      Alert.alert('Send Error', 'An error occured while sending the message')
      this.setState({ submitted: false })
      return
    }

    this.setState({
      submitted: false,
    });

    saveState('audience', this.state.audience)
  }

  async refresh() {
    if (this.state.firstItem <= 0 || this.state.refreshing || this.state.loading) {
      return
    }

    this.setState({ refreshing: true })

    var maxFetchItems = 32
    var end = this.state.firstItem - 1
    var start = Math.max(0, end - maxFetchItems)

    var res = await hall.subscribe(this.state.session,
        '/refresh/' + start + '/' + end, this.handleMessages.bind(this),
        hall.formatNumber(start), hall.formatNumber(end))

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
    if (this.state.loading) {
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

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
      <View style={styles.row} key={item.messages[0].key}>
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
