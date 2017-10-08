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
                <FontAwesome name="angle-left" size={32} color="white" />
              }
            </View>
          </TouchableOpacity>
          <Text style={styles.title}>
            {this.props.title}
          </Text>
          <Text style={styles.rightButton}></Text>
        </View>
      </View>
    )
  }
}

const styles = StyleSheet.create({
  header: {
    height: 76,
    backgroundColor: 'lightseagreen',
    justifyContent: 'flex-end',
    padding: 10,
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
    width: 32
  },
  rightButton: {
    width: 32
  },
});
