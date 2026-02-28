<template>
  <div class="book-card card">
    <div class="cover-wrapper">
      <img
        v-if="book.coverId"
        :src="`https://covers.openlibrary.org/b/id/${book.coverId}-M.jpg`"
        :alt="book.title"
        class="cover-img"
        loading="lazy"
      />
      <div v-else class="cover-placeholder">
        <span>📚</span>
      </div>
    </div>
    
    <div class="book-info">
      <h3 class="book-title">{{ book.title }}</h3>
      <p class="book-author">{{ authorDisplay }}</p>
      
      <div class="book-meta">
        <span v-if="book.firstPublishYear" class="tag">{{ book.firstPublishYear }}</span>
        <span v-if="book.languages?.length" class="tag">{{ book.languages[0] }}</span>
      </div>

      <div v-if="readEntry" class="read-badge">
        <span class="star-row">
          <span v-for="n in 5" :key="n" :class="['star-icon', n <= readEntry.rating ? 'filled' : '']">★</span>
        </span>
        <span class="read-label">Read</span>
      </div>

      <div class="book-actions">
        <button 
          class="btn btn-sm"
          :class="isFavorite ? 'btn-gold' : 'btn-outline'"
          @click.stop="$emit('toggle-favorite', book)"
        >
          {{ isFavorite ? '❤️ Saved' : '♡ Save' }}
        </button>
        
        <button 
          class="btn btn-sm"
          :class="readEntry ? 'btn-primary' : 'btn-outline'"
          @click.stop="$emit('toggle-read', book)"
        >
          {{ readEntry ? '✓ Read' : '+ Mark read' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useBooksStore } from '../stores/books.js';

const props = defineProps({
  book: { type: Object, required: true },
});

defineEmits(['toggle-favorite', 'toggle-read']);

const store = useBooksStore();

const authorDisplay = computed(() =>
  Array.isArray(props.book.authors)
    ? props.book.authors.slice(0, 2).join(', ')
    : props.book.bookAuthor || props.book.book_author || ''
);

const isFavorite = computed(() => store.isBookFavorite(props.book.key || props.book.book_key));
const readEntry = computed(() => store.isBookRead(props.book.key || props.book.book_key));
</script>

<style scoped>
.book-card {
  display: flex;
  gap: 14px;
  padding: 14px;
  transition: transform var(--transition), box-shadow var(--transition);
}

.book-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px var(--shadow-lg);
}

.cover-wrapper {
  flex-shrink: 0;
  width: 70px;
}

.cover-img {
  width: 70px;
  height: 100px;
  object-fit: cover;
  border-radius: 4px;
  box-shadow: 2px 2px 8px var(--shadow);
}

.cover-placeholder {
  width: 70px;
  height: 100px;
  background: var(--cream);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  border: 1px solid var(--border);
}

.book-info {
  flex: 1;
  min-width: 0;
}

.book-title {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.3;
  margin-bottom: 4px;
  color: var(--ink);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.book-author {
  font-size: 0.85rem;
  color: var(--muted);
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.book-meta {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.read-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.star-row { display: flex; }
.star-icon { color: var(--border); font-size: 0.9rem; }
.star-icon.filled { color: var(--gold); }
.read-label { font-size: 0.75rem; color: var(--forest); font-weight: 500; }

.book-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
</style>
