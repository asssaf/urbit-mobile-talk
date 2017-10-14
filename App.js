import React from 'react';
import { Alert } from 'react-native';
import Login from './Login';
import Loading from './Loading';
import Chat from './Chat';
import Urbit from './Urbit';
import { loadState, saveState } from './persistence'


export default class App extends React.Component {
  state = {
    loggedIn: false,
    loggedOut: false,
    loading: true,
    loadingStatus: "Loading...",
    user: "",
    server: "",
    session: null,
  };

  urbit = new Urbit()

  async componentDidMount() {
    loadState.bind(this)({ user: '', server: '' })
      .then(v => this.checkLogin())
      .catch(e => this.checkLogin())
  }

  componentWillUnmount() {
  }

  async checkLogin() {
    if (this.state.user == "") {
      this.setState({ loading: false })
      return
    }

    this.setState({ loadingStatus: "Logging in..." })
    var server
    if (this.state.server.length > 0) {
      server = this.state.server

    } else {
      server = 'https://' + this.state.user + '.urbit.org'
    }
    var session = await this.urbit.getSession(server, this.state.user)
    this.setState({ loading: false })
    if (session && session.authenticated) {
      this.handleLogin(session, this.state.user, this.state.server)
    }
  }

  async handleLogin(session, user, server) {
    this.setState({ user: user, server: server, loggedIn: true, session: session })

    // store the user for next time
    saveState('user', user)
    saveState('server', server)
  }

  handleLoadingCancel() {
    //TODO cancel request in progress
    this.setState({ loading: false })
  }

  confirmLogout() {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Ok', onPress: () => this.doLogout() },
      { text: 'Cancel' },
    ])
  }

  async doLogout() {
    var res = await this.urbit.deleteSession(this.state.session)
    if (!res) {
      console.log("Failed to logout")
    }

    this.setState({ loggedIn: false, loggedOut: true })
  }

  render() {
    if (this.state.loading) {
      return (
        <Loading
          statusMessage={this.state.loadingStatus}
          onCancel={this.handleLoadingCancel.bind(this)}
        />
      );
    }

    if (!this.state.loggedIn) {
      return (
        <Login
          user={this.state.user}
          server={this.state.server}
          onLogin={this.handleLogin.bind(this)}
          loggedOut={this.loggedOut}
        />
      );
    }

    return (
      <Chat
        user={this.state.user}
        session={this.state.session}
        onBackPress={this.confirmLogout.bind(this)}
      />
    );
  }
}
