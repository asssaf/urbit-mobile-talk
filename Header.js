import React from 'react';
import {View, Text, StyleSheet, StatusBar, TouchableOpacity} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

export default class Header extends React.Component {
  render() {
    return (
      <View style={styles.header}>
        <StatusBar backgroundColor="lightseagreen" barStyle="light-content" />
        <View style={styles.row}>
          <TouchableOpacity disabled={!this.props.onLeftButtonPress} onPress={this.props.onLeftButtonPress}>
            <View style={styles.leftButton}>
              {this.props.onLeftButtonPress &&
                <FontAwesome name="chevron-left" size={24} color="white" />
              }
            </View>
          </TouchableOpacity>
          <Text style={styles.title}>
            {this.props.title}
          </Text>

          <TouchableOpacity disabled={!this.props.onRightButtonPress} onPress={this.props.onRightButtonPress}>
            <View style={styles.rightButton}>
              {this.props.onRightButtonPress &&
                <FontAwesome name="ellipsis-v" size={24} color="white" />
              }
            </View>
          </TouchableOpacity>
        </View>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  header: {
    padding: 10,
    paddingTop: Expo.Constants.statusBarHeight,
    height: 50 + Expo.Constants.statusBarHeight,
    backgroundColor: 'lightseagreen',
    justifyContent: 'flex-end',
  },
  title: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  leftButton: {
    width: 48,
    marginTop: 5,
  },
  rightButton: {
    width: 48,
    marginTop: 5,
    alignItems: 'flex-end',
  },
});
