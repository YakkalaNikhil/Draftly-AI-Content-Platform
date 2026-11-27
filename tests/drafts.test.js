import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DRAFTS_STORAGE_KEY,
  MAX_SAVED_DRAFTS,
  loadSavedDrafts,
  makeDraftTitle,
  saveSavedDrafts,
} from '../src/drafts.js'

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null },
    setItem(key, value) { values.set(key, String(value)) },
    values,
  }
}

test('drafts persist and restore with inputs/settings after a simulated refresh', () => {
  const storage = createStorage()
  const draft = {
    id: 'draft-1',
    task: 'generate',
    title: 'Java course completion',
    text: 'I completed a Java programming course in September 2026.',
    createdAt: '2026-10-24T03:00:00.000Z',
    topic: 'I completed a Java programming course in September 2026.',
    sourceText: '',
    contentType: 'LinkedIn post',
    tone: 'Professional',
    length: 'Medium',
    audience: 'Students',
    selectedPlatforms: ['LinkedIn'],
  }

  assert.equal(saveSavedDrafts([draft], storage), true)
  const restored = loadSavedDrafts(storage)
  assert.deepEqual(restored, [draft])
  assert.equal(restored[0].text, draft.text)
  assert.equal(restored[0].topic, draft.topic)
  assert.equal(restored[0].contentType, 'LinkedIn post')
  assert.deepEqual(restored[0].selectedPlatforms, ['LinkedIn'])
})

test('draft history is capped at the most recent 30 items', () => {
  const storage = createStorage()
  const drafts = Array.from({ length: MAX_SAVED_DRAFTS + 5 }, (_, index) => ({
    id: `draft-${index}`,
    text: `Content ${index}`,
  }))
  assert.equal(saveSavedDrafts(drafts, storage), true)
  const restored = loadSavedDrafts(storage)
  assert.equal(restored.length, MAX_SAVED_DRAFTS)
  assert.equal(restored[0].id, 'draft-0')
})

test('invalid or malformed localStorage data safely returns an empty history', () => {
  const originalWarn = console.warn
  console.warn = () => {}
  try {
    const malformed = createStorage({ [DRAFTS_STORAGE_KEY]: '{not-json' })
    assert.deepEqual(loadSavedDrafts(malformed), [])
    const wrongShape = createStorage({ [DRAFTS_STORAGE_KEY]: JSON.stringify({ id: 'not-an-array' }) })
    assert.deepEqual(loadSavedDrafts(wrongShape), [])
  } finally {
    console.warn = originalWarn
  }
})

test('draft titles are compact and fall back when source text is empty', () => {
  assert.equal(makeDraftTitle('generate', '  Java   course  ', ''), 'Java course')
  assert.equal(makeDraftTitle('rewrite', '', 'A rewrite request'), 'A rewrite request')
  assert.equal(makeDraftTitle('generate', '', ''), 'Untitled draft')
})
