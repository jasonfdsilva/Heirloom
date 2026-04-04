import React, { useState } from 'react';
import api from '../../lib/api';

const EMPTY_FORM = {
  seed_id: '',
  packed_for_year: new Date().getFullYear(),
  purchased_year: '',
  supplier: '',
  supplier_lot: '',
  sku: '',
  germ_rate: '',
  notes: '',
  _varietySearch: '',
  _categorySearch: '',
  _speciesSearch: '',
  _extractedName: '',
  _extractedCategory: '',
  _extractedSpecies: '',
  _extractedDays: '',
  species: '',
  category: '',
  start_indoors: false,
  direct_sow: false,
};

export default function AddLotModal({ seeds = [], initialSeedId = null, editLot = null, onSubmit, onClose, onSeedCreated }) {
  const [tab, setTab] = useState('manual');
  const [formData, setFormData] = useState(() => {
    if (editLot) {
      const parentSeed = seeds.find(s => s.id === editLot.seed_id);
      return {
        seed_id: editLot.seed_id || '',
        lot_code: editLot.lot_code || '',
        packed_for_year: editLot.packed_for_year || new Date().getFullYear(),
        purchased_year: editLot.purchased_year || '',
        supplier: editLot.supplier || '',
        supplier_lot: editLot.supplier_lot || '',
        sku: editLot.sku || '',
        germ_rate: editLot.germ_rate != null ? String(editLot.germ_rate) : '',
        notes: editLot.notes || '',
        category: editLot.category || '',
        species: editLot.species || '',
        start_indoors: !!parentSeed?.start_indoors,
        direct_sow: !!parentSeed?.direct_sow,
        _varietySearch: '',
        _categorySearch: editLot.category || '',
        _speciesSearch: editLot.species || '',
        _extractedName: '',
        _extractedCategory: '',
        _extractedSpecies: '',
        _extractedDays: '',
      };
    }
    return { ...EMPTY_FORM, seed_id: initialSeedId || '' };
  });
  const [scanFile, setScanFile] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  const handleScan = async () => {
    if (!scanFile) return;
    setScanError(null);
    setScanning(true);
    try {
      const fd = new FormData();
      fd.append('file', scanFile);
      const res = await api.upload('/api/seed-lots/extract-packet', fd);
      if (res.detail) { setScanError(res.detail); return; }
      const extractedName = res.name || '';
      let matchedSeedId = '';
      if (extractedName) {
        const lower = extractedName.toLowerCase();
        const match = seeds.find(s =>
          s.name.toLowerCase() === lower ||
          s.name.toLowerCase().includes(lower) ||
          lower.includes(s.name.toLowerCase())
        );
        if (match) matchedSeedId = match.id;
      }
      const resolvedCategory = res.category || (matchedSeedId ? seeds.find(s => s.id === matchedSeedId)?.category || '' : '');
      const resolvedSpecies = res.species || (matchedSeedId ? seeds.find(s => s.id === matchedSeedId)?.species || '' : '');
      setFormData(d => ({
        ...d,
        seed_id: matchedSeedId || d.seed_id,
        _extractedName: extractedName,
        _extractedCategory: res.category || '',
        _extractedSpecies: res.species || '',
        _extractedDays: res.days_to_maturity || '',
        category: resolvedCategory,
        species: resolvedSpecies,
        _categorySearch: resolvedCategory,
        _speciesSearch: resolvedSpecies,
        _varietySearch: matchedSeedId ? '' : extractedName,
        supplier: res.supplier || d.supplier,
        supplier_lot: res.supplier_lot || d.supplier_lot,
        sku: res.sku || d.sku,
        packed_for_year: res.packed_for_year || d.packed_for_year,
        germ_rate: res.germ_rate != null ? String(res.germ_rate) : d.germ_rate,
        notes: res.notes || d.notes,
      }));
      setTab('manual');
    } catch (e) {
      setScanError('Scan failed. Please try again or enter details manually.');
    } finally {
      setScanning(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    let seedId = formData.seed_id;
    let effectiveSeed = seeds.find(s => s.id === seedId) || null;

    // If no existing variety selected but a name was typed, create it now
    if (!seedId && formData._varietySearch.trim()) {
      const name = formData._varietySearch.trim();
      const result = await api.post('/api/seeds', {
        name,
        category: formData.category || '',
      });
      if (!result?.id) {
        setSubmitError('Could not create variety. Please try again.');
        return;
      }
      seedId = result.id;
      effectiveSeed = {
        id: result.id, name, category: formData.category || '',
        species: null, variety: name, germ_rate: null, organic: false,
        days_to_maturity: null, image_url: null, short_label: null,
        start_indoors: false, direct_sow: false, suggested_indoor_weeks: 0,
        spacing_inches: 12, lot: null, sku: null, supplier: null, notes: null,
      };
      if (onSeedCreated) onSeedCreated(effectiveSeed);
    }

    const payload = {
      seed_id: seedId,
      packed_for_year: formData.packed_for_year ? parseInt(formData.packed_for_year) : null,
      purchased_year: formData.purchased_year ? parseInt(formData.purchased_year) : null,
      supplier: formData.supplier || null,
      supplier_lot: formData.supplier_lot || null,
      sku: formData.sku || null,
      germ_rate: formData.germ_rate !== '' ? parseFloat(formData.germ_rate) : null,
      notes: formData.notes || null,
    };
    if (editLot) payload.lot_code = formData.lot_code || undefined;

    // Save variety-level fields back to the seed — must send full SeedCreate payload
    // (backend PUT requires all required fields; partial sends cause silent 422 failures)
    if (seedId && effectiveSeed) {
      const hasCategory  = formData.category && formData.category !== (effectiveSeed.category || '');
      const hasSpecies   = formData.species  && formData.species  !== (effectiveSeed.species  || '');
      const hasDays      = formData._extractedDays && !effectiveSeed.days_to_maturity;
      const hasIndoors   = formData.start_indoors !== !!effectiveSeed.start_indoors;
      const hasDirect    = formData.direct_sow    !== !!effectiveSeed.direct_sow;

      if (hasCategory || hasSpecies || hasDays || hasIndoors || hasDirect) {
        await api.put(`/api/seeds/${seedId}`, {
          name:                    effectiveSeed.name || '',
          variety:                 effectiveSeed.variety || effectiveSeed.name || '',
          category:                hasCategory  ? formData.category          : (effectiveSeed.category || ''),
          species:                 hasSpecies   ? formData.species           : (effectiveSeed.species  ?? null),
          days_to_maturity:        hasDays      ? formData._extractedDays   : (effectiveSeed.days_to_maturity ?? null),
          start_indoors:           hasIndoors   ? formData.start_indoors    : !!effectiveSeed.start_indoors,
          direct_sow:              hasDirect    ? formData.direct_sow       : !!effectiveSeed.direct_sow,
          germ_rate:               effectiveSeed.germ_rate    ?? null,
          lot:                     effectiveSeed.lot          ?? null,
          sku:                     effectiveSeed.sku          ?? null,
          organic:                 !!effectiveSeed.organic,
          supplier:                effectiveSeed.supplier     ?? null,
          min_seeds:               effectiveSeed.min_seeds    ?? null,
          suggested_indoor_weeks:  effectiveSeed.suggested_indoor_weeks ?? 0,
          spacing_inches:          effectiveSeed.spacing_inches         ?? 12,
          image_url:               effectiveSeed.image_url    ?? null,
          short_label:             effectiveSeed.short_label  ?? null,
          notes:                   effectiveSeed.notes        ?? null,
        });
      }
    }

    onSubmit(payload, editLot?.id);
  };

  const set = (key, val) => setFormData(d => ({ ...d, [key]: val }));

  const sortedSeeds = [...seeds].sort((a, b) => {
    if ((a.category || '') < (b.category || '')) return -1;
    if ((a.category || '') > (b.category || '')) return 1;
    return (a.name || '').localeCompare(b.name || '');
  });

  const filteredVarieties = sortedSeeds.filter(s =>
    !formData._varietySearch ||
    s.name.toLowerCase().includes(formData._varietySearch.toLowerCase())
  );

  const searchTrimmed = formData._varietySearch.trim();
  const isNewVariety = searchTrimmed.length > 0 && !formData.seed_id && filteredVarieties.length === 0;

  const selectedSeed = seeds.find(s => s.id === formData.seed_id);
  const knownCategories = [...new Set(seeds.map(s => s.category).filter(Boolean))].sort();
  const knownSpecies = [...new Set(seeds.map(s => s.species).filter(Boolean))].sort();

  // Enable submit if: existing variety selected, OR new variety name typed — plus year required
  const canSubmit = (formData.seed_id || searchTrimmed) && formData.packed_for_year;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">{editLot ? 'Edit Packet' : 'Add Seed Packet'}</h3>

        {/* Tab bar */}
        {!editLot && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {['manual', 'scan'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-secondary'}`}>
                {t === 'manual' ? '✏️ Manual' : '📷 Scan Packet'}
              </button>
            ))}
          </div>
        )}

        {/* Scan tab */}
        {tab === 'scan' && !editLot && (
          <div>
            <div className="form-group">
              <label className="form-label">Upload Packet Image</label>
              <input type="file" accept="image/*" className="form-input"
                onChange={e => setScanFile(e.target.files[0] || null)} />
            </div>
            {scanError && (
              <div style={{ background: '#fef2f2', color: '#dc2626', padding: '8px 12px', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
                {scanError}
              </div>
            )}
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={handleScan} disabled={!scanFile || scanning}>
                {scanning ? 'Extracting…' : 'Extract from Packet'}
              </button>
            </div>
          </div>
        )}

        {/* Manual tab */}
        {tab === 'manual' && (
          <div>
            {/* Variety */}
            <div className="form-group">
              <label className="form-label">Seed Variety <span style={{ color: '#dc2626' }}>*</span></label>
              {!editLot && (
                <input
                  type="text"
                  className="form-input"
                  placeholder="Type variety name…"
                  value={formData._varietySearch}
                  onChange={e => setFormData(d => ({ ...d, _varietySearch: e.target.value, seed_id: '' }))}
                  style={{ marginBottom: 4 }}
                />
              )}
              {filteredVarieties.length > 0 && (
                <select className="form-input" value={formData.seed_id}
                  onChange={e => {
                    const seed = seeds.find(s => s.id === e.target.value);
                    const cat = seed?.category || '';
                    const sp = seed?.species || '';
                    setFormData(d => ({
                      ...d,
                      seed_id: e.target.value,
                      _varietySearch: seed?.name || d._varietySearch,
                      category: cat || d._extractedCategory || '',
                      species: sp || d._extractedSpecies || '',
                      _categorySearch: cat || d._extractedCategory || '',
                      _speciesSearch: sp || d._extractedSpecies || '',
                      start_indoors: !!seed?.start_indoors,
                      direct_sow: !!seed?.direct_sow,
                    }));
                  }} disabled={!!editLot}>
                  <option value="">Select variety…</option>
                  {filteredVarieties.map(s => (
                    <option key={s.id} value={s.id}>{s.name}{s.category ? ` (${s.category})` : ''}</option>
                  ))}
                </select>
              )}
              {isNewVariety && (
                <div style={{ fontSize: 12, color: '#16a34a', marginTop: 4, fontStyle: 'italic' }}>
                  ✦ "{searchTrimmed}" will be created as a new variety when you save
                </div>
              )}
              {formData._extractedName && (
                <div style={{ fontSize: 11, marginTop: 4 }}>
                  {formData.seed_id
                    ? <span style={{ color: '#16a34a' }}>✓ Matched to existing variety</span>
                    : <span style={{ color: '#d97706' }}>📷 Scanned: <em>{formData._extractedName}</em> — not matched, will be created on save</span>}
                </div>
              )}
            </div>

            {/* Category */}
            <div className="form-group">
              <label className="form-label">Category</label>
              <input type="text" className="form-input"
                placeholder="Type to filter or enter new category…"
                value={formData._categorySearch}
                onChange={e => setFormData(d => ({ ...d, _categorySearch: e.target.value, category: e.target.value }))}
                style={{ marginBottom: 4 }}
              />
              <select className="form-input" value={formData.category}
                onChange={e => setFormData(d => ({ ...d, category: e.target.value, _categorySearch: e.target.value }))}>
                <option value="">Select category…</option>
                {knownCategories
                  .filter(c => !formData._categorySearch || c.toLowerCase().includes(formData._categorySearch.toLowerCase()))
                  .map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {formData.category && formData.category !== (selectedSeed?.category || '') && (
                <div style={{ fontSize: 11, color: '#8a8580', marginTop: 3 }}>Will be saved to this variety</div>
              )}
            </div>

            {/* Species */}
            <div className="form-group">
              <label className="form-label">Species</label>
              <input type="text" className="form-input"
                placeholder="Type to filter or enter new species…"
                value={formData._speciesSearch}
                onChange={e => setFormData(d => ({ ...d, _speciesSearch: e.target.value, species: e.target.value }))}
                style={{ marginBottom: 4 }}
              />
              <select className="form-input" value={formData.species}
                onChange={e => setFormData(d => ({ ...d, species: e.target.value, _speciesSearch: e.target.value }))}
                style={{ fontStyle: formData.species ? 'italic' : 'normal' }}>
                <option value="">Select species…</option>
                {knownSpecies
                  .filter(s => !formData._speciesSearch || s.toLowerCase().includes(formData._speciesSearch.toLowerCase()))
                  .map(s => <option key={s} value={s} style={{ fontStyle: 'italic' }}>{s}</option>)}
              </select>
              {formData.species && formData.species !== (selectedSeed?.species || '') && (
                <div style={{ fontSize: 11, color: '#8a8580', marginTop: 3 }}>Will be saved to this variety</div>
              )}
            </div>

            {/* Sowing Method */}
            <div className="form-group">
              <label className="form-label">Sowing Method</label>
              <div style={{ display: 'flex', gap: 20, marginTop: 4 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
                  <input type="checkbox" checked={formData.start_indoors}
                    onChange={e => set('start_indoors', e.target.checked)} />
                  🏠 Start Indoors
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
                  <input type="checkbox" checked={formData.direct_sow}
                    onChange={e => set('direct_sow', e.target.checked)} />
                  🌿 Direct Sow
                </label>
              </div>
            </div>

            {/* Packed For Year */}
            <div className="form-group">
              <label className="form-label">Packed For Year <span style={{ color: '#dc2626' }}>*</span></label>
              <input type="number" className="form-input" min="2000" max="2100"
                value={formData.packed_for_year}
                onChange={e => set('packed_for_year', e.target.value)} />
            </div>

            {/* Purchased Year */}
            <div className="form-group">
              <label className="form-label">Purchased Year</label>
              <input type="number" className="form-input" min="2000" max="2100"
                value={formData.purchased_year}
                onChange={e => set('purchased_year', e.target.value)}
                placeholder={String(new Date().getFullYear())} />
            </div>

            {/* Supplier */}
            <div className="form-group">
              <label className="form-label">Supplier</label>
              <input type="text" className="form-input" value={formData.supplier}
                onChange={e => set('supplier', e.target.value)}
                placeholder="e.g. Johnny's, Seed Savers, Burpee" />
            </div>

            {/* Supplier Lot # */}
            <div className="form-group">
              <label className="form-label">Supplier Lot #</label>
              <input type="text" className="form-input" value={formData.supplier_lot}
                onChange={e => set('supplier_lot', e.target.value)}
                placeholder="Supplier's own lot/batch number" />
            </div>

            {/* SKU */}
            <div className="form-group">
              <label className="form-label">SKU</label>
              <input type="text" className="form-input" value={formData.sku}
                onChange={e => set('sku', e.target.value)}
                placeholder="Catalog / SKU number" />
            </div>

            {/* Germination Rate */}
            <div className="form-group">
              <label className="form-label">Germination Rate (%)</label>
              <input type="number" className="form-input" min="0" max="100" step="0.1"
                value={formData.germ_rate}
                onChange={e => set('germ_rate', e.target.value)}
                placeholder="e.g. 85" />
            </div>

            {/* Notes */}
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-input" value={formData.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Any notes about this packet…" />
            </div>

            {submitError && (
              <div style={{ background: '#fef2f2', color: '#dc2626', padding: '8px 12px', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>
                {submitError}
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={!canSubmit}>
                {editLot ? 'Save Changes' : 'Add Packet'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
