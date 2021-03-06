import React from 'react';
import {View, ScrollView, StyleSheet} from 'react-native';
import Item from './Item';

export default class ViewMessage extends React.Component {
  static navigationOptions = {
    title: 'Message'
  }
  render() {
    return (
      <View style={styles.container}>
        <ScrollView>
          <Item expanded={true} messages={[this.props.navigation.state.params.message]} />
        </ScrollView>
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
