const colors = require('tailwindcss/colors');

module.exports = {
  content: [
    "./src/**/*.tsx"
  ],
  darkMode: "media",
  theme: {
    fontFamily: {
      "sans": ["Inter"],
      "mono": ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "Liberation Mono", "Courier New", "monospace"]
    },
    colors: {
      orange: {
        light: '#FFB545',
        DEFAULT: '#FF5B22'
      },
      pink: {
        light: '#FF8484'
      },
      black: colors.black,
      white: colors.white,
      gray: colors.gray,
      red: colors.red,
      yellow: colors.amber,
      blue: colors.blue
    }
  },
  plugins: []
}
