import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, varietyApi } from "../api/client";
import type { SeedPacketExtraction } from "../types";

interface Props {
  onClose: () => void;
}

export function PacketScanModal({ onClose }: Props) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [_extraction, setExtraction] = useState<SeedPacketExtraction | null>(null);
  const [step, setStep] = useState<"upload" | "review" | "saving">("upload");

  // Fields user can edit after extraction
  const [form, setForm] = useState({
    common_name: "",
    latin_name: "",
    days_to_maturity: "",
    lot_number: "",
    sku: "",
    source_vendor: "",
    germination_rate_pct: "",
    germination_test_date: "",
    notes: "",
  });

  const scanMutation = useMutation({
    mutationFn: (file: File) => varietyApi.extractPacket(file),
    onSuccess: (res) => {
      const data: SeedPacketExtraction = res.data;
      setExtraction(data);
      setForm({
        common_name: data.common_name ?? "",
        latin_name: data.latin_name ?? "",
        days_to_maturity: data.days_to_maturity ?? "",
        lot_number: data.lot_number ?? "",
        sku: data.sku ?? "",
        source_vendor: data.vendor ?? "Johnny's Selected Seeds",
        germination_rate_pct: data.germination_rate_pct?.toString() ?? "",
        germination_test_date: data.germination_test_date ?? "",
        notes: data.special_notes ?? "",
      });
      setStep("review");
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Create variety
      const variety = await api.post("/varieties", {
        common_name: form.common_name,
        latin_name: form.latin_name || null,
        plant_type: "annual",
        days_to_maturity: form.days_to_maturity || null,
        notes: form.notes || null,
      });
      // Create seed lot
      if (form.lot_number || form.source_vendor) {
        await api.post("/seedlots", {
          variety_id: variety.data.id,
          lot_number: form.lot_number || null,
          sku: form.sku || null,
          source_vendor: form.source_vendor || null,
          germination_rate_pct: form.germination_rate_pct ? parseInt(form.germination_rate_pct) : null,
          germination_test_date: form.germination_test_date || null,
        });
      }
      return variety.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["varieties"] });
      onClose();
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(file));
    } else {
      setPreview(null);
    }
    scanMutation.mutate(file);
  };

  const field = (key: keyof typeof form, label: string, placeholder?: string) => (
    <div key={key}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-garden-500"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h2 className="font-semibold text-gray-900">
            {step === "upload" ? "Scan Seed Packet" : "Review & Save"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="overflow-y-auto flex-1 p-5">
          {step === "upload" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Upload a photo or PDF of your seed packet. Claude will extract the variety data automatically.
              </p>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={scanMutation.isPending}
                className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-garden-400 hover:bg-garden-50 transition-colors disabled:opacity-50"
              >
                {scanMutation.isPending ? (
                  <div className="space-y-2">
                    <div className="text-2xl">🌱</div>
                    <p className="text-sm font-medium text-garden-700">Scanning packet…</p>
                    <p className="text-xs text-gray-400">Claude is reading your seed packet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-3xl">📷</div>
                    <p className="text-sm font-medium text-gray-700">Tap to upload</p>
                    <p className="text-xs text-gray-400">Photo or PDF of seed packet</p>
                  </div>
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleFileChange}
                capture="environment"
              />
              {preview && (
                <img src={preview} alt="Packet preview" className="rounded-lg max-h-40 object-contain mx-auto" />
              )}
              {scanMutation.isError && (
                <p className="text-sm text-red-500 text-center">Scan failed — try a clearer photo</p>
              )}
            </div>
          )}

          {step === "review" && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 mb-4">
                Review the extracted data and correct anything before saving.
              </p>
              {field("common_name", "Variety Name *", "e.g. Carbon OG")}
              {field("latin_name", "Latin Name", "e.g. Solanum lycopersicum")}
              {field("days_to_maturity", "Days to Maturity", "e.g. 76 or 50 green/70 red")}
              <div className="border-t border-gray-100 pt-3 mt-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Seed Lot</p>
                {field("source_vendor", "Vendor", "e.g. Johnny's Selected Seeds")}
                <div className="grid grid-cols-2 gap-3 mt-3">
                  {field("lot_number", "Lot Number", "e.g. 110433")}
                  {field("sku", "SKU", "e.g. 3763G.11")}
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  {field("germination_rate_pct", "Germ Rate %", "e.g. 87")}
                  {field("germination_test_date", "Test Date", "e.g. 10/25")}
                </div>
              </div>
              {field("notes", "Notes", "Any other notes")}
            </div>
          )}
        </div>

        {step === "review" && (
          <div className="p-5 border-t border-gray-100 flex gap-3 shrink-0">
            <button
              onClick={() => { setStep("upload"); setExtraction(null); }}
              className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              Re-scan
            </button>
            <button
              onClick={() => saveMutation.mutate()}
              disabled={!form.common_name || saveMutation.isPending}
              className="flex-1 py-2 bg-garden-600 text-white rounded-lg text-sm font-medium hover:bg-garden-700 disabled:opacity-50"
            >
              {saveMutation.isPending ? "Saving…" : "Save Variety"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
