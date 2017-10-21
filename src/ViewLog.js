import React from 'react';
import {View, ScrollView, StyleSheet, Text} from 'react-native';
import Item from './Item';
import { getLog } from './utils'

export default class ViewLog extends React.Component {
  static navigationOptions = {
    title: 'Log',
    drawerLockMode: 'locked-closed',
  }

  state = {
    log: console.items,
  }

  render() {
    var renderedItems = []
    this.state.log.forEach((log, i) => renderedItems.push(this.renderItem(i, log)))

    return (
      <View style={styles.container}>
        <ScrollView ref={sv => this.scrollView = sv} onContentSizeChange={(w, h) => this.scrollView.scrollToEnd()}>
          {renderedItems}
        </ScrollView>
      </View>
    )
  }

  renderItem(i, item) {
    var text = item.arguments[0]
    if (typeof text === 'object') {
      text = JSON.stringify(text)
    }
    return (
      <View key={i} style={styles.row}>
        <Text style={styles[item.type]}>{item.timestamp.toString()}: {text}</Text>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  row: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  log: {
    color: 'black',
  },
  error: {
    color: 'red',
  },
});
