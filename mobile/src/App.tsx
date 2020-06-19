import React from 'react';
import registerRootComponent from 'expo/build/launch/registerRootComponent';

import { StyleSheet, View } from 'react-native';
import WebViewLeaflet from 'react-native-webview-leaflet';

function App() {
  return (
    <View style={styles.container}>
      <WebViewLeaflet
        ref={component => (this.webViewLeaflet = component)}
        // The rest of your props, see the list below
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center'
  }
});

registerRootComponent(App);
