import React from 'react';
import {View, StyleSheet} from 'react-native';
import Item from './Item';

export default class ViewMessage extends React.Component {
  static navigationOptions = {
    title: 'Message'
  }
  render() {
    return (
      <View style={styles.container}>
        <Item messages={[this.props.navigation.state.params.message]} />
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
