import React from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Switch } from 'react-native';
import urbit from '@asssaf/urbit';
import EditableDropDown from './EditableDropDown';
import { loadState, saveState, updateLru } from './persistence'

export default class Login extends React.Component {
  static navigationOptions = {
    title: 'Login to your Urbit',
    drawerLockMode: 'locked-closed'
  }

  state = {
    formError: "",
    formStatusStyle: styles.formLabel,
    user: this.props.navigation.state.params.user,
    code: "",
    submitted: false,
    customServer: this.props.navigation.state.params.server.length > 0,
    server: this.props.navigation.state.params.server,
    userRecent: [],
    serverRecent: [],
  }

  componentDidMount() {
    this.setState({ formError: "", submitted: false })
    loadState.bind(this)({ userRecent: [], serverRecent: [] })
  }

  async doLogin() {
    this.setState({
      submitted: true,
      formError: "Connecting...",
      formStatusStyle: styles.formLabel
    })

    var server
    if (this.state.customServer && this.state.server.length > 0) {
      server = this.state.server

    } else {
      server = 'https://' + this.state.user + '.urbit.org'
    }

    var session = await urbit.webapi.getSession(server, this.state.user)
    if (!session) {
      this.setState({
        formError: "Failed to connect",
        formStatusStyle: styles.formError,
        submitted: false
      })
      return
    }

    var result = await urbit.webapi.authenticate(session, this.state.code)
    if (result) {
      this.setState({ formError: "", submitted: false })
      //TODO secure store for cookie
      saveState('userRecent', updateLru(this.state.userRecent, this.state.user))
      if (this.state.customServer && this.state.server.length > 0) {
        saveState('serverRecent', updateLru(this.state.serverRecent, this.state.server))
      }
      this.props.screenProps.onLogin(session, this.state.user, this.state.customServer ? this.state.server : '')

    } else {
      this.setState({
        formError: "Failed to login",
        formStatusStyle: styles.formError,
        submitted: false
      })
    }
  }

  isDisabled() {
    if (this.state.submitted) {
      return true
    }

    if (this.state.user.trim().length == 0) {
      return true
    }

    if (this.state.code.trim().length == 0) {
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
        <View style={styles.formRow}>
          <Text style={styles.formLabel}>User</Text>
          <EditableDropDown
              enabled={!this.state.submitted}
              options={this.state.userRecent}
              defaultValue={this.state.user}
              onItemSelected={user => this.setState({ user })}
              style={styles.picker}
          >
            <TextInput
              editable={!this.state.submitted}
              value={this.state.user}
              onChangeText={text => this.setState({user: text.trim()})}
              style={styles.input}
              underlineColorAndroid="transparent"
              placeholder="zod"
            />
          </EditableDropDown>
        </View>

        <View style={styles.formRow}>
          <Text style={styles.formLabel}>Code</Text>
          <TextInput
            editable={!this.state.submitted}
            secureTextEntry={true}
            value={this.state.code}
            onChangeText={text => this.setState({code: text.trim()})}
            style={styles.input}
            underlineColorAndroid="transparent"
            placeholder="code"
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
            <EditableDropDown
                enabled={!this.state.submitted}
                options={this.state.serverRecent}
                defaultValue={this.state.server}
                onItemSelected={server => this.setState({ server })}
                style={styles.picker}
            >
              <TextInput
                editable={!this.state.submitted}
                value={this.state.server}
                onChangeText={text => this.setState({server: text.trim()})}
                style={styles.input}
                underlineColorAndroid="transparent"
                placeholder="https://ship.urbit.org"
              />
            </EditableDropDown>
          </View>
        }

        <View style={styles.formRow}>
          <Text style={this.state.formStatusStyle}>{this.state.formError}</Text>
        </View>

        <TouchableOpacity disabled={this.isDisabled()} onPress={this.doLogin.bind(this)}>
          <Text style={this.isDisabled() ? styles.sendDisabled : styles.send}>Login</Text>
        </TouchableOpacity>
      </View>
    );
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
  picker: {
    marginLeft: 17,
    marginTop: 6,
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
