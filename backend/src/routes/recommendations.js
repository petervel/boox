import express from 'express';
import axios from 'axios';
import pool from '../db/connection.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const olClient = axios.create({
  baseURL: 'https://openlibrary.org',
  timeout: 10000,
  headers: { 'User-Agent': 'Bookshelf/1.0 (openlibrary@example.com)' },
});

// Search results return full paths e.g. "/works/OL45804W" but normalise defensively
function normaliseWorkKey(key) {
  if (!key) return key;
  if (key.startsWith('/works/')) return key;
  return `/works/${key}`;
}

// OL description/bio can be a plain string or { type, value }
function extractText(field) {
  if (!field) return '';
  if (typeof field === 'string') return field;
  if (typeof field === 'object' && field.value) return field.value;
  return '';
}

// Get recommendations for swipe interface
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Books the user has already swiped on
    const [swiped] = await pool.execute(
      'SELECT book_key FROM swipe_decisions WHERE user_id = ?',
      [userId]
    );
    const swipedKeys = new Set(swiped.map(s => s.book_key));

    // Highly rated books from other users (collaborative filtering)
    const [popularBooks] = await pool.execute(
      `SELECT rb.book_key, rb.book_title, rb.book_author, rb.cover_id, rb.first_publish_year,
              AVG(rb.rating) as avg_rating, COUNT(*) as read_count
       FROM read_books rb
       WHERE rb.user_id != ? AND rb.rating >= 4
       GROUP BY rb.book_key
       ORDER BY avg_rating DESC, read_count DESC
       LIMIT 50`,
      [userId]
    );

    // Books liked (swiped right) by other users
    const [likedByOthers] = await pool.execute(
      `SELECT sd.book_key, fb.book_title, fb.book_author, fb.cover_id, fb.first_publish_year,
              COUNT(*) as like_count
       FROM swipe_decisions sd
       LEFT JOIN favorite_books fb ON fb.book_key = sd.book_key
       WHERE sd.decision = 'like' AND sd.user_id != ?
       GROUP BY sd.book_key
       ORDER BY like_count DESC
       LIMIT 30`,
      [userId]
    );

    // Merge candidates, skipping already-swiped books
    const candidates = new Map();
    [...popularBooks, ...likedByOthers].forEach(b => {
      if (b.book_key && !swipedKeys.has(b.book_key) && !candidates.has(b.book_key)) {
        candidates.set(b.book_key, b);
      }
    });

    // Cold-start fallback: fetch popular books from a random subject via OL search.
    // Only use confirmed valid Solr field names to avoid 422 errors.
    // `subject` is a dedicated query param (not embedded in `q`).
    // `sort=editions` sorts by edition count — a reliable popularity proxy.
    if (candidates.size < 10) {
      const subjects = ['fiction', 'mystery', 'fantasy', 'biography', 'science'];
      const subject = subjects[Math.floor(Math.random() * subjects.length)];

      try {
        const { data } = await olClient.get('/search.json', {
          params: {
            subject,
            sort: 'editions',
            limit: 30,
            fields: 'key,title,author_name,author_key,cover_i,first_publish_year,edition_count',
          },
        });

        (data.docs || []).forEach(b => {
          const key = normaliseWorkKey(b.key);
          if (key && !swipedKeys.has(key) && !candidates.has(key)) {
            candidates.set(key, {
              book_key: key,
              book_title: b.title,
              book_author: (b.author_name || []).join(', '),
              cover_id: b.cover_i || null,
              first_publish_year: b.first_publish_year || null,
              author_key: (b.author_key || [])[0] || null,
            });
          }
        });
      } catch (err) {
        const detail = err.response?.data ? JSON.stringify(err.response.data).slice(0, 200) : '';
        console.warn(`Fallback OL search failed ${err.response?.status}: ${err.message} ${detail}`);
      }
    }

    // Fetch descriptions from the Works REST API for top candidates
    const topCandidates = Array.from(candidates.values()).slice(0, 20);
    const enriched = await Promise.all(
      topCandidates.map(async (book) => {
        try {
          const { data } = await olClient.get(`${book.book_key}.json`);
          return { ...book, description: extractText(data.description).slice(0, 300) };
        } catch (_) {
          return { ...book, description: '' };
        }
      })
    );

    res.json(enriched);
  } catch (err) {
    console.error('Recommendation error:', err.message);
    res.status(500).json({ error: 'Could not generate recommendations' });
  }
});

// Record swipe decision
router.post('/swipe', authenticate, async (req, res) => {
  try {
    const { bookKey, decision, bookTitle, bookAuthor, coverId, firstPublishYear } = req.body;

    await pool.execute(
      `INSERT INTO swipe_decisions (user_id, book_key, decision)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE decision = VALUES(decision)`,
      [req.user.id, bookKey, decision]
    );

    if (decision === 'like') {
      await pool.execute(
        `INSERT IGNORE INTO favorite_books (user_id, book_key, book_title, book_author, cover_id, first_publish_year)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [req.user.id, bookKey, bookTitle, bookAuthor, coverId || null, firstPublishYear || null]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Swipe error:', err.message);
    res.status(500).json({ error: 'Could not record swipe' });
  }
});

export default router;
