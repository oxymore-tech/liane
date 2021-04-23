module.exports = (api) => {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          alias: {
            "@/assets": "./assets",
            "@/components": "./src/components",
            "@/utils": "./src/utils",
            "@/api": "./src/api",
            "@/screens": "./src/screens"
          }
        }
      ]
    ]
  };
};
