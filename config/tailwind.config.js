/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./App.tsx",
    "./index.tsx",
    "./*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core colors - using CSS variables for consistency with index.css
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        
        // Nubank Design System - Cores Principais (using CSS variables where applicable)
        nubank: {
          purple: {
            50: 'hsl(var(--nubank-purple-50))',
            100: 'hsl(var(--nubank-purple-100))',
            200: 'hsl(var(--nubank-purple-200))',
            300: 'hsl(var(--nubank-purple-300))',
            400: 'hsl(var(--nubank-purple-400))',
            500: 'hsl(var(--nubank-purple-500))', // Cor principal Nubank
            600: 'hsl(var(--nubank-purple-600))',
            700: 'hsl(var(--nubank-purple-700))',
            800: 'hsl(var(--nubank-purple-800))',
            900: 'hsl(var(--nubank-purple-900))',
            950: 'hsl(var(--nubank-purple-950))'
          },
          pink: {
            50: 'hsl(var(--nubank-pink-50))',
            100: 'hsl(var(--nubank-pink-100))',
            200: 'hsl(var(--nubank-pink-200))',
            300: 'hsl(var(--nubank-pink-300))',
            400: 'hsl(var(--nubank-pink-400))',
            500: 'hsl(var(--nubank-pink-500))', // Rosa Nubank
            600: 'hsl(var(--nubank-pink-600))',
            700: 'hsl(var(--nubank-pink-700))',
            800: 'hsl(var(--nubank-pink-800))',
            900: 'hsl(var(--nubank-pink-900))'
          },
          blue: {
            50: 'hsl(var(--nubank-blue-50))',
            100: 'hsl(var(--nubank-blue-100))',
            200: 'hsl(var(--nubank-blue-200))',
            300: 'hsl(var(--nubank-blue-300))',
            400: 'hsl(var(--nubank-blue-400))',
            500: 'hsl(var(--nubank-blue-500))', // Azul Nubank
            600: 'hsl(var(--nubank-blue-600))',
            700: 'hsl(var(--nubank-blue-700))',
            800: 'hsl(var(--nubank-blue-800))',
            900: 'hsl(var(--nubank-blue-900))'
          },
          orange: {
            50: 'hsl(var(--nubank-orange-50))',
            100: 'hsl(var(--nubank-orange-100))',
            200: 'hsl(var(--nubank-orange-200))',
            300: 'hsl(var(--nubank-orange-300))',
            400: 'hsl(var(--nubank-orange-400))',
            500: 'hsl(var(--nubank-orange-500))', // Laranja Nubank
            600: 'hsl(var(--nubank-orange-600))',
            700: 'hsl(var(--nubank-orange-700))',
            800: 'hsl(var(--nubank-orange-800))',
            900: 'hsl(var(--nubank-orange-900))'
          },
          gray: {
            50: 'hsl(var(--nubank-gray-50))',
            100: 'hsl(var(--nubank-gray-100))',
            200: 'hsl(var(--nubank-gray-200))',
            300: 'hsl(var(--nubank-gray-300))',
            400: 'hsl(var(--nubank-gray-400))',
            500: 'hsl(var(--nubank-gray-500))',
            600: 'hsl(var(--nubank-gray-600))',
            700: 'hsl(var(--nubank-gray-700))',
            800: 'hsl(var(--nubank-gray-800))',
            900: 'hsl(var(--nubank-gray-900))'
          }
        },

        // Redefinição de cores primárias para usar Nubank
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          light: "hsl(var(--nubank-purple-200))", // Using specific Nubank shade
          dark: "hsl(var(--nubank-purple-700))", // Using specific Nubank shade
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          light: "hsl(var(--nubank-gray-50))", // Using specific Nubank shade
          dark: "hsl(var(--nubank-gray-200))", // Using specific Nubank shade
        },
        
        // Cores de estado com identidade Nubank
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        // Legacy colors (maintained for compatibility) - using consistent naming
        surface: "hsl(var(--card))", // Map to card background
        textOnSurface: "hsl(var(--card-foreground))", // Map to card foreground
        textAccent: "hsl(var(--muted-foreground))", // Map to muted foreground
        textOnPrimary: "hsl(var(--primary-foreground))", // Map to primary foreground
        
        // Estados com cores Nubank
        success: { 
          DEFAULT: "hsl(var(--nubank-blue-500))", // Azul para sucesso
          text: "hsl(var(--accent-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--nubank-orange-500))", // Laranja Nubank
          text: "hsl(var(--warning-foreground))",    
        },
        danger: {
          DEFAULT: "hsl(var(--nubank-pink-500))", // Rosa Nubank
          text: "hsl(var(--destructive-foreground))",
        },
        info: { 
          DEFAULT: "hsl(var(--nubank-blue-500))", // Azul Nubank
          text: "hsl(var(--info-foreground))",
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        'nubank': 'var(--radius)', // Cantos arredondados padrão Nubank
        'nubank-lg': 'calc(var(--radius) + 4px)',
        'nubank-xl': 'calc(var(--radius) + 8px)',
      },
      boxShadow: {
        'nubank': 'var(--shadow-nubank)',
        'nubank-hover': 'var(--shadow-nubank-hover)',
        'nubank-elevated': 'var(--shadow-nubank-elevated)',
        'nubank-purple': '0 8px 32px rgba(var(--nubank-purple), 0.20)',
        'nubank-purple-hover': '0 12px 40px rgba(var(--nubank-purple), 0.30)',
        'nubank-blue': '0 8px 32px rgba(var(--nubank-blue), 0.15)',
        'nubank-blue-hover': '0 12px 40px rgba(var(--nubank-blue), 0.25)',
        'nubank-pink': '0 8px 32px rgba(var(--nubank-pink), 0.15)',
        'nubank-pink-hover': '0 12px 40px rgba(var(--nubank-pink), 0.25)',
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        // Enhanced 8px base unit spacing system
        '1.5': '0.375rem', // 6px
        '2.5': '0.625rem', // 10px
        '3.5': '0.875rem', // 14px
        '4.5': '1.125rem', // 18px
        '5.5': '1.375rem', // 22px
        '6.5': '1.625rem', // 26px
        '7.5': '1.875rem', // 30px
        '15': '3.75rem',   // 60px
        '18': '4.5rem',    // 72px
        '22': '5.5rem',    // 88px
        '26': '6.5rem',    // 104px
        '30': '7.5rem',    // 120px
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'bounce-gentle': 'bounceGentle 2s infinite',
        'nubank-float': 'nubankFloat 3s ease-in-out infinite',
        'nubank-pulse': 'nubankPulse 2s ease-in-out infinite',
        'nubank-scale': 'nubankScale 0.2s ease-out',
        'nubank-fade-in': 'nubankFadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        'nubank-slide-up': 'nubankSlideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        // Enhanced microinteraction animations
        'nubank-slide-down': 'nubankSlideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'nubank-slide-left': 'nubankSlideLeft 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'nubank-slide-right': 'nubankSlideRight 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'nubank-zoom-in': 'nubankZoomIn 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        'nubank-zoom-out': 'nubankZoomOut 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        'nubank-bounce': 'nubankBounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'nubank-wiggle': 'nubankWiggle 0.8s ease-in-out',
        'nubank-heartbeat': 'nubankHeartbeat 1.5s ease-in-out infinite',
        'nubank-glow': 'nubankGlow 2s ease-in-out infinite alternate',
        'nubank-shake': 'nubankShake 0.5s ease-in-out',
        // Loading and skeleton animations
        'nubank-skeleton': 'nubankSkeleton 1.5s ease-in-out infinite',
        'nubank-spin-slow': 'spin 2s linear infinite',
        'nubank-ping-slow': 'ping 3s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-2px)' },
        },
        nubankFloat: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        nubankPulse: {
          '0%, 100%': { 
            boxShadow: '0 0 0 0 rgba(138, 5, 190, 0.4)',
            transform: 'scale(1)' 
          },
          '50%': { 
            boxShadow: '0 0 0 8px rgba(138, 5, 190, 0)',
            transform: 'scale(1.02)' 
          },
        },
        nubankScale: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
        nubankFadeIn: {
          '0%': { 
            opacity: '0',
            transform: 'translateY(8px) scale(0.95)' 
          },
          '100%': { 
            opacity: '1',
            transform: 'translateY(0) scale(1)' 
          },
        },
        nubankSlideUp: {
          '0%': { 
            transform: 'translateY(16px)',
            opacity: '0' 
          },
          '100%': { 
            transform: 'translateY(0)',
            opacity: '1' 
          },
        },
        // Enhanced keyframes for microinteractions
        nubankSlideDown: {
          '0%': { 
            transform: 'translateY(-16px)',
            opacity: '0' 
          },
          '100%': { 
            transform: 'translateY(0)',
            opacity: '1' 
          },
        },
        nubankSlideLeft: {
          '0%': { 
            transform: 'translateX(16px)',
            opacity: '0' 
          },
          '100%': { 
            transform: 'translateX(0)',
            opacity: '1' 
          },
        },
        nubankSlideRight: {
          '0%': { 
            transform: 'translateX(-16px)',
            opacity: '0' 
          },
          '100%': { 
            transform: 'translateX(0)',
            opacity: '1' 
          },
        },
        nubankZoomIn: {
          '0%': { 
            transform: 'scale(0.95)',
            opacity: '0' 
          },
          '100%': { 
            transform: 'scale(1)',
            opacity: '1' 
          },
        },
        nubankZoomOut: {
          '0%': { 
            transform: 'scale(1.05)',
            opacity: '0' 
          },
          '100%': { 
            transform: 'scale(1)',
            opacity: '1' 
          },
        },
        nubankBounce: {
          '0%': { 
            transform: 'scale(0.3)',
            opacity: '0' 
          },
          '50%': { 
            transform: 'scale(1.05)' 
          },
          '70%': { 
            transform: 'scale(0.9)' 
          },
          '100%': { 
            transform: 'scale(1)',
            opacity: '1' 
          },
        },
        nubankWiggle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-3deg)' },
          '75%': { transform: 'rotate(3deg)' },
        },
        nubankHeartbeat: {
          '0%, 100%': { 
            transform: 'scale(1)',
            opacity: '1' 
          },
          '50%': { 
            transform: 'scale(1.05)',
            opacity: '0.8' 
          },
        },
        nubankGlow: {
          '0%': { 
            boxShadow: '0 0 5px rgba(138, 5, 190, 0.5)',
            transform: 'scale(1)' 
          },
          '100%': { 
            boxShadow: '0 0 20px rgba(138, 5, 190, 0.8)',
            transform: 'scale(1.02)' 
          },
        },
        nubankShake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-2px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(2px)' },
        },
        nubankSkeleton: {
          '0%': { 
            backgroundColor: 'rgb(229 231 235)',
            opacity: '1' 
          },
          '50%': { 
            backgroundColor: 'rgb(209 213 219)',
            opacity: '0.8' 
          },
          '100%': { 
            backgroundColor: 'rgb(229 231 235)',
            opacity: '1' 
          },
        }
      }
    }
  },
  plugins: [],
}