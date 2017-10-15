import React from 'react';
import { StyleSheet, Text, View, Linking } from 'react-native';
import Autolink from 'react-native-autolink';

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
    if (message.type == 'url') {
      linkOrText = (
        <TouchableOpacity onPress={() => Linking.openURL(message.text)}>
          <Text style={styles.messageUrl}>{message.text}</Text>
        </TouchableOpacity>
      )

    } else {
      linkOrText = (
        <Autolink style={message.style} text={message.text} />
      )
    }

    return (
      <View key={message['key']}>
        {linkOrText}
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
  attachment: {
    borderColor: 'black',
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    marginTop: 10,
    marginBottom: 10,
  },
});
