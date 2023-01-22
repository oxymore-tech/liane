# Getting started

```bash
cd app
npm i --legacy-peer-deps
# Pour IOS
cd ios && pod install
```

Installer [Android studio](https://docs.expo.dev/workflow/android-studio-emulator/)

Run the project

```bash
npm run start
# puis 'a' pour android 
# ou 'i' pour ios
```

# Upgrade react native version

Create a new empty project

```bash
npx react-native init liane
remove yarn.lock
```

- Configure prettier
- Copy .svgrc

### Android changes
- Move package com.liane to tech.oxymore.liane in android in src dir (dir and .java files)
- Edit android/app/build.gradle
  - package
  - versCode and Name
  - signing.release
- Copy resources (fonts and icons) and manifest
- Copy google-services.json
- Add onCreate to MainActivity

```java
  /**
   * Required by react navigation to handle wake up
   */
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(null);
  }
```
- Copy debug.keystore
  
### Apply IOS changes

- folder ios/liane
  - (Images.xcassets)
  - edit Info.plist

- folder liane.xcodeproj
  - edit project.pbxproj (add resources and mapbox entries) 

### Install npm deps

```bash
npm install --save-dev          \
  react-native-dotenv           \
  babel-plugin-module-resolver  \
  react-native-svg-transformer
                
npm install                                             \
  react-native-reanimated@next                          \
  @react-navigation/native                              \
  @react-navigation/native-stack                        \
  @datadog/mobile-react-navigation                      \
  @datadog/mobile-react-native                          \
  rnmapbox/maps#main                                    \
  @gorhom/bottom-sheet                                  \
  @microsoft/signalr                                    \
  @notifee/react-native                                 \
  @react-native-firebase/app                            \
  @react-native-firebase/messaging                      \
  @react-navigation/bottom-tabs                         \
  async-mutex                                           \
  i18n-js                                               \
  react-native-encrypted-storage                        \
  react-native-eva-icons                                \
  react-native-gesture-handler                          \
  react-native-modal                                    \
  react-native-safe-area-context                        \
  react-native-screens                                  \
  react-native-svg                                      \
  react-query
```
