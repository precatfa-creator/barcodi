export default {
  content: ["./index.html", "./src/**/*.{vue,js}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Cairo", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        manufacture: {
          ink: "#182230",
          muted: "#667085",
          line: "#E4E7EC",
          warm: "#F8FAFC",
          green: "#0F9F6E",
          greenDark: "#087452",
          amber: "#D97706",
          red: "#DC2626",
        },
      },
    },
  },
  plugins: [],
}
