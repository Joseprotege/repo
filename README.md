# Lend

> **A community-powered mutual assistance network.** Post tasks you need help with. Find neighbors ready to step up. Build real trust through real actions.

---

## What is Lend?

Lend is a platform where people help each other out — somewhere between Fiverr and a neighborhood watch list, but built entirely on **reciprocity and trust**.

- **Post tasks** you need help with (moving, tutoring, rides, repairs, dog walking…)
- **Browse and offer** to assist on others' tasks — fully or partially
- **Build your reliability score** from the comparison of your self-assessment vs. your actual track record
- **Form connections** that can grow into mutual, long-term help relationships
- **Return the favor** when your helpers need a hand

---

## Features

### 📋 Task Listings (eBay-style)
- Rich listing cards with images, tags, categories, urgency levels
- Full-text search + filtering by category, urgency, remote-friendliness
- Location-based proximity (distance counts toward helper ranking)
- Views, offer counts, time-posted — everything visible at a glance

### 🙋 Offer System
Three modes of helping:
- **Assist** — help alongside the requester
- **Collaborate** — team effort
- **Fully Complete** — take full ownership of the task

### ⭐ Reliability Score (0–100)
The score is built from:
- **Self-assessed ability** — what you claim you can do
- **Self-assessed availability** — how free you say you are
- **Actual performance** — what you actually deliver, rated by requesters

The gap between self-assessment and reality is shown openly. Users who consistently *underestimate* themselves are flagged as especially trustworthy. Users who *overestimate* see their score drift down over time. You can't fake your way to a high score.

**Levels:** 🌱 New → 📈 Rising → ✅ Trusted → ⭐ Expert → 🏆 Legendary

### 📍 Location-aware
- Listings are tagged to a city/neighborhood
- Preferred helper radius configurable per listing
- Distance between requester and helper is shown on every offer
- Farther helpers are noted — closeness is an advantage

### 🤝 Return the Favor
When a completed task results in a connection, either party can signal that a "return favor" is available. This keeps the relationship alive and turns one-off transactions into long-term community bonds.

### 🔔 Notifications
In-app notification center with unread badges for:
- New offers received
- Offer accepted / declined
- Return-favor opportunities
- New connections
- Ratings received

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | React 19 + TypeScript |
| Bundler | Vite 8 |
| Styling | Tailwind CSS v4 |
| Routing | React Router v7 |
| Icons | Lucide React |
| State | React Context + useState |
| Avatars | DiceBear Personas API |

---

## Getting Started

```bash
cd lend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

The app runs fully on **mock data** — no backend required. All state is held in React Context and resets on page refresh (by design for this prototype).

---

## Project Structure

```
lend/
├── src/
│   ├── types/          # TypeScript interfaces (User, Listing, Offer, etc.)
│   ├── data/           # Mock seed data + helper functions
│   ├── context/        # AppContext — global state + actions
│   ├── components/
│   │   ├── layout/     # Navbar, Footer
│   │   ├── common/     # Avatar, Badge variants, ReliabilityMeter
│   │   ├── listing/    # ListingCard
│   │   └── offer/      # OfferCard
│   └── pages/
│       ├── Home.tsx        # Landing + featured listings
│       ├── Browse.tsx      # Searchable listing grid
│       ├── ListingPage.tsx # Full task detail + offer form
│       ├── ProfilePage.tsx # User profile + reliability breakdown
│       ├── CreateListing.tsx # 3-step task creation wizard
│       └── Dashboard.tsx   # Personal task/offer/connection hub
```

---

## Design Philosophy

> "No one can be seen as too irresponsible. There's this notion of being careful and reasonable when betting for or against yourself."

Every interaction on Lend is an implicit bet. When you make an offer, you're betting that you can deliver. When you self-assess your ability at 90%, the platform remembers — and so does your score when reality is 60%. The system rewards **calibrated honesty**, not bravado.

This is community credit, earned slowly and lost quickly.
