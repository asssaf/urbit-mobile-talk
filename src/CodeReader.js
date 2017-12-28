import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BarCodeScanner, Permissions } from 'expo';

export default class CodeReader extends React.Component {
  state = {
    lastDataRead: null,
    hasCameraPermission: null,
  }

  componentDidMount() {
    this.requestCameraPermission()
  }

  requestCameraPermission = async () => {
      const { status } = await Permissions.askAsync(Permissions.CAMERA);
      this.setState({
        hasCameraPermission: status === 'granted',
      });
    };

  handleCodeRead = ({type, data}) => {
      if (data !== this.state.lastDataRead) {
        this.setState({ lastDataRead: data })
        this.props.onCodeRead({ type, data })
      }
    }

  render() {
    if (this.state.hasCameraPermission === null) {
      return (
        <Text>Requesting camera permission</Text>
      );

    } else if (this.state.hasCameraPermission === false) {
      return (
        <Text style={{ color: '#fff' }}>
          Camera permission is not granted
        </Text>
      );

    } else {
      return (
        <BarCodeScanner
          onBarCodeRead={this.handleCodeRead}
          style={{
            height: 300,
            width: 300,
          }}
        />
      );
    }
  }
}
