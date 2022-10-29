const colors = require('tailwindcss/colors');

delete colors['lightBlue'];
delete colors['warmGray'];
delete colors['trueGray'];
delete colors['coolGray'];
delete colors['blueGray'];

module.exports = {
  content: [
    "./src/**/*.tsx"
  ],
  theme: {
    fontFamily: {
      "sans": ["Inter"]
    },
    colors: {
      liane: {
        pink: "#FF8484",
        orange: "#FF5B22",
        yellow: "#FFB545",
        blue: {
          10: "#cee4fe",
          20: "#85bcfc",
          30: "#0b79f9",
          40: "#23278a"
        }
      }, ...colors
    }
  }
}
