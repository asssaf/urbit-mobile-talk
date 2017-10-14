import React from 'react';
import {Alert, View, StyleSheet} from 'react-native';
import GlyphButton from './GlyphButton'

export default class ToolBar extends React.Component {
  confirmLogout() {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Ok', onPress: () => this.props.onLogout() },
      { text: 'Cancel' },
    ])
  }

  confirmReload() {
    Alert.alert('Reload', 'Are you sure you want to reload the app?', [
      { text: 'Ok', onPress: () => this.doReload() },
      { text: 'Cancel' },
    ])
  }

  doReload() {
    Expo.Util.reload()
  }

  render() {
    return (
      <View style={styles.row}>
        <GlyphButton glyph="sign-out" onPress={() => this.confirmLogout()} />
        <GlyphButton glyph="ellipsis-v" onPress={() => this.confirmReload()} />
      </View>
    )
  }
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row'
  },
})
