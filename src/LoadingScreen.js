import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Loading from './Loading';

export default class LoadingScreen extends React.Component {
  static navigationOptions = {
    header: null,
    drawerLockMode: 'locked-closed',
  }

  componentDidMount() {
    this.props.screenProps.setRouteKey(this.props.navigation.state.key)
  }

  render() {
    return (
      <View style={styles.center}>
      <Loading
        statusMessage={this.props.navigation.state.params.statusMessage}
        onLoadingCancel={this.props.screenProps.onLoadingCancel}
      />
      <Text style={{position: 'absolute', bottom: 0}}>{Expo.Constants.manifest.version}</Text>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center'
  },
});
