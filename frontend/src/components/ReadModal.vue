<template>
  <Transition name="fade">
    <div class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-box card">
        <div class="modal-header">
          <h3>Mark as Read</h3>
          <button class="close-btn" @click="$emit('close')">✕</button>
        </div>

        <div class="modal-body">
          <div class="book-preview">
            <img
              v-if="book.coverId || book.cover_id"
              :src="`https://covers.openlibrary.org/b/id/${book.coverId || book.cover_id}-M.jpg`"
              :alt="book.title || book.book_title"
            />
            <div>
              <strong>{{ book.title || book.book_title }}</strong>
              <p>{{ book.authors?.join(', ') || book.bookAuthor || book.book_author }}</p>
            </div>
          </div>

          <div class="rating-section">
            <label>Your Rating</label>
            <div class="star-picker">
              <button
                v-for="n in 5"
                :key="n"
                class="star-btn"
                :class="{ filled: n <= rating }"
                @click="rating = n"
              >★</button>
            </div>
          </div>

          <div class="notes-section">
            <label>Notes (optional)</label>
            <textarea
              v-model="notes"
              class="input-field"
              placeholder="Your thoughts on this book..."
              rows="3"
            ></textarea>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-outline" @click="$emit('close')">Cancel</button>
          <button class="btn btn-primary" @click="submit">Save</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  book: { type: Object, required: true },
});

const emit = defineEmits(['close', 'confirm']);

const rating = ref(props.book.rating || 3);
const notes = ref(props.book.notes || '');

function submit() {
  emit('confirm', { rating: rating.value, notes: notes.value });
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(26,18,9,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-box {
  width: 100%;
  max-width: 440px;
  background: var(--paper);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.2rem 1.5rem;
  border-bottom: 1px solid var(--border);
}

.modal-header h3 {
  font-family: var(--font-display);
  font-size: 1.2rem;
}

.close-btn {
  color: var(--muted);
  font-size: 1rem;
  cursor: pointer;
  transition: color var(--transition);
}
.close-btn:hover { color: var(--ink); }

.modal-body { padding: 1.5rem; }

.book-preview {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 12px;
  background: var(--cream);
  border-radius: var(--radius);
}

.book-preview img {
  width: 48px;
  height: 68px;
  object-fit: cover;
  border-radius: 3px;
}

.book-preview strong {
  font-family: var(--font-display);
  font-size: 0.95rem;
  display: block;
}

.book-preview p {
  font-size: 0.82rem;
  color: var(--muted);
  margin-top: 2px;
}

.rating-section, .notes-section {
  margin-bottom: 1.2rem;
}

.rating-section label, .notes-section label {
  display: block;
  font-size: 0.82rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
  margin-bottom: 8px;
}

.star-picker {
  display: flex;
  gap: 6px;
}

.star-btn {
  font-size: 2rem;
  color: var(--border);
  cursor: pointer;
  transition: color var(--transition), transform var(--transition);
  line-height: 1;
}

.star-btn:hover, .star-btn.filled {
  color: var(--gold);
  transform: scale(1.1);
}

.modal-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border);
}
</style>
