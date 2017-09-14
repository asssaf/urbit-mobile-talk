import React from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity } from 'react-native';
import Header from './Header';
import Urbit from './Urbit';

export default class Login extends React.Component {
  state = {
    formError: "",
    formStatusStyle: styles.formLabel,
    user: this.props.user,
    code: "",
  }

  urbit = null

  componentDidMount() {
    this.setState({ formError: "" })
    if (this.state.user != "" && !this.props.loggedOut) {
      this.checkLogin()
    }
  }

  async checkLogin() {
    this.setState({ formError: "Reestablishing session...", formStatusStyle: styles.formLabel })
    var server = 'https://' + this.state.user + '.urbit.org'
    this.urbit = new Urbit(server, this.state.user)
    var result = await this.urbit.isAuthenticated()
    this.setState({ formError: "" })
    if (result) {
      this.props.onLogin(this.urbit, this.state.user)
    }
  }

  async doLogin() {
    this.setState({ formError: "Connecting...", formStatusStyle: styles.formLabel })
    var server = 'https://' + this.state.user + '.urbit.org'
    this.urbit = new Urbit(server, this.state.user)
    var result = await this.urbit.authenticate(this.state.code)
    if (result) {
      this.setState({ formError: "" })
      this.props.onLogin(this.urbit, this.state.user)

    } else {
      this.setState({ formError: "Failed to login", formStatusStyle: styles.formError })
    }
  }

  render() {
    return (
      <View style={styles.container}>
        <Header title="Login to your Urbit" />

        <View style={styles.formRow}>
          <Text style={styles.formLabel}>User</Text>
          <TextInput
            value={this.state.user}
            onChangeText={text => this.setState({user: text.trim()})}
            style={styles.input}
            underlineColorAndroid="transparent"
            placeholder="zod"
          />
        </View>

        <View style={styles.formRow}>
          <Text style={styles.formLabel}>Code</Text>
          <TextInput
            secureTextEntry={true}
            value={this.state.code}
            onChangeText={text => this.setState({code: text.trim()})}
            style={styles.input}
            underlineColorAndroid="transparent"
            placeholder="code"
          />
        </View>

        <View style={styles.formRow}>
          <Text style={this.state.formStatusStyle}>{this.state.formError}</Text>
        </View>

        <TouchableOpacity onPress={this.doLogin.bind(this)}>
          <Text style={styles.send}>Login</Text>
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
