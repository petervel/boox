<template>
  <div class="reading-list-view">
    <h1 class="section-title">Reading List</h1>

    <div class="stats-bar">
      <div class="stat">
        <span class="stat-num">{{ store.readBooks.length }}</span>
        <span class="stat-label">Books Read</span>
      </div>
      <div class="stat">
        <span class="stat-num">{{ avgRating }}</span>
        <span class="stat-label">Avg Rating</span>
      </div>
      <div class="stat">
        <span class="stat-num">{{ fiveStars }}</span>
        <span class="stat-label">Five Stars</span>
      </div>
    </div>

    <div v-if="store.readBooks.length === 0" class="empty-state">
      <div class="icon">📖</div>
      <p>No books marked as read yet. Start tracking your reading!</p>
    </div>

    <div v-else>
      <div class="filter-bar">
        <select v-model="filterRating" class="input-field filter-select">
          <option value="">All ratings</option>
          <option v-for="n in 5" :key="n" :value="n">{{ n }} ★+</option>
        </select>
        <input v-model="filterQuery" class="input-field filter-search" placeholder="Filter by title..." />
      </div>

      <div class="read-list">
        <div v-for="book in filteredBooks" :key="book.id" class="read-item card">
          <div class="cover-area">
            <img
              v-if="book.cover_id"
              :src="`https://covers.openlibrary.org/b/id/${book.cover_id}-M.jpg`"
              :alt="book.book_title"
            />
            <div v-else class="no-cover">📚</div>
          </div>

          <div class="read-details">
            <h3>{{ book.book_title }}</h3>
            <p class="author">{{ book.book_author }}</p>
            <p v-if="book.first_publish_year" class="year">{{ book.first_publish_year }}</p>

            <div class="star-picker">
              <button
                v-for="n in 5"
                :key="n"
                :class="['star-btn', n <= (editRatings[book.id] ?? book.rating) ? 'filled' : '']"
                @click="updateRating(book, n)"
              >★</button>
            </div>

            <p v-if="book.notes" class="notes">{{ book.notes }}</p>
          </div>

          <div class="read-actions">
            <p class="read-date">{{ formatDate(book.read_at) }}</p>
            <button class="btn btn-sm btn-outline remove-btn" @click="store.unmarkAsRead(book.book_key)">
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useBooksStore } from '../stores/books.js';
import api from '../composables/useApi.js';

const store = useBooksStore();

const filterRating = ref('');
const filterQuery = ref('');
const editRatings = ref({});

const avgRating = computed(() => {
  const rated = store.readBooks.filter(b => b.rating);
  if (!rated.length) return '—';
  const avg = rated.reduce((s, b) => s + b.rating, 0) / rated.length;
  return avg.toFixed(1);
});

const fiveStars = computed(() => store.readBooks.filter(b => b.rating === 5).length);

const filteredBooks = computed(() =>
  store.readBooks.filter(b => {
    if (filterRating.value && b.rating < filterRating.value) return false;
    if (filterQuery.value && !b.book_title.toLowerCase().includes(filterQuery.value.toLowerCase())) return false;
    return true;
  })
);

async function updateRating(book, rating) {
  editRatings.value[book.id] = rating;
  await api.post('/books/read', {
    bookKey: book.book_key,
    bookTitle: book.book_title,
    bookAuthor: book.book_author,
    coverId: book.cover_id,
    firstPublishYear: book.first_publish_year,
    rating,
    notes: book.notes,
  });
  book.rating = rating;
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
</script>

<style scoped>
.reading-list-view { padding: 2.5rem; max-width: 900px; }

.stats-bar {
  display: flex;
  gap: 20px;
  margin-bottom: 2rem;
}

.stat {
  background: white;
  border-radius: var(--radius-lg);
  padding: 16px 24px;
  box-shadow: 0 2px 8px var(--shadow);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 1;
}

.stat-num {
  font-family: var(--font-display);
  font-size: 2rem;
  font-weight: 700;
  color: var(--ink);
}

.stat-label { font-size: 0.8rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }

.filter-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.filter-select { width: 160px; }
.filter-search { flex: 1; min-width: 160px; }

.read-list { display: flex; flex-direction: column; gap: 12px; }

.read-item {
  display: flex;
  gap: 16px;
  padding: 16px;
  align-items: flex-start;
}

.cover-area { flex-shrink: 0; }
.cover-area img, .no-cover {
  width: 65px;
  height: 92px;
  object-fit: cover;
  border-radius: 4px;
}

.no-cover {
  background: var(--cream);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.read-details { flex: 1; min-width: 0; }
.read-details h3 { font-family: var(--font-display); font-size: 1rem; margin-bottom: 4px; }
.author, .year { font-size: 0.82rem; color: var(--muted); }

.star-picker {
  display: flex;
  gap: 2px;
  margin: 8px 0;
}

.star-btn {
  font-size: 1.3rem;
  color: var(--border);
  cursor: pointer;
  transition: color var(--transition), transform var(--transition);
}

.star-btn:hover, .star-btn.filled { color: var(--gold); }
.star-btn:hover { transform: scale(1.15); }

.notes { font-size: 0.82rem; color: var(--muted); font-style: italic; margin-top: 4px; }

.read-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  flex-shrink: 0;
}

.read-date { font-size: 0.75rem; color: var(--muted); }

@media (max-width: 640px) { .reading-list-view { padding: 1.5rem; } .stats-bar { gap: 10px; } }
</style>
