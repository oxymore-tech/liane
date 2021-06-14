## Overall architecture

The project is built on [React](https://fr.reactjs.org/), 
[Typescript](https://www.typescriptlang.org/) and [Expo.io](https://expo.io/).

Source organization (`src` folder) :

## `assets`
## `api`
## `components`
## `screens`

## Getting Started

In order to use the application in development mode, you need to install expo.io.
Check [here](https://docs.expo.io/get-started/installation/) for detailled instructions.
You also need to have installed [nvm](https://github.com/nvm-sh/nvm) (version 15) 
and [yarn](https://classic.yarnpkg.com/en/) on your computer.

After installing Expo GLI on you computer and Expo GO on your smartphone 
(or tablet) you can use the following commands to build and run the application.

```bash
nvm use
yarn
yarn web
```

The application should've launched properly.

To access the deployed application, you can scan the QR code displayed 
the development tools (or in the terminal) accessible at the address http://localhost:19002/.
You can also access the application at the address http://localhost:19006/ on your computer.

## Setting private IP adress
In dev mode, you shoud give the app your private IP adress so you can access the APIs. 
Go to ``app/src/api/http.ts``, and change the line : 
``const BaseUrl = __DEV__ ? "http://192.168.X.XXX:8081/api" : "https://liane.gjini.co/api";``replacing the Xs with your private IP adress. 
You can ask for your IP in your terminal with the following command : ``ifconfig``.


