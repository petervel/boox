# 📚 Bookshelf

A full-stack book discovery and tracking app with a Tinder-style recommendation swiper.

## Stack

- **Frontend**: Vue 3 + Pinia + Vue Router (Vite)
- **Backend**: Express.js (Node 20, ESM)
- **Database**: MySQL 8
- **Proxy**: Nginx (production only)
- **Data**: [Open Library API](https://openlibrary.org/developers/api)

---

## Features

- 🔍 Search books and authors with language filters
- ❤️ Favorite books and follow authors
- ✅ Mark books as read with star ratings and notes
- 📋 See unread books by your favorite authors
- ✨ Tinder-style swipe UI for personalized recommendations
- 👥 Recommendations powered by other users' ratings (collaborative filtering)

---

## Development (live reload)

```bash
# 1. Start all services
docker compose -f docker-compose.dev.yml up --build

# Frontend: http://localhost:5173
# Backend:  http://localhost:3001
```

Code changes in `backend/src/` and `frontend/src/` automatically reload.

---

## Production (books.petervel.nl)

### Prerequisites

- Docker + Docker Compose on your server
- Domain `books.petervel.nl` pointing to your server
- SSL certificate (Let's Encrypt recommended)

### SSL Setup (first time)

```bash
# Install certbot and get a certificate
sudo apt install certbot
sudo certbot certonly --standalone -d books.petervel.nl
```

### Deploy

```bash
# 1. Copy .env.example to .env and set secrets
cp .env.example .env
nano .env

# 2. Build and start production stack
docker compose -f docker-compose.prod.yml up --build -d

# The app runs on port 80 (HTTP redirects to HTTPS)
```

### Without SSL (HTTP only)

If you don't have SSL yet, use the HTTP-only nginx config by editing `nginx/nginx.prod.conf` to remove the SSL server block and change the redirect server to listen directly on 80.

---

## Project Structure

```
bookshelf/
├── docker-compose.dev.yml      # Development stack
├── docker-compose.prod.yml     # Production stack
├── .env.example                # Environment template
│
├── backend/
│   ├── Dockerfile.dev
│   ├── Dockerfile.prod
│   ├── package.json
│   └── src/
│       ├── index.js            # Express app entry
│       ├── db/
│       │   ├── connection.js   # MySQL pool
│       │   └── init.sql        # Schema
│       ├── middleware/
│       │   └── auth.js         # JWT middleware
│       └── routes/
│           ├── auth.js         # Login/register
│           ├── books.js        # Search, favorites, read list
│           ├── authors.js      # Author search + favorites
│           └── recommendations.js  # Swipe + collab filtering
│
├── frontend/
│   ├── Dockerfile.dev
│   ├── Dockerfile.prod
│   ├── nginx.frontend.conf     # SPA nginx config for prod container
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.js
│       ├── App.vue
│       ├── assets/global.css   # Design system (CSS variables)
│       ├── router/index.js
│       ├── stores/
│       │   ├── auth.js         # Pinia auth store
│       │   └── books.js        # Pinia books/favorites store
│       ├── composables/
│       │   └── useApi.js       # Axios instance + interceptors
│       ├── components/
│       │   ├── BookCard.vue    # Reusable book card
│       │   └── ReadModal.vue   # Rate/mark as read modal
│       └── views/
│           ├── LoginView.vue
│           ├── RegisterView.vue
│           ├── Layout.vue      # App shell with sidebar nav
│           ├── SearchView.vue  # Book/author search with filters
│           ├── FavoritesView.vue  # Favorites + unread by authors
│           ├── ReadingListView.vue  # Read books with ratings
│           └── DiscoverView.vue    # 🃏 Tinder swipe interface
│
└── nginx/
    └── nginx.prod.conf         # Reverse proxy for production
```

---

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Get JWT token |

### Books
| Method | Path | Description |
|--------|------|-------------|
| GET | `/books/search?q=&language=&page=` | Search Open Library |
| GET | `/books/details/:key` | Book details + description |
| GET/POST/DELETE | `/books/favorites` | Manage favorite books |
| GET/POST/DELETE | `/books/read` | Manage read list + ratings |

### Authors
| Method | Path | Description |
|--------|------|-------------|
| GET | `/authors/search?q=` | Search authors |
| GET/POST/DELETE | `/authors/favorites` | Manage followed authors |
| GET | `/authors/unread-works` | Unread by favorite authors |

### Recommendations
| Method | Path | Description |
|--------|------|-------------|
| GET | `/recommendations` | Get personalized book deck |
| POST | `/recommendations/swipe` | Record swipe + auto-save likes |
