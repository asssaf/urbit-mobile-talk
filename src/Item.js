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

  renderItem(messages) {
    var firstMessage = messages[0]
    var avatarUrl = getAvatarUrl(firstMessage)
    var sender = this.urbit.formatShip(firstMessage.ship, this.props.expanded !== true)
    var audience = formatAudience(Object.keys(firstMessage.thought.audience), this.props.expanded !== true)
    var time = formatTime(new Date(firstMessage.thought.statement.date), this.props.expanded !== true)

    var renderedMessages = []
    for (var i = 0; i < messages.length; ++i) {
      renderedMessages.push(this.renderItemMessage(messages[i]))
    }

    var headerStyle = styles.itemHeaderDetails
    if (this.props.expanded === true) {
      headerStyle = styles.itemHeaderDetailsExpanded
    }

    return (
      <View style={styles.item}>
        <View style={styles.itemHeader}>
          <Image style={styles.avatar} source={{uri: avatarUrl}} />
          <View style={styles.rowText}>
            <View style={headerStyle}>
              <TouchableOpacity
                disabled={!this.props.onSenderPress}
                onPress={() => this.props.onSenderPress([ this.urbit.getPorchStation(firstMessage.ship) ])}
              >
                <Text style={styles.sender}>~{sender}</Text>
              </TouchableOpacity>
              <Text style={styles.timestamp}>{time}</Text>
              <TouchableOpacity
                disabled={!this.props.onAudiencePress}
                onPress={() => this.props.onAudiencePress(Object.keys(firstMessage.thought.audience))}
              >
                <Text style={styles.audience}>{audience}</Text>
              </TouchableOpacity>
              {this.props.expanded === true &&
                <Text style={styles.audience}>{firstMessage.thought.serial}</Text>
              }
            </View>
            {this.props.expanded !== true &&
              <View>
                {renderedMessages}
              </View>
            }
          </View>
        </View>
        {this.props.expanded === true &&
          <View>
            {renderedMessages}
          </View>
        }
      </View>
    );
  }

  renderItemMessage(message) {
    return (
      <TouchableOpacity
          key={message.thought.serial}
          disabled={this.props.expanded === true}
          onPress={() => this.props.onMessagePress(message)}>
        <Message message={message} expanded={this.props.expanded} />
      </TouchableOpacity>
    )
  }
}

const styles = StyleSheet.create({
  item: {
    padding: 20,
  },
  itemHeader: {
    flexDirection: 'row',
  },
  itemHeaderDetails: {
    flexDirection: 'row'
  },
  itemHeaderDetailsExpanded: {
    flexDirection: 'column'
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
