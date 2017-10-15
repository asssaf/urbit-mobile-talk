import React from 'react';
import { StyleSheet, Text, View, Linking, TouchableOpacity } from 'react-native';
import Autolink from 'react-native-autolink';
import { truncate } from './formatting'

export default class Message extends React.Component {
  render() {
    return this.renderItemMessage(this.props.message)
  }

  renderItemMessage(message) {
    var rendered = []
    message.subMessages.forEach(m => rendered.push(this.renderItemSubMessage(m)))

    return (
      <View key={message.thought.serial}>
        {rendered}
      </View>
    )
  }

  renderItemSubMessage(message) {
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
          <Text style={message.style}>{text}</Text>
        </TouchableOpacity>
      )

    } else {
      linkOrText = (
        <Autolink style={message.style} text={text} />
      )
    }

    return (
      <View key={message['key']}>
        {linkOrText}
        {attachment &&
          <View style={styles.attachment}>
            <Text>{attachment}</Text>
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
});
