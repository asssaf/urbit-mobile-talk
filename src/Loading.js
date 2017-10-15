import React from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity } from 'react-native';

export default class Loading extends React.Component {
  static navigationOptions = {
    header: null,
  }

  componentDidMount() {
    console.log(this.props)
    this.props.screenProps.setRouteKey(this.props.navigation.state.key)
  }

  render() {
    return (
      <View style={styles.center}>
        <Text>{this.props.navigation.state.params.statusMessage}</Text>
        <TouchableOpacity onPress={this.props.screenProps.onLoadingCancel}>
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
