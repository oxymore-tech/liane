This is a new [**React Native**](https://reactnative.dev) project, bootstrapped using [`@react-native-community/cli`](https://github.com/react-native-community/cli).

# Getting Started

>**Note**: Make sure you have completed the [React Native - Environment Setup](https://reactnative.dev/docs/environment-setup) instructions till "Creating a new application" step, before proceeding.

First you need to check that you have built the common part.

```bash
cd ../common
yarn install
yarn build
```

You must then install the pods

```bash
yarn post-install
```

## Step 1: Start the Metro Server

First, you will need to start **Metro**, the JavaScript _bundler_ that ships _with_ React Native.

To start Metro, run the following command from the _root_ of your React Native project:

```bash
yarn install
yarn start
```

Hit `a` key to launch android (see instructions for more commands).

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

