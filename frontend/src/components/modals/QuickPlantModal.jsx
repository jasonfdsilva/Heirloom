import React, { useState } from 'react';
import api from '../../lib/api';

const CATEGORIES = ['Flowers', 'Fruit', 'Herbs', 'Tomatoes', 'Vegetables', 'Other'];

export default function QuickPlantModal({ seeds, structureId, onCreated, onClose }) {
  const [filter, setFilter] = useState('');
  const [selectedSeedId, setSelectedSeedId] = useState('');
  const [method, setMethod] = useState('direct');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [showNewSeed, setShowNewSeed] = useState(false);
  const [newSeed, setNewSeed] = useState({ name: '', category: '', direct_sow: false, start_indoors: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const filteredSeeds = seeds.filter(s =>
    s.name.toLowerCase().includes(filter.toLowerCase())
  );

  // Group by category, sorted alpha within each group
  const grouped = {};
  filteredSeeds.forEach(s => {
    const cat = s.category || 'Other';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(s);
  });
  Object.values(grouped).forEach(arr => arr.sort((a, b) => a.name.localeCompare(b.name)));
  const groupEntries = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));

  const selectedSeed = seeds.find(s => s.id === selectedSeedId);

  // Auto-set method when seed is selected
  const handleSelectSeed = (seed) => {
    setSelectedSeedId(seed.id);
    if (seed.direct_sow && !seed.start_indoors) {
      setMethod('direct');
    } else {
      setMethod('nursery');
    }
  };

  const handleCreateSeed = async () => {
    if (!newSeed.name.trim() || !newSeed.category) {
      setError('Seed name and category are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await api.post('/api/seeds', {
        name: newSeed.name.trim(),
        category: newSeed.category,
        direct_sow: newSeed.direct_sow,
        start_indoors: newSeed.start_indoors,
      });
      handleSelectSeed(created);
      setShowNewSeed(false);
      setNewSeed({ name: '', category: '', direct_sow: false, start_indoors: false });
    } catch (err) {
      setError(err.detail || 'Failed to create seed.');
    } finally {
      setSaving(false);
    }
  };

  const handleStart = async () => {
    if (!selectedSeedId) {
      setError('Please select a seed or plant.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        seed_id: selectedSeedId,
        structure_id: structureId,
        method,
        year: new Date().getFullYear(),
        status: 'active',
        ...(method === 'direct'
          ? { direct_sow_date: date }
          : { planted_out_date: date }),
      };
      const result = await api.post('/api/plantings', payload);
      onCreated(result.id);
    } catch (err) {
      setError(err.detail || 'Failed to create planting.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <h3 className="modal-title">🌱 Plant Now</h3>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '8px 12px', marginBottom: 12, fontSize: 13, color: '#dc2626' }}>
            {error}
          </div>
        )}

        {/* Seed search */}
        <div className="form-group">
          <label className="form-label">Search seeds</label>
          <input
            type="text"
            className="form-input"
            placeholder="Filter by name..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            autoFocus
          />
        </div>

        {/* Seed dropdown */}
        {!showNewSeed && (
          <div className="form-group">
            <select
              className="form-input"
              value={selectedSeedId}
              onChange={e => {
                const seed = seeds.find(s => String(s.id) === e.target.value);
                if (seed) handleSelectSeed(seed);
                else setSelectedSeedId('');
              }}
              size={Math.min(8, filteredSeeds.length + 1)}
              style={{ height: 'auto' }}
            >
              <option value="">— Select a seed —</option>
              {groupEntries.map(([cat, catSeeds]) => (
                <optgroup key={cat} label={cat}>
                  {catSeeds.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        )}

        {/* Inline new seed form */}
        <button
          className="btn btn-secondary btn-sm"
          style={{ marginBottom: 12 }}
          onClick={() => { setShowNewSeed(v => !v); setError(null); }}
        >
          {showNewSeed ? '↩ Back to seed list' : '+ New seed (quick add)'}
        </button>

        {showNewSeed && (
          <div style={{ border: '1px solid #e8e4dd', borderRadius: 8, padding: 14, background: '#faf8f5', marginBottom: 12 }}>
            <div className="form-group" style={{ marginBottom: 8 }}>
              <label className="form-label">Name *</label>
              <input
                type="text"
                className="form-input"
                value={newSeed.name}
                onChange={e => setNewSeed(s => ({ ...s, name: e.target.value }))}
                placeholder="e.g., Cherokee Purple Tomato"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 8 }}>
              <label className="form-label">Category *</label>
              <select
                className="form-input"
                value={newSeed.category}
                onChange={e => setNewSeed(s => ({ ...s, category: e.target.value }))}
              >
                <option value="">Select...</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 10 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={newSeed.direct_sow} onChange={e => setNewSeed(s => ({ ...s, direct_sow: e.target.checked }))} />
                Direct sow
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={newSeed.start_indoors} onChange={e => setNewSeed(s => ({ ...s, start_indoors: e.target.checked }))} />
                Start indoors
              </label>
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleCreateSeed} disabled={saving}>
              {saving ? 'Saving...' : 'Add seed & select'}
            </button>
          </div>
        )}

        {/* Method toggle */}
        <div className="form-group">
          <label className="form-label">Method</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={`btn ${method === 'direct' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setMethod('direct')}
            >
              🌿 Direct Sow
            </button>
            <button
              className={`btn ${method === 'nursery' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setMethod('nursery')}
            >
              🛒 Nursery Buy
            </button>
          </div>
        </div>

        {/* Date */}
        <div className="form-group">
          <label className="form-label">{method === 'direct' ? 'Sow Date' : 'Planted Date'}</label>
          <input
            type="date"
            className="form-input"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </div>

        {/* Selected seed summary */}
        {selectedSeed && (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '6px 12px', marginBottom: 12, fontSize: 13, color: '#166534' }}>
            Selected: <strong>{selectedSeed.name}</strong> ({selectedSeed.category})
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-primary" onClick={handleStart} disabled={saving || !selectedSeedId}>
            {saving ? 'Starting...' : 'Start Planting →'}
          </button>
        </div>
      </div>
    </div>
  );
}
