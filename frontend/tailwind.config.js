/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: ["class", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Brand palette — all values come from CSS vars, 
        // Tailwind classes are bridges to CSS custom properties
        gold: {
          300: "var(--color-gold-300)",
          400: "var(--color-gold-400)",
          500: "var(--color-gold-500)",
          600: "var(--color-gold-600)",
          700: "var(--color-gold-700)",
        },
        brand: {
          red:    "var(--color-red-600)",
          "red-dark": "var(--color-red-700)",
          green:  "var(--color-green-600)",
          "green-dark": "var(--color-green-700)",
        },
        bg:          "var(--color-bg)",
        surface:     "var(--color-surface)",
        "surface-2": "var(--color-surface-2)",
        "surface-3": "var(--color-surface-3)",
        border:      "var(--color-border)",
        "border-subtle": "var(--color-border-subtle)",
        "text-primary":   "var(--color-text-primary)",
        "text-secondary": "var(--color-text-secondary)",
        "text-muted":     "var(--color-text-muted)",
        "text-disabled":  "var(--color-text-disabled)",
        success:    "var(--color-success)",
        warning:    "var(--color-warning)",
        error:      "var(--color-error)",
        info:       "var(--color-info)",
        parchment:  "var(--color-parchment)",
      },
      fontFamily: {
        sans: ["Cairo", "system-ui", "sans-serif"],
        arabic: ["Cairo", "system-ui", "sans-serif"],
      },
      fontSize: {
        xs:   "var(--font-size-xs)",
        sm:   "var(--font-size-sm)",
        base: "var(--font-size-base)",
        lg:   "var(--font-size-lg)",
        xl:   "var(--font-size-xl)",
        "2xl": "var(--font-size-2xl)",
        "3xl": "var(--font-size-3xl)",
        "4xl": "var(--font-size-4xl)",
      },
      borderRadius: {
        sm:   "var(--radius-sm)",
        md:   "var(--radius-md)",
        lg:   "var(--radius-lg)",
        xl:   "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        full: "var(--radius-full)",
      },
      boxShadow: {
        sm:   "var(--shadow-sm)",
        md:   "var(--shadow-md)",
        lg:   "var(--shadow-lg)",
        gold: "var(--shadow-gold)",
        red:  "var(--shadow-red)",
      },
      transitionDuration: {
        fast: "150ms",
        base: "250ms",
        slow: "400ms",
      },
      minWidth: {
        touch: "44px",
      },
      minHeight: {
        touch: "44px",
      },
      spacing: {
        "safe-bottom": "env(safe-area-inset-bottom)",
      },
      maxWidth: {
        content: "var(--content-max-width)",
      },
      height: {
        topbar: "var(--topbar-height)",
        "bottom-nav": "var(--bottom-nav-height)",
      },
      width: {
        sidebar: "var(--sidebar-width)",
        "sidebar-collapsed": "var(--sidebar-collapsed)",
      },
      zIndex: {
        dropdown: "var(--z-dropdown)",
        sticky:   "var(--z-sticky)",
        drawer:   "var(--z-drawer)",
        modal:    "var(--z-modal)",
        overlay:  "var(--z-overlay)",
        toast:    "var(--z-toast)",
      },
      screens: {
        xs:  "360px",
        sm:  "390px",
        md:  "768px",
        lg:  "1024px",
        xl:  "1280px",
        "2xl": "1920px",
      },
    },
  },
  plugins: [],
}
