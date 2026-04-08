import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import api, { ApiError } from '../../lib/api';

// ── helpers ────────────────────────────────────────────────────────────────────

function mockFetch(status, body) {
  const response = {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    json: vi.fn().mockResolvedValue(body),
  };
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
  return response;
}

beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
afterEach(() => { vi.unstubAllGlobals(); });

// ── ApiError ───────────────────────────────────────────────────────────────────

describe('ApiError', () => {
  it('stores status and detail', () => {
    const err = new ApiError('GET', '/api/foo', 404, 'Not found');
    expect(err.status).toBe(404);
    expect(err.detail).toBe('Not found');
    expect(err.message).toBe('GET /api/foo → 404');
    expect(err instanceof Error).toBe(true);
  });
});

// ── api.get ────────────────────────────────────────────────────────────────────

describe('api.get', () => {
  it('returns parsed JSON on success', async () => {
    mockFetch(200, { seeds: [] });
    const result = await api.get('/api/seeds');
    expect(result).toEqual({ seeds: [] });
  });

  it('throws ApiError with detail on 4xx', async () => {
    mockFetch(404, { detail: 'Not found' });
    await expect(api.get('/api/seeds/999')).rejects.toMatchObject({
      status: 404,
      detail: 'Not found',
    });
  });

  it('throws ApiError with detail on 500', async () => {
    mockFetch(500, { detail: 'Internal server error' });
    await expect(api.get('/api/seeds')).rejects.toMatchObject({ status: 500 });
  });

  it('joins array detail messages using msg property', async () => {
    mockFetch(422, { detail: [{ msg: 'field required' }, { msg: 'invalid value' }] });
    const err = await api.get('/api/seeds').catch(e => e);
    expect(err.detail).toBe('field required, invalid value');
  });

  it('joins array detail messages falling back to String(d) when msg is absent', async () => {
    mockFetch(422, { detail: ['bad input', 'missing field'] });
    const err = await api.get('/api/seeds').catch(e => e);
    expect(err.detail).toBe('bad input, missing field');
  });

  it('uses fallback detail when body.detail is absent', async () => {
    mockFetch(503, {});
    const err = await api.get('/api/seeds').catch(e => e);
    expect(err.detail).toMatch(/503/);
  });
});

// ── api.post ───────────────────────────────────────────────────────────────────

describe('api.post', () => {
  it('sends JSON body and returns parsed response', async () => {
    mockFetch(201, { id: 1 });
    const result = await api.post('/api/plantings', { seed_id: 'abc' });
    expect(result).toEqual({ id: 1 });
    expect(fetch).toHaveBeenCalledWith('/api/plantings', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seed_id: 'abc' }),
    }));
  });

  it('throws ApiError on 422', async () => {
    mockFetch(422, { detail: 'Validation error' });
    await expect(api.post('/api/plantings', {})).rejects.toMatchObject({
      status: 422,
      detail: 'Validation error',
    });
  });
});

// ── api.put ────────────────────────────────────────────────────────────────────

describe('api.put', () => {
  it('sends PUT with JSON body', async () => {
    mockFetch(200, { updated: true });
    const result = await api.put('/api/plantings/1', { status: 'done' });
    expect(result).toEqual({ updated: true });
    expect(fetch).toHaveBeenCalledWith('/api/plantings/1', expect.objectContaining({
      method: 'PUT',
    }));
  });

  it('throws ApiError on error response', async () => {
    mockFetch(400, { detail: 'Bad request' });
    await expect(api.put('/api/plantings/1', {})).rejects.toMatchObject({ status: 400 });
  });
});

// ── api.del ────────────────────────────────────────────────────────────────────

describe('api.del', () => {
  it('sends DELETE and returns response', async () => {
    mockFetch(200, { message: 'Deleted' });
    const result = await api.del('/api/plantings/1');
    expect(result).toEqual({ message: 'Deleted' });
    expect(fetch).toHaveBeenCalledWith('/api/plantings/1', { method: 'DELETE' });
  });

  it('returns null for 204 No Content without calling json()', async () => {
    const response = {
      ok: true,
      status: 204,
      headers: { get: () => null },
      json: vi.fn(),
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
    const result = await api.del('/api/plantings/1');
    expect(result).toBeNull();
    expect(response.json).not.toHaveBeenCalled();
  });

  it('returns null when content-length is 0', async () => {
    const response = {
      ok: true,
      status: 200,
      headers: { get: (h) => h === 'content-length' ? '0' : null },
      json: vi.fn(),
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
    const result = await api.get('/api/something');
    expect(result).toBeNull();
    expect(response.json).not.toHaveBeenCalled();
  });

  it('throws ApiError on 404', async () => {
    mockFetch(404, { detail: 'Not found' });
    await expect(api.del('/api/plantings/999')).rejects.toMatchObject({ status: 404 });
  });
});

// ── api.patch ──────────────────────────────────────────────────────────────────

describe('api.patch', () => {
  it('sends PATCH with JSON body', async () => {
    mockFetch(200, { ok: true });
    await api.patch('/api/foo/1', { x: 1 });
    expect(fetch).toHaveBeenCalledWith('/api/foo/1', expect.objectContaining({
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
    }));
  });

  it('throws ApiError on error', async () => {
    mockFetch(500, { detail: 'Server error' });
    await expect(api.patch('/api/foo/1', {})).rejects.toMatchObject({ status: 500 });
  });
});

// ── api.upload ─────────────────────────────────────────────────────────────────

describe('api.upload', () => {
  it('sends POST with FormData (no Content-Type header)', async () => {
    mockFetch(201, { filename: 'photo.jpg' });
    const fd = new FormData();
    fd.append('file', new File(['x'], 'photo.jpg'));
    const result = await api.upload('/api/photos', fd);
    expect(result).toEqual({ filename: 'photo.jpg' });
    expect(fetch).toHaveBeenCalledWith('/api/photos', expect.objectContaining({
      method: 'POST',
      body: fd,
    }));
    // Should NOT set Content-Type (browser sets multipart boundary automatically)
    const callArgs = fetch.mock.calls[0][1];
    expect(callArgs.headers).toBeUndefined();
  });

  it('throws ApiError on upload failure', async () => {
    mockFetch(413, { detail: 'File too large' });
    await expect(api.upload('/api/photos', new FormData())).rejects.toMatchObject({
      status: 413,
      detail: 'File too large',
    });
  });
});

// ── json parse failure in error body ──────────────────────────────────────────

describe('handleResponse — unparseable error body', () => {
  it('uses fallback detail when json() rejects', async () => {
    const response = {
      ok: false,
      status: 503,
      headers: { get: () => null },
      json: vi.fn().mockRejectedValue(new Error('not json')),
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
    const err = await api.get('/api/seeds').catch(e => e);
    expect(err.detail).toMatch(/503/);
  });
});
