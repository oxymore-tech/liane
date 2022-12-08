module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    [
      "module:react-native-dotenv",
      {
        "envName": "APP_ENV",
        "moduleName": "@env",
        "path": ".env",
        "safe": false,
        "allowUndefined": true,
        "verbose": false
      }
    ],
    [
      "module-resolver",
      {
        alias: {
          "@/assets": "./assets",
          "@/components": "./src/components",
          "@/utils": "./src/utils",
          "@/api": "./src/api",
          "@/screens": "./src/screens",
          "@/theme": "./src/theme"
        }
      },
    ],
  ]
};
