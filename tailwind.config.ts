import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				sans: ['Inter', 'Noto Sans Devanagari', 'system-ui', 'sans-serif'],
				display: ['Bricolage Grotesque', 'Inter', 'Noto Sans Devanagari', 'system-ui', 'sans-serif'],
				mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
				hand: ['Caveat', 'Kalam', 'Segoe Print', 'cursive'],
			},
			colors: {
				ink: {
					950: 'hsl(var(--ink-950) / <alpha-value>)',
					900: 'hsl(var(--ink-900) / <alpha-value>)',
					800: 'hsl(var(--ink-800) / <alpha-value>)',
					600: 'hsl(var(--ink-600) / <alpha-value>)',
					400: 'hsl(var(--ink-400) / <alpha-value>)',
					200: 'hsl(var(--ink-200) / <alpha-value>)',
					100: 'hsl(var(--ink-100) / <alpha-value>)',
				},
				iris: {
					700: 'hsl(var(--iris-700) / <alpha-value>)',
					600: 'hsl(var(--iris-600) / <alpha-value>)',
					500: 'hsl(var(--iris-500) / <alpha-value>)',
					300: 'hsl(var(--iris-300) / <alpha-value>)',
					100: 'hsl(var(--iris-100) / <alpha-value>)',
				},
				lime: {
					500: 'hsl(var(--lime-500) / <alpha-value>)',
					100: 'hsl(var(--lime-100) / <alpha-value>)',
				},
				signal: {
					DEFAULT: 'hsl(var(--signal) / <alpha-value>)',
					foreground: 'hsl(var(--signal-foreground) / <alpha-value>)',
				},
				inverse: {
					DEFAULT: 'hsl(var(--inverse) / <alpha-value>)',
					foreground: 'hsl(var(--inverse-foreground) / <alpha-value>)',
				},
				live: {
					DEFAULT: 'hsl(var(--live) / <alpha-value>)',
					foreground: 'hsl(var(--live-foreground) / <alpha-value>)',
				},
				warn: {
					DEFAULT: 'hsl(var(--warn) / <alpha-value>)',
					foreground: 'hsl(var(--warn-foreground) / <alpha-value>)',
				},
				danger: {
					DEFAULT: 'hsl(var(--danger) / <alpha-value>)',
					foreground: 'hsl(var(--danger-foreground) / <alpha-value>)',
				},
				success: 'hsl(var(--success) / <alpha-value>)',
				warning: 'hsl(var(--warning) / <alpha-value>)',
				border: 'hsl(var(--border) / <alpha-value>)',
				input: 'hsl(var(--input) / <alpha-value>)',
				ring: 'hsl(var(--ring) / <alpha-value>)',
				background: 'hsl(var(--background) / <alpha-value>)',
				foreground: 'hsl(var(--foreground) / <alpha-value>)',
				primary: {
					DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
					foreground: 'hsl(var(--primary-foreground) / <alpha-value>)'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary) / <alpha-value>)',
					foreground: 'hsl(var(--secondary-foreground) / <alpha-value>)'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
					foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
					foreground: 'hsl(var(--muted-foreground) / <alpha-value>)'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
					foreground: 'hsl(var(--accent-foreground) / <alpha-value>)'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover) / <alpha-value>)',
					foreground: 'hsl(var(--popover-foreground) / <alpha-value>)'
				},
				card: {
					DEFAULT: 'hsl(var(--card) / <alpha-value>)',
					foreground: 'hsl(var(--card-foreground) / <alpha-value>)'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background) / <alpha-value>)',
					foreground: 'hsl(var(--sidebar-foreground) / <alpha-value>)',
					primary: 'hsl(var(--sidebar-primary) / <alpha-value>)',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground) / <alpha-value>)',
					accent: 'hsl(var(--sidebar-accent) / <alpha-value>)',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground) / <alpha-value>)',
					border: 'hsl(var(--sidebar-border) / <alpha-value>)',
					ring: 'hsl(var(--sidebar-ring) / <alpha-value>)'
				}
			},
			boxShadow: {
				// Tactile pressed edge for solid buttons
				press: 'inset 0 -2px 0 hsl(0 0% 0% / 0.22), 0 1px 2px hsl(240 24% 6% / 0.12)',
				lift: '0 24px 60px -20px hsl(240 24% 6% / 0.28)',
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'marquee-up': {
					'0%': {
						transform: 'translateY(0)'
					},
					'100%': {
						transform: 'translateY(-50%)'
					}
				},
				'fade-in': {
					'0%': { opacity: '0', transform: 'translateY(10px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'fade-out': {
					'0%': { opacity: '1', transform: 'translateY(0)' },
					'100%': { opacity: '0', transform: 'translateY(10px)' }
				},
				'scale-in': {
					'0%': { transform: 'scale(0.95)', opacity: '0' },
					'100%': { transform: 'scale(1)', opacity: '1' }
				},
				'scale-out': {
					from: { transform: 'scale(1)', opacity: '1' },
					to: { transform: 'scale(0.95)', opacity: '0' }
				},
				'slide-in-right': {
					'0%': { transform: 'translateX(100%)' },
					'100%': { transform: 'translateX(0)' }
				},
				'slide-out-right': {
					'0%': { transform: 'translateX(0)' },
					'100%': { transform: 'translateX(100%)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'marquee-up': 'marquee-up 45s linear infinite',
				'fade-in': 'fade-in 0.3s ease-out',
				'fade-out': 'fade-out 0.3s ease-out',
				'scale-in': 'scale-in 0.2s ease-out',
				'scale-out': 'scale-out 0.2s ease-out',
				'slide-in-right': 'slide-in-right 0.3s ease-out',
				'slide-out-right': 'slide-out-right 0.3s ease-out',
				enter: 'fade-in 0.3s ease-out, scale-in 0.2s ease-out',
				exit: 'fade-out 0.3s ease-out, scale-out 0.2s ease-out'
			}
		}
	},
	plugins: [tailwindcssAnimate],
} satisfies Config;
