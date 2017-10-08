import React from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Switch } from 'react-native';
import Header from './Header';
import Urbit from './Urbit';

export default class JoinStation extends React.Component {
  state = {
    formError: "",
    formStatusStyle: styles.formLabel,
    stationShip: this.props.stationShip,
    stationChannel: this.props.stationChannel,
    submitted: false,
    customServer: this.props.server.length > 0,
    server: this.props.server,
  }

  urbit = new Urbit()

  componentDidMount() {
    this.setState({ submitted: false })
  }

  async doJoin() {
    this.setState({
      submitted: true,
      formError: "Joining...",
      formStatusStyle: styles.formLabel
    })

    var server
    if (this.state.customServer && this.state.server.length > 0) {
      server = this.state.server

    } else {
      server = 'https://' + this.state.stationShip + '.urbit.org'
    }
    var session = await this.urbit.getSession(server)

    res = await this.urbit.subscribe(
        session, this.state.stationShip, "/",
        'talk', '/afx/' + this.state.stationChannel,
        this.props.onMessages, this.props.onPoll)

    if (!res) {
      this.setState({
        submitted: false,
        formError: "Failed to join " + this.urbit.formatStation(this.state.stationShip, this.state.stationChannel, true),
        formStatusStyle: styles.formError
      })

    } else {
      this.props.onJoin(session, this.state.stationShip, this.state.stationChannel,
          this.state.customServer ? this.state.server : '')
    }
  }

  isDisabled() {
    if (this.state.submitted) {
      return true
    }

    if (this.state.stationShip.trim().length == 0) {
      return true
    }

    if (this.state.stationChannel.trim().length == 0) {
      return true
    }

    return false
  }

  toggleCustomServer() {
    this.setState({ customServer: !this.state.customServer })
  }

  render() {
    return (
      <View style={styles.container}>
        <Header title="Join a Station" onLeftButtonPress={this.props.onBackPress} />

        <View style={styles.formRow}>
          <Text style={styles.formLabel}>Ship</Text>
          <TextInput
            editable={!this.state.submitted}
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
            editable={!this.state.submitted}
            value={this.state.stationChannel}
            onChangeText={text => this.setState({stationChannel: text.trim()})}
            style={styles.input}
            underlineColorAndroid="transparent"
            placeholder="urbit-meta"
          />
        </View>

        <View style={styles.formRow}>
          <Text style={styles.formLabel}>Use custom server</Text>
          <Switch disabled={this.state.submitted} value={this.state.customServer}
              onValueChange={this.toggleCustomServer.bind(this)} />
        </View>

        {this.state.customServer &&
          <View style={styles.formRow}>
            <Text style={styles.formLabel}>Server</Text>
            <TextInput
              editable={!this.state.submitted}
              value={this.state.server}
              onChangeText={text => this.setState({server: text.trim()})}
              style={styles.input}
              underlineColorAndroid="transparent"
              placeholder="https://ship.urbit.org"
            />
          </View>
        }

        <View style={styles.formRow}>
          <Text style={this.state.formStatusStyle}>{this.state.formError}</Text>
        </View>

        <TouchableOpacity disabled={this.isDisabled()} onPress={this.doJoin.bind(this)}>
          <Text style={this.isDisabled() ? styles.sendDisabled : styles.send }>Join</Text>
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
  sendDisabled: {
    alignSelf: 'center',
    color: 'grey',
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
