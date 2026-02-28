import { defineStore } from 'pinia';
import { ref } from 'vue';
import api from '../composables/useApi.js';

export const useBooksStore = defineStore('books', () => {
  const favoriteBooks = ref([]);
  const favoriteAuthors = ref([]);
  const readBooks = ref([]);

  async function loadFavoriteBooks() {
    const { data } = await api.get('/books/favorites');
    favoriteBooks.value = data;
  }

  async function loadFavoriteAuthors() {
    const { data } = await api.get('/authors/favorites');
    favoriteAuthors.value = data;
  }

  async function loadReadBooks() {
    const { data } = await api.get('/books/read');
    readBooks.value = data;
  }

  async function addFavoriteBook(book) {
    await api.post('/books/favorites', book);
    await loadFavoriteBooks();
  }

  async function removeFavoriteBook(bookKey) {
    await api.delete(`/books/favorites/${encodeURIComponent(bookKey)}`);
    favoriteBooks.value = favoriteBooks.value.filter(b => b.book_key !== bookKey);
  }

  async function addFavoriteAuthor(author) {
    await api.post('/authors/favorites', author);
    await loadFavoriteAuthors();
  }

  async function removeFavoriteAuthor(authorKey) {
    await api.delete(`/authors/favorites/${encodeURIComponent(authorKey)}`);
    favoriteAuthors.value = favoriteAuthors.value.filter(a => a.author_key !== authorKey);
  }

  async function markAsRead(book) {
    await api.post('/books/read', book);
    await loadReadBooks();
  }

  async function unmarkAsRead(bookKey) {
    await api.delete(`/books/read/${encodeURIComponent(bookKey)}`);
    readBooks.value = readBooks.value.filter(b => b.book_key !== bookKey);
  }

  function isBookFavorite(bookKey) {
    return favoriteBooks.value.some(b => b.book_key === bookKey);
  }

  function isAuthorFavorite(authorKey) {
    return favoriteAuthors.value.some(a => a.author_key === authorKey);
  }

  function isBookRead(bookKey) {
    return readBooks.value.find(b => b.book_key === bookKey);
  }

  function loadAll() {
    return Promise.all([loadFavoriteBooks(), loadFavoriteAuthors(), loadReadBooks()]);
  }

  return {
    favoriteBooks, favoriteAuthors, readBooks,
    loadAll, loadFavoriteBooks, loadFavoriteAuthors, loadReadBooks,
    addFavoriteBook, removeFavoriteBook,
    addFavoriteAuthor, removeFavoriteAuthor,
    markAsRead, unmarkAsRead,
    isBookFavorite, isAuthorFavorite, isBookRead,
  };
});
