import React, { useState, useEffect } from 'react';
import api from '../../lib/api';

const EMPTY_FORM = {
  seed_id: '',
  lot_code: '',
  packed_for_year: new Date().getFullYear(),
  purchased_year: '',
  supplier: '',
  supplier_lot: '',
  sku: '',
  germ_rate: '',
  notes: '',
};

export default function AddLotModal({ seeds = [], initialSeedId = null, editLot = null, onSubmit, onClose }) {
  const [tab, setTab] = useState('manual');
  const [formData, setFormData] = useState(() => {
    if (editLot) {
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
      };
    }
    return { ...EMPTY_FORM, seed_id: initialSeedId || '' };
  });
  const [scanFile, setScanFile] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState(null);
  const [lotCodeLoading, setLotCodeLoading] = useState(false);

  // Auto-fetch suggested lot code when seed or year changes (new lots only)
  useEffect(() => {
    if (editLot) return;
    if (!formData.seed_id || !formData.packed_for_year) return;
    setLotCodeLoading(true);
    api.get(`/api/seed-lots/generate-code?seed_id=${encodeURIComponent(formData.seed_id)}&year=${formData.packed_for_year}`)
      .then(res => { if (res.lot_code) setFormData(d => ({ ...d, lot_code: res.lot_code })); })
      .catch(() => {})
      .finally(() => setLotCodeLoading(false));
  }, [formData.seed_id, formData.packed_for_year, editLot]);

  const handleScan = async () => {
    if (!scanFile) return;
    setScanError(null);
    setScanning(true);
    try {
      const fd = new FormData();
      fd.append('file', scanFile);
      const res = await api.upload('/api/seed-lots/extract-packet', fd);
      if (res.detail) { setScanError(res.detail); return; }
      // Pre-fill manual tab with extracted data
      setFormData(d => ({
        ...d,
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

  const handleSubmit = () => {
    const payload = {
      seed_id: formData.seed_id,
      lot_code: formData.lot_code || undefined,
      packed_for_year: formData.packed_for_year ? parseInt(formData.packed_for_year) : null,
      purchased_year: formData.purchased_year ? parseInt(formData.purchased_year) : null,
      supplier: formData.supplier || null,
      supplier_lot: formData.supplier_lot || null,
      sku: formData.sku || null,
      germ_rate: formData.germ_rate !== '' ? parseFloat(formData.germ_rate) : null,
      notes: formData.notes || null,
    };
    onSubmit(payload, editLot?.id);
  };

  const set = (key, val) => setFormData(d => ({ ...d, [key]: val }));

  const sortedSeeds = [...seeds].sort((a, b) => {
    if (a.category < b.category) return -1;
    if (a.category > b.category) return 1;
    return a.name.localeCompare(b.name);
  });

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
            <div className="form-group">
              <label className="form-label">Seed Variety <span style={{ color: '#dc2626' }}>*</span></label>
              <select className="form-input" value={formData.seed_id}
                onChange={e => set('seed_id', e.target.value)} disabled={!!editLot}>
                <option value="">Select variety…</option>
                {sortedSeeds.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Packed For Year <span style={{ color: '#dc2626' }}>*</span></label>
              <input type="number" className="form-input" min="2000" max="2100"
                value={formData.packed_for_year}
                onChange={e => set('packed_for_year', e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">
                Lot Code
                {lotCodeLoading && <span style={{ fontSize: 11, color: '#8a8580', marginLeft: 6 }}>generating…</span>}
              </label>
              <input type="text" className="form-input" value={formData.lot_code}
                onChange={e => set('lot_code', e.target.value)}
                placeholder="e.g. SH-2026-001" />
              <div style={{ fontSize: 11, color: '#8a8580', marginTop: 3 }}>
                Auto-generated from variety + year. Edit to override.
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Purchased Year</label>
              <input type="number" className="form-input" min="2000" max="2100"
                value={formData.purchased_year}
                onChange={e => set('purchased_year', e.target.value)}
                placeholder={String(new Date().getFullYear())} />
            </div>

            <div className="form-group">
              <label className="form-label">Supplier</label>
              <input type="text" className="form-input" value={formData.supplier}
                onChange={e => set('supplier', e.target.value)}
                placeholder="e.g. Johnny's, Seed Savers, Burpee" />
            </div>

            <div className="form-group">
              <label className="form-label">Supplier Lot #</label>
              <input type="text" className="form-input" value={formData.supplier_lot}
                onChange={e => set('supplier_lot', e.target.value)}
                placeholder="Supplier's own lot/batch number" />
            </div>

            <div className="form-group">
              <label className="form-label">SKU</label>
              <input type="text" className="form-input" value={formData.sku}
                onChange={e => set('sku', e.target.value)}
                placeholder="Catalog / SKU number" />
            </div>

            <div className="form-group">
              <label className="form-label">Germination Rate (%)</label>
              <input type="number" className="form-input" min="0" max="100" step="0.1"
                value={formData.germ_rate}
                onChange={e => set('germ_rate', e.target.value)}
                placeholder="e.g. 85" />
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-input" value={formData.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Any notes about this packet…" />
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmit}
                disabled={!formData.seed_id || !formData.packed_for_year}>
                {editLot ? 'Save Changes' : 'Add Packet'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
