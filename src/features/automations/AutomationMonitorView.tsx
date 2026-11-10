import React, { useState } from 'react';
import { Workflow, CheckCircle, Clock, AlertTriangle, Play, RefreshCw, Send, Sparkles, MessageSquare, Mail } from 'lucide-react';
import { AutomationRun } from '../../types/crm';
import { Badge } from '../../components/common/Badge';

interface AutomationMonitorViewProps {
  automationRuns: AutomationRun[];
  onTriggerManualSimulation?: () => void;
}

export const AutomationMonitorView: React.FC<AutomationMonitorViewProps> = ({
  automationRuns,
  onTriggerManualSimulation,
}) => {
  const [selectedRun, setSelectedRun] = useState<AutomationRun | null>(null);

  const activeAutomations = [
    {
      name: 'Instant Welcome Sequence',
      trigger: 'Lead Submitted / Created',
      action: 'Send WhatsApp template + Onboarding email with internship curriculum',
      status: 'Active',
    },
    {
      name: 'Student ID & Profile Provisioning',
      trigger: 'Lead Converted to Student',
      action: 'Generate IH-YYYY-XXXX ID, create Student 360 profile, notify batch trainer',
      status: 'Active',
    },
    {
      name: 'Assignment Assignment Engine',
      trigger: 'Student Stage = "In Training"',
      action: 'Dispatch project brief template, create 7-day countdown task for reviewer',
      status: 'Active',
    },
    {
      name: 'Placement & Billing Trigger',
      trigger: 'Student Stage = "Placed"',
      action: 'Auto-generate 18% GST invoice for hiring company, notify finance desk, schedule 30-day follow up',
      status: 'Active',
    },
    {
      name: 'Interview Sync & Calendar Invites',
      trigger: 'Interview Created / Confirmed',
      action: 'Create Google Meet link, email invite .ics to candidate & company HR POC',
      status: 'Active',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-zinc-200/80">
        <div>
          <h3 className="font-semibold text-sm text-zinc-900 flex items-center gap-2">
            <Workflow className="w-4 h-4 text-emerald-600" />
            <span>Operational Automation Engine</span>
          </h3>
          <p className="text-xs text-zinc-500">
            Real-time webhook and event-driven automation rules running on Firestore document changes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200 font-medium">
            5 Rules Live & Listening
          </span>
        </div>
      </div>

      {/* Active Rules Grid */}
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block mb-3">
          Configured Workflow Triggers
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {activeAutomations.map((rule, idx) => (
            <div key={idx} className="bg-white border border-zinc-200/80 rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-start">
                <span className="font-semibold text-xs text-zinc-900">{rule.name}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
              </div>
              <div className="text-[11px] text-zinc-500">
                <strong className="text-zinc-700">When:</strong> {rule.trigger}
              </div>
              <div className="text-[11px] text-zinc-600 bg-zinc-50 p-2.5 rounded-lg border border-zinc-100">
                <strong className="text-zinc-800">Then:</strong> {rule.action}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Execution Logs Table */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Live Execution Logs & Webhook History ({automationRuns.length})
          </span>
        </div>

        <div className="bg-white border border-zinc-200/80 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50/80 border-b border-zinc-200/80 text-zinc-500 font-medium">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Trigger Name</th>
                <th className="py-3 px-4">Action Dispatched</th>
                <th className="py-3 px-4">Target Entity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {automationRuns.map((run) => (
                <tr key={run.id} className="hover:bg-zinc-50/80 transition">
                  <td className="py-3 px-4 text-zinc-500 font-mono text-[11px]">
                    {new Date(run.executedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </td>
                  <td className="py-3 px-4 font-semibold text-zinc-900">{run.triggerName}</td>
                  <td className="py-3 px-4 text-zinc-700">{run.actionTaken}</td>
                  <td className="py-3 px-4 text-zinc-600">
                    {run.relatedEntityName || run.relatedEntityId || 'System'}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={run.status === 'Success' ? 'emerald' : 'amber'}>{run.status}</Badge>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setSelectedRun(run)}
                      className="px-2 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded text-[11px] font-medium transition cursor-pointer"
                    >
                      Payload
                    </button>
                  </td>
                </tr>
              ))}
              {automationRuns.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-400 text-xs">
                    No automation logs recorded yet. Create a lead, update a student stage, or seed demo data to see automation triggers fire.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payload Modal */}
      {selectedRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex justify-between items-start border-b border-zinc-100 pb-3">
              <div>
                <h3 className="font-bold text-zinc-900 text-base">{selectedRun.triggerName}</h3>
                <p className="text-xs text-zinc-500">Executed at {new Date(selectedRun.executedAt).toLocaleString()}</p>
              </div>
              <button
                onClick={() => setSelectedRun(null)}
                className="text-zinc-400 hover:text-zinc-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-zinc-900 text-emerald-400 p-4 rounded-xl font-mono text-[11px] overflow-x-auto max-h-60">
                {selectedRun.details}
              </div>
            </div>

            <div className="border-t border-zinc-100 pt-3 flex justify-end">
              <button
                onClick={() => setSelectedRun(null)}
                className="px-4 py-1.5 bg-zinc-900 text-white rounded-lg text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
