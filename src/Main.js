import React from 'react';
import { StyleSheet, View } from 'react-native';
import { DrawerNavigator, NavigationActions, StackNavigator } from 'react-navigation';
import { webapi as urbit } from '@asssaf/urbit';
import Login from './Login';
import LoadingScreen from './LoadingScreen';
import Chat from './Chat';
import ChatMenu from './ChatMenu';
import ViewMessage from './ViewMessage'
import ViewLog from './ViewLog';
import { } from './utils';
import { formatShip } from './formatting'
import { loadState, saveState } from './persistence'

const ChatNavigator = StackNavigator({
  Loading: {
    screen: LoadingScreen,
  },
  Login: {
    screen: Login,
  },
  Chat: {
    screen: Chat,
  },
  ViewMessage: {
    screen: ViewMessage,
  },
  ViewLog: {
    screen: ViewLog,
  },
}, {
  initialRouteParams: {
    statusMessage: 'Loading...',
  },
  navigationOptions: {
    headerTintColor: 'white',
    headerStyle: { backgroundColor: 'lightseagreen' },
  },
})

const MenuNavigator = DrawerNavigator({
  Chat: {
    screen: ChatNavigator,
  },
}, {
  contentComponent: ChatMenu,
})

export default class Main extends React.Component {
  state = {
    user: "",
    server: "",
    cookie: null,
    session: { user: '', server: ''},
  };

  async componentDidMount() {
    loadState.bind(this)({ user: '', server: '', cookie: null })
      .then(v => this.checkLogin())
      .catch(e => this.checkLogin())
  }

  componentWillUnmount() {
  }

  switchToLogin() {
    var action = NavigationActions.reset({
      index: 0,
      actions: [
        NavigationActions.navigate({
          routeName: 'Login',
          params: {
            user: this.state.user,
            server: this.state.server,
          },
        })
      ]
    })
    this.navigator.dispatch(action)
  }

  switchToChat() {
    var action = NavigationActions.reset({
      index: 0,
      actions: [
        NavigationActions.navigate({
          routeName: 'Chat',
          params: {
            title: '~' + formatShip(this.state.user, true),
            onLogout: this.doLogout.bind(this),
          },
        })
      ]
    })
    this.navigator.dispatch(action)
  }

  setRouteKey(key) {
    this.setState({ routeKey: key })
  }

  async checkLogin() {
    if (this.state.user == "" || !this.state.cookie) {
      this.switchToLogin()
      return
    }

    this.navigator.dispatch(NavigationActions.setParams({
      key: this.state.routeKey,
      params: { statusMessage: 'Logging in...' }
    }))

    var server
    if (this.state.server.length > 0) {
      server = this.state.server

    } else {
      server = 'https://' + this.state.user + '.urbit.org'
    }

    var session = await urbit.getSession(
          server, this.state.user, this.state.cookie)

    this.setState({ loading: false })
    if (session && session.authenticated) {
      this.handleLogin(session, this.state.user, this.state.server)

    } else {
      this.switchToLogin()
    }
  }

  async handleLogin(session, user, server) {
    this.setState({ user: user, server: server, session: session })

    this.switchToChat()

    // store the user for next time
    saveState('user', user)
    saveState('server', server)
    saveState('cookie', session.cookie)
  }

  handleLoadingCancel() {
    //TODO cancel request in progress
    this.switchToLogin()
  }

  async doLogout() {
    var res = await urbit.deleteSession(this.state.session)
    if (!res) {
      console.log("Failed to logout")
    }

    // switch anyway (even if logout failed)
    this.switchToLogin()
  }

  render() {
    var screenProps = {
      session: this.state.session,
      onLoadingCancel: this.handleLoadingCancel.bind(this),
      onLogout: this.doLogout.bind(this),
      onLogin: this.handleLogin.bind(this),
      setRouteKey: this.setRouteKey.bind(this),
      refs: {},
    }

    return (
      <View style={styles.container}>
        <View style={styles.header} />
        <MenuNavigator screenProps={screenProps} ref={(nav) => {this.navigator = nav; } } />
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
