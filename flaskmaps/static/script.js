window.onload = function() {
    this.document.getElementById('follow-location').value = "on";
}

const toggleLight = document.getElementById("toggle-light");
const toggleDark = document.getElementById("toggle-dark");

// Define both theme variable sets
const darkTheme = {
  "--primary-background": "rgb(20, 20, 20)",
  "--sidebar-background": "linear-gradient(45deg, #000000 0%, #36006e 100%)",
  "--sidebar-bottom-background": "#17181a",
  "--sidebar-input-box-bg": "#313335",
  "--sidebar-input-box-bg-focus": "black",
  "--sidebar-input-text": "white",
  "--text-color-1": "#99afd6",
  "--sidebar-button-bg": "#276fbb",
  "--sidebar-button-bg-focus": "#16509b",
  "--measurement-text-color": "white",
  "--suggestions-color": "#88f3ac"
};

const lightTheme = {
  "--primary-background": "white",
  "--sidebar-background": "white",
  "--sidebar-bottom-background": "#f8fafc",
  "--sidebar-input-box-bg": "#f8fafc",
  "--sidebar-input-box-bg-focus": "white",
  "--sidebar-input-text": "black",
  "--sidebar-button-bg": "#f1f5f9",
  "--sidebar-button-bg-focus": "#e2e8f0",
  "--measurement-text-color": "#1e293b",
  "--text-color-1": "#4a5568",
  "--suggestions-color": "#667eea"
};

// Apply a theme by updating all CSS variables on :root
function applyTheme(theme) {
  const root = document.documentElement;
  for (const key in theme) {
    root.style.setProperty(key, theme[key]);
  }
}

// Track current mode
let isDarkMode = true;

document.getElementById("dark-mode-toggle").addEventListener("click", () => {
  isDarkMode = !isDarkMode;

  if (isDarkMode) {
    applyTheme(darkTheme);
    toggleLight.hidden = false;
    toggleDark.hidden = true;
    setMapTheme("dark");
  } else {
    applyTheme(lightTheme);
    toggleLight.hidden = true;
    toggleDark.hidden = false;
    setMapTheme("light");
  }
});

