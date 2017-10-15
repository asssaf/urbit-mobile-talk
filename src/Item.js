import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import Message from './Message';
import Urbit from './Urbit';
import { formatTime, formatAudience, getAvatarUrl, truncate } from './formatting'


export default class Item extends React.Component {
  urbit = new Urbit()

  render() {
    return this.renderItem(this.props.messages)
  }

  handleMessagePress(m) {

  }

  renderItem(messages) {
    var firstMessage = messages[0]
    var avatarUrl = getAvatarUrl(firstMessage)
    var sender = this.urbit.formatShip(firstMessage.ship, true)
    var audience = formatAudience(Object.keys(firstMessage.thought.audience), true)
    var time = formatTime(new Date(firstMessage.thought.statement.date))

    var renderedMessages = []
    for (var i = 0; i < messages.length; ++i) {
      renderedMessages.push(this.renderItemMessage(messages[i]))
    }

    return (
      <View style={styles.item}>
        <Image style={styles.avatar} source={{uri: avatarUrl}} />
        <View style={styles.rowText}>
          <View style={styles.itemHeader}>
            <Text style={styles.sender}>~{sender}</Text>
            <Text style={styles.timestamp}>{time}</Text>
            <Text style={styles.audience}>{audience}</Text>
          </View>
          <View>
            {renderedMessages}
          </View>
        </View>
      </View>
    );
  }

  renderItemMessage(message) {
    return (
      <TouchableOpacity key={message.thought.serial} onPress={() => this.props.onMessagePress(message)}>
        <Message message={message} />
      </TouchableOpacity>
    )
  }
}

const styles = StyleSheet.create({
  item: {
    padding: 20,
    flexDirection: 'row'
  },
  itemHeader: {
    flexDirection: 'row'
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
