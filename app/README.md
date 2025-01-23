This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# Getting Started

>**Note**: Make sure you have completed the [React Native - Environment Setup](https://reactnative.dev/docs/environment-setup) instructions till "Creating a new application" step, before proceeding.

### Common Setup 

Build the common package:

```bash
cd common
yarn install
yarn build
```

### App Setup

```bash
cd app
yarn
```

#### IOS only : install pods

```sh
yarn post-install
```

#### Launch app

```bash
yarn start # starts metro server
```

Hit `a` key to launch android (see instructions for more commands).
Hit `i` key to launch ios (see instructions for more commands).

# Connect android device in WIFI

```bash
adb tcpip 5555
adb shell ip addr show wlan0 and copy the IP address after the "inet" until the "/". You can also go inside the Settings of the device to retrieve the IP address in Settings → About → Status.
adb connect ip-address-of-device:5555
```
# Stream IOS phone on linux

```bash
# Installer uxplay
# pour que uxplay marche il faut que gstreamer soit à la version 1.22.x (max). Au le stream ne marche pas.
sudo manjaro-downgrade gst-plugins-ugly gst-plugins-good gst-plugins-base gst-plugins-bad-libs  gst-libav gst-plugins-base-libs gstreamer gst-plugins-bad
```

```bash
# l'iphone et le PC doivent être sur le même réseau WIFI
uxplay -vsync no -avdec
# puis sur l'iphone, dans le menu du haut (faire glisser) selectionner le partage d'écran et sélectionner uxplay@nom-du-pc
```

# Stream ANDROID phone on linux

```bash
# brancher le telephone en USB
scrcopy
```

