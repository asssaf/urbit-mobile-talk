import React from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity } from 'react-native';

export default class Loading extends React.Component {
  render() {
    return (
      <View style={styles.center}>
        <Text>{this.props.statusMessage}</Text>
        <TouchableOpacity onPress={this.props.onCancel}>
          <Text style={styles.send}>Cancel</Text>
        </TouchableOpacity>
        <Text style={{position: 'absolute', bottom: 0}}>{Expo.Constants.manifest.version}</Text>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  },
  send: {
    alignSelf: 'center',
    color: 'lightseagreen',
    fontSize: 16,
    fontWeight: 'bold',
    padding: 20,
  },
});
