import { useState, useCallback } from 'react';
import api from '../lib/api';

export default function useAppData() {
  const [seeds, setSeeds] = useState([]);
  const [structures, setStructures] = useState([]);
  const [plantings, setPlantings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mapGridCells, setMapGridCells] = useState({});
  const [labelPositions, setLabelPositions] = useState({});

  const loadData = useCallback(async () => {
    try {
      const [s, st, p] = await Promise.all([
        api.get('/api/seeds'),
        api.get('/api/structures'),
        api.get('/api/plantings?year=2026'),
      ]);
      setSeeds(s); setStructures(st); setPlantings(p);
      const [gridResults, labelPos] = await Promise.all([
        Promise.all(st.map(str => api.get(`/api/structures/${str.id}/grid`).then(cells => [str.id, cells]))),
        api.get('/api/label-positions'),
      ]);
      const gridMap = {};
      gridResults.forEach(([sid, cells]) => { gridMap[sid] = cells; });
      setMapGridCells(gridMap);
      const posMap = {};
      labelPos.forEach(p => {
        posMap[`${p.entity_type}:${p.entity_id}`] = {
          x: p.label_x, y: p.label_y,
          orientation: p.orientation || 'horizontal',
          hidden: !!p.hidden,
          label_text: p.label_text || null,
        };
      });
      setLabelPositions(posMap);
    } catch (e) { console.error('Load failed:', e); }
    setLoading(false);
  }, []);

  const refreshPlantMapCells = useCallback(async (structureId, selectedBed, setGridCells) => {
    const updatedCells = await api.get(`/api/structures/${structureId}/grid`);
    setMapGridCells(prev => ({ ...prev, [structureId]: updatedCells }));
    if (selectedBed?.id === structureId) {
      setGridCells(updatedCells);
    }
  }, []);

  return {
    seeds, setSeeds,
    structures, setStructures,
    plantings, setPlantings,
    loading,
    mapGridCells, setMapGridCells,
    labelPositions, setLabelPositions,
    loadData,
    refreshPlantMapCells,
  };
}
