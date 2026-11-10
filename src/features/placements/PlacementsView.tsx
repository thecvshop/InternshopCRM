import React, { useState } from 'react';
import { Award, Briefcase, Calendar, CheckCircle2, MessageSquare, Star, Plus, Search } from 'lucide-react';
import { Placement } from '../../types/crm';
import { Badge } from '../../components/common/Badge';

interface PlacementsViewProps {
  placements: Placement[];
  onOpenQuickCreate: () => void;
}

export const PlacementsView: React.FC<PlacementsViewProps> = ({
  placements,
  onOpenQuickCreate,
}) => {
  const [search, setSearch] = useState('');
  const [selectedPlacement, setSelectedPlacement] = useState<Placement | null>(null);

  const filteredPlacements = placements.filter((p) => {
    const q = search.toLowerCase();
    return !q || p.studentName.toLowerCase().includes(q) || p.companyName.toLowerCase().includes(q) || p.roleTitle.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      {/* Top Banner & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
        <div className="bg-white border border-zinc-200/80 rounded-xl p-4">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Total Placed</span>
          <span className="text-2xl font-bold text-zinc-900 mt-1 block">{placements.length}</span>
          <span className="text-xs text-emerald-600 font-medium">100% verified placements</span>
        </div>
        <div className="bg-white border border-zinc-200/80 rounded-xl p-4">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Average Stipend</span>
          <span className="text-2xl font-bold text-zinc-900 mt-1 block">₹45,000 / mo</span>
          <span className="text-xs text-zinc-500">Tier 1 tech partners</span>
        </div>
        <div className="bg-white border border-zinc-200/80 rounded-xl p-4">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Active Onboarded</span>
          <span className="text-2xl font-bold text-zinc-900 mt-1 block">
            {placements.filter((p) => p.status === 'Joined').length}
          </span>
          <span className="text-xs text-zinc-500">Interns currently working</span>
        </div>
        <div className="bg-white border border-zinc-200/80 rounded-xl p-4">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">PPO Potential</span>
          <span className="text-2xl font-bold text-zinc-900 mt-1 block">85%</span>
          <span className="text-xs text-zinc-500">Conversion to full-time</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-3 bg-white p-4 rounded-xl border border-zinc-200/80">
        <div className="relative w-64">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search placed students or companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-zinc-200 rounded-lg focus:outline-none"
          />
        </div>
      </div>

      {/* Placements Table */}
      <div className="bg-white border border-zinc-200/80 rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-50/80 border-b border-zinc-200/80 text-zinc-500 font-medium">
            <tr>
              <th className="py-3 px-4">Student</th>
              <th className="py-3 px-4">Hiring Company & Role</th>
              <th className="py-3 px-4">Stipend / CTC</th>
              <th className="py-3 px-4">Offer & Joining Dates</th>
              <th className="py-3 px-4">Duration & Location</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">30-Day Follow-up</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filteredPlacements.map((p) => (
              <tr key={p.id} className="hover:bg-zinc-50/80 transition">
                <td className="py-3 px-4">
                  <div className="font-semibold text-zinc-900">{p.studentName}</div>
                </td>
                <td className="py-3 px-4">
                  <span className="font-medium text-zinc-900 block">{p.companyName}</span>
                  <span className="text-[10px] text-zinc-400">{p.roleTitle}</span>
                </td>
                <td className="py-3 px-4">
                  <span className="font-semibold text-emerald-700 block">{p.stipend}</span>
                  {p.ctc && <span className="text-[10px] text-zinc-500">{p.ctc}</span>}
                </td>
                <td className="py-3 px-4 text-zinc-600">
                  <div>Offered: {p.offerDate}</div>
                  <div className="text-[10px] text-zinc-400">Joining: {p.joiningDate}</div>
                </td>
                <td className="py-3 px-4 text-zinc-600">
                  <div>{p.duration}</div>
                  <div className="text-[10px] text-zinc-400">{p.location}</div>
                </td>
                <td className="py-3 px-4">
                  <Badge variant="emerald">{p.status}</Badge>
                </td>
                <td className="py-3 px-4 text-right">
                  <button
                    onClick={() => setSelectedPlacement(p)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded text-xs font-medium transition cursor-pointer"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>Feedback (Month 1)</span>
                  </button>
                </td>
              </tr>
            ))}
            {filteredPlacements.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-zinc-400 text-xs">
                  No placements recorded yet. Placements sync automatically when candidate offers are accepted.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Monthly Follow Up Modal */}
      {selectedPlacement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex justify-between items-start border-b border-zinc-100 pb-3">
              <div>
                <h3 className="font-bold text-zinc-900 text-base">30-Day Placement Health Check</h3>
                <p className="text-xs text-zinc-500">
                  {selectedPlacement.studentName} @ {selectedPlacement.companyName}
                </p>
              </div>
              <button
                onClick={() => setSelectedPlacement(null)}
                className="text-zinc-400 hover:text-zinc-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-zinc-50 rounded-xl space-y-2 border border-zinc-200/60">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-zinc-800">Student Satisfaction Rating</span>
                  <div className="flex text-amber-500">
                    {'★'.repeat(5)}
                  </div>
                </div>
                <p className="text-zinc-600 italic">
                  "The engineering mentorship has been extraordinary. Shipping real production features on day 14."
                </p>
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl space-y-2 border border-zinc-200/60">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-zinc-800">Company Manager Rating</span>
                  <div className="flex text-amber-500">
                    {'★'.repeat(5)}
                  </div>
                </div>
                <p className="text-zinc-600 italic">
                  "Strong problem-solving mindset and independent ownership. High probability for pre-placement offer (PPO)."
                </p>
              </div>
            </div>

            <div className="border-t border-zinc-100 pt-3 flex justify-end">
              <button
                onClick={() => {
                  alert('Follow-up review logged & saved to Student 360 timeline!');
                  setSelectedPlacement(null);
                }}
                className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-xs font-medium hover:bg-zinc-800"
              >
                Save Review Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
