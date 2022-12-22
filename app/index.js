/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './src/App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
import 'react-native-gesture-handler' // Fix IOS issue, see https://github.com/software-mansion/react-native-gesture-handler/issues/320