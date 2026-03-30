import { FormEvent, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { gardenApi } from "../api/client";
import { GARDEN_ID } from "../hooks/useGarden";

interface Props {
  onClose: () => void;
}

export function AddSpaceModal({ onClose }: Props) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [type, setType] = useState<"raised_bed" | "container">("raised_bed");
  const [width, setWidth] = useState("");
  const [length, setLength] = useState("");
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: (data: object) => gardenApi.createSpace(GARDEN_ID, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["spaces"] });
      onClose();
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      name,
      type,
      width_ft: width ? parseFloat(width) : null,
      length_ft: length ? parseFloat(length) : null,
      notes: notes || null,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Add Growing Space</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-garden-500"
              placeholder="e.g. South Bed, Herb Pot"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <div className="flex gap-3">
              {(["raised_bed", "container"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    type === t
                      ? "bg-garden-600 text-white border-garden-600"
                      : "border-gray-300 text-gray-600 hover:border-garden-400"
                  }`}
                >
                  {t === "raised_bed" ? "Raised Bed" : "Container"}
                </button>
              ))}
            </div>
          </div>
          {type === "raised_bed" && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Width (ft)</label>
                <input
                  type="number" step="0.5" value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-garden-500"
                  placeholder="4"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Length (ft)</label>
                <input
                  type="number" step="0.5" value={length}
                  onChange={(e) => setLength(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-garden-500"
                  placeholder="8"
                />
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-garden-500"
              placeholder="What grows here?"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="button" onClick={onClose}
              className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 py-2 bg-garden-600 text-white rounded-lg text-sm font-medium hover:bg-garden-700 disabled:opacity-50"
            >
              {mutation.isPending ? "Adding..." : "Add Space"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
