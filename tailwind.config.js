/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // Specifies where Tailwind should look for class names
  ],
  theme: {
    extend: {
      // Extend the theme with custom colors or styles
      colors: {
        'chat-user': '#1d4ed8', // Example custom color for user messages
        'chat-bot': '#d1d5db', // Example custom color for bot messages
      },
      borderRadius: {
        'lg': '0.5rem', // Custom border-radius if needed
      },
      maxWidth: {
        'chat': '40rem', // Custom max-width for chat bubbles
      },
    },
  },
  plugins: [
    require('daisyui'), // Includes the DaisyUI plugin
  ],
  daisyui: {
    themes: ["aqua"], // Sets DaisyUI to use the "aqua" theme
  },
};
