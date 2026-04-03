import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import usePhotos from '../../hooks/usePhotos';

vi.mock('../../lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
    patch: vi.fn(),
  },
}));

import api from '../../lib/api';

describe('usePhotos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => usePhotos());
    expect(result.current.allPhotos).toEqual([]);
    expect(result.current.photosGrouping).toBe('time');
    expect(result.current.photosLightboxIndex).toBeNull();
  });

  it('loadAllPhotos fetches from /api/photos and sets allPhotos', async () => {
    const photos = [{ id: 1, filename: 'a.jpg' }];
    api.get.mockResolvedValue(photos);

    const { result } = renderHook(() => usePhotos());
    await act(async () => {
      await result.current.loadAllPhotos();
    });

    expect(api.get).toHaveBeenCalledWith('/api/photos');
    expect(result.current.allPhotos).toEqual(photos);
  });

  it('setPhotosGrouping updates grouping state', () => {
    const { result } = renderHook(() => usePhotos());
    act(() => {
      result.current.setPhotosGrouping('planting');
    });
    expect(result.current.photosGrouping).toBe('planting');
  });

  it('setPhotosLightboxIndex sets the lightbox index', () => {
    const { result } = renderHook(() => usePhotos());
    act(() => {
      result.current.setPhotosLightboxIndex(2);
    });
    expect(result.current.photosLightboxIndex).toBe(2);
  });

  it('ArrowRight key increments photosLightboxIndex', () => {
    api.get.mockResolvedValue([]);
    const { result } = renderHook(() => usePhotos());

    act(() => {
      result.current.setAllPhotos([{ id: 1 }, { id: 2 }, { id: 3 }]);
      result.current.setPhotosLightboxIndex(0);
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    });

    expect(result.current.photosLightboxIndex).toBe(1);
  });

  it('ArrowRight does not exceed last index', () => {
    const { result } = renderHook(() => usePhotos());

    act(() => {
      result.current.setAllPhotos([{ id: 1 }, { id: 2 }]);
      result.current.setPhotosLightboxIndex(1);
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    });

    expect(result.current.photosLightboxIndex).toBe(1);
  });

  it('ArrowLeft key decrements photosLightboxIndex', () => {
    const { result } = renderHook(() => usePhotos());

    act(() => {
      result.current.setAllPhotos([{ id: 1 }, { id: 2 }, { id: 3 }]);
      result.current.setPhotosLightboxIndex(2);
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    });

    expect(result.current.photosLightboxIndex).toBe(1);
  });

  it('ArrowLeft does not go below 0', () => {
    const { result } = renderHook(() => usePhotos());

    act(() => {
      result.current.setAllPhotos([{ id: 1 }, { id: 2 }]);
      result.current.setPhotosLightboxIndex(0);
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    });

    expect(result.current.photosLightboxIndex).toBe(0);
  });

  it('Escape key closes lightbox by setting index to null', () => {
    const { result } = renderHook(() => usePhotos());

    act(() => {
      result.current.setPhotosLightboxIndex(1);
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });

    expect(result.current.photosLightboxIndex).toBeNull();
  });

  it('does not attach keyboard listener when index is null', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const { result } = renderHook(() => usePhotos());

    // photosLightboxIndex starts as null — no listener should be added for keydown
    const keydownCalls = addSpy.mock.calls.filter(([event]) => event === 'keydown');
    expect(keydownCalls).toHaveLength(0);

    addSpy.mockRestore();
  });

  it('removes keyboard listener when lightbox closes', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { result } = renderHook(() => usePhotos());

    act(() => {
      result.current.setPhotosLightboxIndex(0);
    });

    act(() => {
      result.current.setPhotosLightboxIndex(null);
    });

    const keydownRemovals = removeSpy.mock.calls.filter(([event]) => event === 'keydown');
    expect(keydownRemovals.length).toBeGreaterThan(0);

    removeSpy.mockRestore();
  });
});
