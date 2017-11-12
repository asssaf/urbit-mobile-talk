import React from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity } from 'react-native';
import Urbit from './Urbit';

export default class ChatMenu extends React.Component {
  state = {
    items: [
      {
        key: 'Log out',
        onPress: this.props.screenProps.onLogout,
      },
      {
        key: 'View log',
        onPress: () => this.props.navigation.navigate('ViewLog')
      },
      {
        key: 'Resubscribe',
        onPress: () => this.doResubscribe()
      },
      {
        key: 'Reload app',
        onPress: this.doReload,
      },
    ]
  }

  urbit = new Urbit()

  doResubscribe() {
    this.props.screenProps.refs["Chat"].doRejoin()
    this.props.navigation.navigate('DrawerClose')
  }

  doReload() {
    Expo.Util.reload()
  }

  render() {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>~{this.urbit.formatShip(this.props.screenProps.session.user, true)}</Text>
        </View>

        <FlatList
          data={this.state.items}
          renderItem={this.renderItem.bind(this)}
        />

      </View>
    )
  }

  renderItem({item}) {
    return (
      <View style={styles.row}>
        <TouchableOpacity onPress={() => item.onPress()}>
          <Text>{item.key}</Text>
          </TouchableOpacity>
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
    padding: 20,
  },
  header: {
    padding: 20,
    backgroundColor: '#d0d0d0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
})
