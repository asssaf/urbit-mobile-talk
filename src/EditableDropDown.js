import React from 'react';
import { Picker, Platform, View } from 'react-native';

export default class EditableDropDown extends React.Component {
  state = {
    other: false,
    selected: this.props.defaultValue,
  }

  render() {
    if (this.state.other
        || Platform.OS === 'ios'
        || this.props.options.length == 0
        || !this.props.options.includes(this.props.defaultValue)) {
      return (
        <View style={{flex: 1}}>
          {this.props.children}
        </View>
      )
    }

    var items = []
    this.props.options.forEach((o, i) => {
      items.push(<Picker.Item key={i} label={o.label || o } value={o.value || o} />)
    })
    items.push(<Picker.Item key="other" label="Other..." value='' />)

    return (
      <Picker
        selectedValue={this.state.selected}
        onValueChange={(itemValue, itemIndex) => {
          if (itemIndex == items.length - 1) {
            this.setState({ other: true })
            this.props.onItemSelected(itemValue)

          } else {
            this.setState({ selected: itemValue })
            this.props.onItemSelected(itemValue)
          }
        }}
        enabled={this.props.enabled}
        mode="dropdown"
        style={this.props.style}
      >
        {items}
      </Picker>
    )
  }
}
