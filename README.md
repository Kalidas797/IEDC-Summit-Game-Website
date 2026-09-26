# PaperLab Games Arena

Welcome to the **PaperLab Games Arena**, an interactive, multi-game platform designed to test players' skills across various challenges including memory, reaction time, observation, and more. 

Built with an ultra-clean, high-contrast, brutalist/minimalist aesthetic, this platform provides a premium gaming experience.

## 🚀 Architecture

This project is a monorepo containing two main applications built with **React (Vite) + TypeScript + Tailwind CSS**, powered by a **Supabase** backend.

- **`/website`** - The main player-facing game arena where users play games, earn scores, and view the leaderboard.
- **`/app`** - The powerful Admin Dashboard used to configure games, manage content, tweak scoring rules, and monitor player sessions.
- **`/shared`** - Shared utilities and TypeScript types used across both applications.

## 🎮 Available Games

The arena features a wide variety of mini-games, each with unique mechanics and scoring systems:

1. **Original or AI?** - Identify whether an image is AI-generated or an original photograph.
2. **Spot the Difference** - Find the hidden differences between two images before the timer runs out.
3. **Remember the Paper** - Memorize a document and answer questions about it.
4. **What Changed?** - Study an image, then identify what changed in the modified version.
5. **Doodle Telephone** - Draw a prompt and see if others can guess it.
6. **Hidden Words** - A classic word search puzzle with a modern twist.
7. **Reaction Challenge** - Test your reflexes by clicking as fast as you can.
8. **Color/Word Challenge** - The Stroop effect test: identify the color of the text, not the word itself.
9. **Sequence Memory** - Remember and repeat a growing sequence of flashes.
10. **Rock Paper Scissors** - Classic RPS against an AI opponent.
11. **Tic Tac Toe** - The classic grid game.

## ✨ Key Features

- **Time-Based Scoring:** Players are rewarded with higher scores for faster correct answers, calculated using high-precision performance timers (`performance.now()`).
- **Dynamic Content Randomization:** Admins can create multiple puzzles/challenges for a game, and the engine will randomly select a configured amount per player session to keep the game fresh.
- **Configurable Game Rules:** Through the Admin App, organizers can adjust the number of questions per game, time limits, max score, and toggle time-based scoring on or off.
- **Real-time Leaderboards:** Powered by Supabase, the leaderboards update in real-time as players complete games.
- **Brutalist UI:** A sleek, dark-mode, high-contrast design featuring glowing accents, glassmorphism, and smooth Framer Motion animations.

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18+)
- npm or pnpm
- A Supabase project (for the database and storage)

### Installation

1. Clone the repository.
2. Install dependencies for all workspaces:
   ```bash
   # In the root directory, or individually in /website and /app
   npm install
   ```
3. Set up your environment variables. Create a `.env.local` file in both `/website` and `/app` with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### Running Locally

You can run both applications concurrently or individually:

**Run the Website (Player Arena):**
```bash
cd website
npm run dev
```

**Run the Admin App:**
```bash
cd app
npm run dev
```

## 🏗️ Supabase Database Schema

The core tables driving the platform include:
- `games`: Registry of available games.
- `game_content`: Configurations and puzzle content for the games (JSON data).
- `game_sessions`: Tracks active and completed player sessions.
- `scores`: Records player scores for leaderboard generation.
- `players` & `colleges`: User demographic tracking.

## 🎨 Design Philosophy

No "AI slop" here. The design follows strict guidelines:
- Deep dark backgrounds (zinc-950)
- High contrast, vibrant accent colors (cyan, lime, rose)
- Sleek typography (Inter/Roboto/Outfit)
- Smooth micro-interactions and transitions using `framer-motion`

---
*Created for the IEDC Summit Game Website.*