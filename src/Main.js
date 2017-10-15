import React from 'react';
import { StyleSheet, View } from 'react-native';
import { StackNavigator, NavigationActions } from 'react-navigation';
import Login from './Login';
import Loading from './Loading';
import Chat from './Chat';
import ViewMessage from './ViewMessage'
import Urbit from './Urbit';
import { loadState, saveState } from './persistence'

const ChatNavigator = StackNavigator({
  Chat: {
    screen: Chat,
  },
  ViewMessage: {
    screen: ViewMessage,
  }
}, {
  initialRouteParams: {
    title: ''
  }
})

export default class Main extends React.Component {
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

    var screenProps = {
      session: this.state.session,
      onLogout: this.doLogout.bind(this),
    }

    return (
      <View style={styles.container}>
        <View style={styles.header} />
        <ChatNavigator screenProps={screenProps} />
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    height: Expo.Constants.statusBarHeight,
    backgroundColor: 'lightseagreen',
  },
});
