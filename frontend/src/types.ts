export interface Garden {
  id: number;
  name: string;
  location_description: string | null;
  last_frost_date: string;
  first_frost_date: string;
  layout_pdf_url: string | null;
  created_at: string;
}

export interface GrowingSpace {
  id: number;
  garden_id: number;
  name: string;
  type: "raised_bed" | "container";
  width_ft: number | null;
  length_ft: number | null;
  notes: string | null;
  display_order: number;
}

export interface Season {
  id: number;
  garden_id: number;
  name: string;
  year: number;
  delay_weeks: number;
  delay_reason: string | null;
  notes: string | null;
  created_at: string;
}

export interface PlantVariety {
  id: number;
  common_name: string;
  latin_name: string | null;
  plant_type: "annual" | "perennial" | "biennial";
  days_to_germination: number | null;
  days_to_maturity: string | null;
  spacing_inches: number | null;
  sow_depth_inches: number | null;
  notes: string | null;
}

export interface SeedLot {
  id: number;
  variety_id: number;
  lot_number: string | null;
  sku: string | null;
  source_vendor: string | null;
  purchase_date: string | null;
  quantity_seeds: number | null;
  germination_rate_pct: number | null;
  germination_test_date: string | null;
  certifications: string | null;
  packet_image_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface PlantingEvent {
  id: number;
  garden_id: number;
  season_id: number;
  space_id: number;
  variety_id: number;
  location_note: string | null;
  sow_type: "indoor_start" | "direct" | "transplant";
  status: "planned" | "started" | "growing" | "harvesting" | "done" | "failed";
  planned_sow_date: string | null;
  planned_transplant_date: string | null;
  planned_harvest_start: string | null;
  actual_sow_date: string | null;
  actual_transplant_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface ScheduleItem {
  planting_id: number;
  season_id: number;
  season_name: string;
  variety_id: number;
  space_id: number;
  location_note: string | null;
  sow_type: "indoor_start" | "direct" | "transplant";
  status: string;
  delay_weeks: number;
  delay_reason: string | null;
  planned_sow_date: string | null;
  planned_transplant_date: string | null;
  planned_harvest_start: string | null;
  projected_sow_date: string | null;
  projected_transplant_date: string | null;
  projected_harvest_start: string | null;
  actual_sow_date: string | null;
  actual_transplant_date: string | null;
  frost_risk: boolean;
}

export interface SeedPacketExtraction {
  vendor: string | null;
  product_category: string | null;
  common_name: string;
  latin_name: string | null;
  sku: string | null;
  lot_number: string | null;
  min_seed_count: number | null;
  seeds_per_pound: number | null;
  days_to_maturity: string | null;
  germination_rate_pct: number | null;
  germination_test_date: string | null;
  certifications: string[];
  plant_variety_protected: boolean;
  special_notes: string | null;
}
