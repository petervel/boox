import express from 'express';
import axios from 'axios';
import pool from '../db/connection.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Shared identified OL client (3x rate limit with User-Agent)
const olClient = axios.create({
  baseURL: 'https://openlibrary.org',
  timeout: 12000,
  headers: {
    'User-Agent': 'Bookshelf/1.0 (openlibrary@example.com)',
  },
});

/**
 * The Author Search API (GET /search/authors.json) returns docs where `key`
 * is the bare OLID without prefix, e.g. "OL23919A".
 * The Authors REST API (GET /authors/{id}.json and /authors/{id}/works.json)
 * requires the full path "/authors/OL23919A".
 *
 * We always store and return the full "/authors/OL23919A" form so that
 * the frontend and the works endpoint can use it directly.
 */
function normaliseAuthorKey(key) {
  if (!key) return key;
  if (key.startsWith('/authors/')) return key;
  return `/authors/${key}`;
}

// ─── Search authors ───────────────────────────────────────────────────────────
// GET /search/authors.json?q=&limit=&offset=
// Returns { numFound, docs: [{ key, name, birth_date, top_work, work_count, top_subjects, photos }] }
// Note: `key` in results is bare OLID (e.g. "OL23919A") — we normalise it.
router.get('/search', authenticate, async (req, res) => {
  try {
    const { q } = req.query;
    const pageNum = Math.max(1, parseInt(req.query.page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    if (!q) return res.json({ authors: [], total: 0 });

    const { data } = await olClient.get('/search/authors.json', {
      params: {
        q: q.trim(),
        limit: limitNum,
        offset: (pageNum - 1) * limitNum,
      },
    });

    const authors = (data.docs || []).map(a => ({
      key: normaliseAuthorKey(a.key),  // normalise to /authors/OL23919A
      name: a.name,
      birthDate: a.birth_date || null,
      topWork: a.top_work || null,
      workCount: a.work_count || 0,
      topSubjects: (a.top_subjects || []).slice(0, 5),
      // photos[] contains numeric IDs used with the Covers API:
      // https://covers.openlibrary.org/a/id/{photo_id}-M.jpg
      photos: a.photos || [],
    }));

    res.json({ authors, total: data.numFound || 0 });
  } catch (err) {
    console.error('Author search error:', err.message);
    res.status(500).json({ error: 'Author search failed' });
  }
});

// ─── Favorite authors ─────────────────────────────────────────────────────────

router.get('/favorites', authenticate, async (req, res) => {
  const [rows] = await pool.execute(
    'SELECT * FROM favorite_authors WHERE user_id = ? ORDER BY added_at DESC',
    [req.user.id]
  );
  res.json(rows);
});

router.post('/favorites', authenticate, async (req, res) => {
  try {
    const { authorKey, authorName, birthDate, bio, photoId } = req.body;
    // Ensure we always store the normalised full-path key
    const normKey = normaliseAuthorKey(authorKey);
    await pool.execute(
      'INSERT IGNORE INTO favorite_authors (user_id, author_key, author_name, birth_date, bio, photo_id) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, normKey, authorName, birthDate || null, bio || null, photoId || null]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Add favourite author error:', err.message);
    res.status(500).json({ error: 'Could not add author favourite' });
  }
});

router.delete('/favorites/:authorKey(*)', authenticate, async (req, res) => {
  // The key arrives URL-encoded; decode and normalise before matching
  const normKey = normaliseAuthorKey(decodeURIComponent(req.params.authorKey));
  await pool.execute(
    'DELETE FROM favorite_authors WHERE user_id = ? AND author_key = ?',
    [req.user.id, normKey]
  );
  res.json({ success: true });
});

// ─── Unread works by favourite authors ───────────────────────────────────────
// For each followed author we call GET /authors/{id}/works.json
// and filter out books the user has already read.
// We cap at 5 authors to stay within rate limits.
router.get('/unread-works', authenticate, async (req, res) => {
  try {
    const [favAuthors] = await pool.execute(
      'SELECT author_key, author_name FROM favorite_authors WHERE user_id = ?',
      [req.user.id]
    );

    if (!favAuthors.length) return res.json([]);

    const [readBooks] = await pool.execute(
      'SELECT book_key FROM read_books WHERE user_id = ?',
      [req.user.id]
    );
    const readKeys = new Set(readBooks.map(r => r.book_key));

    const results = [];
    for (const author of favAuthors.slice(0, 5)) {
      try {
        // author_key is stored as /authors/OL23919A — works endpoint is:
        // GET /authors/OL23919A/works.json
        const { data } = await olClient.get(`${author.author_key}/works.json`, {
          params: { limit: 15 },
        });

        const unread = (data.entries || [])
          .filter(w => w.key && !readKeys.has(w.key))
          .map(w => ({
            key: w.key,           // full path, e.g. /works/OL45804W
            title: w.title,
            covers: w.covers || [],
            authorName: author.author_name,
            authorKey: author.author_key,
          }));

        results.push(...unread);
      } catch (err) {
        // Silently skip individual author failures so the rest still load
        console.warn(`Could not fetch works for ${author.author_key}:`, err.message);
      }
    }

    res.json(results.slice(0, 50));
  } catch (err) {
    console.error('Unread works error:', err.message);
    res.status(500).json({ error: 'Could not fetch unread works' });
  }
});

export default router;
