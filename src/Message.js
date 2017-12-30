import React from 'react';
import { StyleSheet, Text, View, Linking, TouchableOpacity } from 'react-native';
import Autolink from 'react-native-autolink';
import { truncate } from './formatting'

export default class Message extends React.Component {
  render() {
    return this.renderItemMessage(this.props.message)
  }

  renderItemMessage(message) {
    var linkOrText
    var text = message.text
    var attachment = message.attachment
    if (this.props.expanded !== true) {
      text = truncate(text, 256)
      attachment = truncate(attachment, 256)
    }

    if (message.type == 'url') {
      linkOrText = (
        <TouchableOpacity onPress={() => Linking.openURL(message.text)}>
          <Text style={styles[message.style]}>{text}</Text>
        </TouchableOpacity>
      )

    } else {
      linkOrText = (
        <Autolink style={styles[message.style]} text={text} selectable={true} />
      )
    }

    return (
      <View key={message['key']}>
        {linkOrText}
        {attachment &&
          <View style={styles.attachment}>
            <Text selectable={true}>{attachment}</Text>
          </View>
        }
      </View>
    )
  }
}

const styles = StyleSheet.create({
  attachment: {
    borderColor: 'black',
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    marginTop: 10,
    marginBottom: 10,
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
});
