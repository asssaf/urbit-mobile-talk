import React from 'react';
import {View, StyleSheet, TouchableOpacity} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

export default class GlyphButton extends React.Component {
  state = {
    color: this.props.color || 'white'
  }

  render() {
    return (
      <TouchableOpacity onPress={this.props.onPress}>
        <View style={styles.button}>
          <FontAwesome name={this.props.glyph} size={24} color={this.state.color} />
        </View>
      </TouchableOpacity>
    )
  }
}

const styles = StyleSheet.create({
  button: {
    width: 48,
    alignItems: 'center',
  },
});
