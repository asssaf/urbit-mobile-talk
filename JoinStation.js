import React from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity } from 'react-native';
import Header from './Header';
import Urbit from './Urbit';

export default class JoinStation extends React.Component {
  state = {
    formError: "",
    formStatusStyle: styles.formLabel,
    stationShip: this.props.stationShip,
    stationChannel: this.props.stationChannel,
  }

  urbitAnon = null

  async doJoin() {
    this.setState({ formError: "Joining...", formStatusStyle: styles.formLabel })
    var server = 'https://' + this.state.stationShip + '.urbit.org'
    this.urbitAnon = new Urbit(server, null)

    // create a session
    await this.urbitAnon.isAuthenticated()

    res = await this.urbitAnon.subscribe(
        this.state.stationShip,
        'talk', '/afx/' + this.state.stationChannel,
        this.props.onMessages)

    if (!res) {
      this.setState({
        formError: "Failed to join " + this.formatStation(),
        formStatusStyle: styles.formError
      })

    } else {
      this.props.onJoin(this.urbitAnon, this.state.stationShip, this.state.stationChannel)
    }
  }

  render() {
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={this.props.onHeaderClick}>
          <Header title="Join a Station" />
        </TouchableOpacity>

        <View style={styles.formRow}>
          <Text style={styles.formLabel}>Ship</Text>
          <TextInput
            value={this.state.stationShip}
            onChangeText={text => this.setState({stationShip: text.trim()})}
            style={styles.input}
            underlineColorAndroid="transparent"
            placeholder="marzod"
          />
        </View>

        <View style={styles.formRow}>
          <Text style={styles.formLabel}>Channel</Text>
          <TextInput
            value={this.state.stationChannel}
            onChangeText={text => this.setState({stationChannel: text.trim()})}
            style={styles.input}
            underlineColorAndroid="transparent"
            placeholder="urbit-meta"
          />
        </View>

        <View style={styles.formRow}>
          <Text style={this.state.formStatusStyle}>{this.state.formError}</Text>
        </View>

        <TouchableOpacity onPress={this.doJoin.bind(this)}>
          <Text style={styles.send}>Join</Text>
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
  input: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    fontSize: 18,
    flex: 1,
  },
  send: {
    alignSelf: 'center',
    color: 'lightseagreen',
    fontSize: 16,
    fontWeight: 'bold',
    padding: 20,
  },
  formRow: {
    flexDirection: 'row',
  },
  formLabel: {
    alignSelf: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    padding: 20,
  },
  formError: {
    alignSelf: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    padding: 20,
    color: 'red'
  },
});
