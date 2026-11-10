import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  Briefcase,
  IndianRupee,
  Copy,
  Check,
  Send,
  ExternalLink,
  MessageSquare,
  FileText,
  CheckSquare,
  History,
  Phone,
  Building,
  Sparkles,
  Edit2,
  Trash2,
} from 'lucide-react';
import { RentInternJob, RentInternJobStatus } from '../../../types/crm';

interface JobDetailDrawerProps {
  job: RentInternJob;
  onClose: () => void;
  onUpdateStatus?: (id: string, status: RentInternJobStatus) => void;
  onStatusChange?: (status: RentInternJobStatus) => void;
  onDeleteJob?: (id: string) => void;
  onDelete?: () => void;
}

const STATUS_COLORS: Record<RentInternJobStatus, string> = {
  'Draft': 'bg-zinc-100 text-zinc-700 border-zinc-200',
  'Awaiting Client Details': 'bg-amber-50 text-amber-700 border-amber-200',
  'Ready for Review': 'bg-blue-50 text-blue-700 border-blue-200',
  'Approved': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Published': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Applications Open': 'bg-purple-50 text-purple-700 border-purple-200',
  'Applications Closed': 'bg-zinc-100 text-zinc-700 border-zinc-200',
  'Assigned': 'bg-teal-50 text-teal-700 border-teal-200',
  'In Progress': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Completed': 'bg-emerald-100 text-emerald-800 border-emerald-300',
  'Cancelled': 'bg-rose-50 text-rose-700 border-rose-200',
};

export const JobDetailDrawer: React.FC<JobDetailDrawerProps> = ({
  job,
  onClose,
  onUpdateStatus,
  onStatusChange,
  onDeleteJob,
  onDelete,
}) => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'applications' | 'assigned' | 'communication' | 'documents' | 'tasks' | 'activity'
  >('overview');

  const [copied, setCopied] = useState(false);

  const handleCopyGig = () => {
    navigator.clipboard.writeText(job.generatedGigText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tasksList = [
    { title: 'Confirm final timings & location with client', done: true },
    { title: 'Verify equipment availability for assigned role', done: job.equipmentRequired.length > 0 },
    { title: 'Broadcast approved gig to InternsHome WhatsApp group', done: ['Published', 'Applications Open', 'Assigned', 'Completed'].includes(job.status) },
    { title: 'Screen applicants and shortlist candidates', done: ['Assigned', 'Completed'].includes(job.status) },
    { title: 'Dispatch confirmation & briefing to interns', done: ['Assigned', 'Completed'].includes(job.status) },
    { title: 'Track attendance on event day', done: job.status === 'Completed' },
    { title: 'Collect work drive deliverables from interns', done: job.status === 'Completed' },
    { title: 'Process client invoice & intern payout', done: job.status === 'Completed' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end animate-fadeIn">
      <div className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col border-l border-zinc-200 animate-slideInRight">
        {/* Drawer Header */}
        <div className="p-6 border-b border-zinc-200/80 bg-zinc-50/50 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-zinc-200 text-zinc-800">
                {job.jobId}
              </span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${STATUS_COLORS[job.status]}`}>
                {job.status}
              </span>
              <span className="text-xs text-zinc-500 font-mono">Priority: {job.priority}</span>
            </div>
            <h2 className="text-lg font-bold text-zinc-900 leading-tight">
              {job.jobTitle || `${job.normalizedRole} at ${job.client}`}
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500 pt-1">
              <span className="flex items-center gap-1 font-medium text-zinc-700">
                <Building className="w-3.5 h-3.5 text-zinc-400" />
                {job.client}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                {job.location?.venue || 'Kolkata'}, {job.location?.area}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                {job.dates?.join(', ') || 'Upcoming'}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-zinc-400" />
                {job.numberOfInterns} Needed
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopyGig}
              className="p-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors border border-zinc-200 text-xs flex items-center gap-1"
              title="Copy WhatsApp Gig"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Operational Status Action Bar */}
        <div className="px-6 py-2.5 bg-zinc-100/70 border-b border-zinc-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 font-medium">Quick Status:</span>
            <select
              value={job.status}
              onChange={(e) => {
                const s = e.target.value as RentInternJobStatus;
                if (onUpdateStatus) onUpdateStatus(job.id, s);
                if (onStatusChange) onStatusChange(s);
              }}
              className="bg-white border border-zinc-300 rounded-md px-2.5 py-1 text-xs font-medium text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            >
              <option value="Draft">Draft</option>
              <option value="Awaiting Client Details">Awaiting Client Details</option>
              <option value="Ready for Review">Ready for Review</option>
              <option value="Approved">Approved</option>
              <option value="Published">Published</option>
              <option value="Applications Open">Applications Open</option>
              <option value="Applications Closed">Applications Closed</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-zinc-600">
              Intern Pay: <strong className="text-zinc-900">₹{job.internPayment?.toLocaleString('en-IN')}</strong>
            </span>
            <span className="text-zinc-600">
              Client Billing: <strong className="text-zinc-900">₹{job.clientCommercial?.toLocaleString('en-IN')}</strong>
            </span>
            {(onDeleteJob || onDelete) && (
              <button
                onClick={() => {
                  if (confirm(`Are you sure you want to delete job ${job.jobId}?`)) {
                    if (onDeleteJob) onDeleteJob(job.id);
                    if (onDelete) onDelete();
                    onClose();
                  }
                }}
                className="text-rose-600 hover:text-rose-800 p-1 hover:bg-rose-50 rounded cursor-pointer"
                title="Delete Job"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-zinc-200 px-6 gap-6 text-xs font-medium overflow-x-auto bg-white">
          {[
            { id: 'overview', label: 'Overview', icon: Briefcase },
            { id: 'applications', label: 'Applications', count: job.applicationsCount || 0, icon: Users },
            { id: 'assigned', label: 'Assigned Interns', count: job.assignedInterns?.length || 0, icon: CheckSquare },
            { id: 'communication', label: 'Communication', icon: MessageSquare },
            { id: 'documents', label: 'Documents & Deliverables', icon: FileText },
            { id: 'tasks', label: 'Operations Tasks', icon: CheckSquare },
            { id: 'activity', label: 'Audit Trail', icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-zinc-900 text-zinc-900 font-semibold'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className="px-1.5 py-0.2 rounded-full bg-zinc-100 text-[10px] text-zinc-600 font-mono">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'overview' && (
            <div className="space-y-6 text-xs text-zinc-700">
              {/* Core Information Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-zinc-50 rounded-xl border border-zinc-200/80">
                <div>
                  <div className="text-[11px] text-zinc-400 font-medium">Normalized Role</div>
                  <div className="font-semibold text-zinc-900 mt-0.5">{job.normalizedRole}</div>
                </div>
                <div>
                  <div className="text-[11px] text-zinc-400 font-medium">Interns Needed</div>
                  <div className="font-semibold text-zinc-900 mt-0.5">{job.numberOfInterns} person(s)</div>
                </div>
                <div>
                  <div className="text-[11px] text-zinc-400 font-medium">Job Type</div>
                  <div className="font-semibold text-zinc-900 mt-0.5">{job.jobType}</div>
                </div>
                <div>
                  <div className="text-[11px] text-zinc-400 font-medium">Timings & Duration</div>
                  <div className="font-semibold text-zinc-900 mt-0.5">
                    {job.startTime} - {job.endTime} ({job.durationHours} hrs)
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-zinc-400 font-medium">Client POC</div>
                  <div className="font-semibold text-zinc-900 mt-0.5">
                    {job.clientContact?.pocName || 'POC not specified'} {job.clientContact?.pocPhone && `(${job.clientContact.pocPhone})`}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-zinc-400 font-medium">Source</div>
                  <div className="font-semibold text-zinc-900 mt-0.5">{job.source}</div>
                </div>
              </div>

              {/* Scope & Deliverables */}
              <div className="space-y-3">
                <h4 className="font-semibold text-zinc-900 text-sm">Scope of Work & Deliverables</h4>
                <div className="p-4 bg-white rounded-xl border border-zinc-200 space-y-2">
                  <div>
                    <span className="font-medium text-zinc-900">Primary Task: </span>
                    <span>{job.primaryTask || 'On-site execution'}</span>
                  </div>
                  {job.additionalTasks && job.additionalTasks.length > 0 && (
                    <div>
                      <span className="font-medium text-zinc-900">Additional Tasks: </span>
                      <ul className="list-disc list-inside mt-1 space-y-0.5 text-zinc-600">
                        {job.additionalTasks.map((t, idx) => (
                          <li key={idx}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {job.expectedDeliverables && job.expectedDeliverables.length > 0 && (
                    <div>
                      <span className="font-medium text-zinc-900">Deliverables: </span>
                      <span>{job.expectedDeliverables.join(', ')}</span>
                    </div>
                  )}
                  {job.deliveryDeadline && (
                    <div>
                      <span className="font-medium text-zinc-900">Delivery Deadline: </span>
                      <span>{job.deliveryDeadline}</span>
                    </div>
                  )}
                  {job.specialInstructions && (
                    <div className="p-2.5 bg-amber-50 rounded-lg text-amber-900 border border-amber-200 text-xs">
                      <strong>Special Instructions: </strong> {job.specialInstructions}
                    </div>
                  )}
                </div>
              </div>

              {/* Requirements & Equipment */}
              <div className="space-y-3">
                <h4 className="font-semibold text-zinc-900 text-sm">Requirements & Equipment</h4>
                <div className="p-4 bg-white rounded-xl border border-zinc-200 space-y-2">
                  <div>
                    <span className="font-medium text-zinc-900">Equipment: </span>
                    <span>{job.equipmentRequired?.join(', ') || 'None required'}</span>
                  </div>
                  {job.phoneRequirement && (
                    <div>
                      <span className="font-medium text-zinc-900">Phone Requirement: </span>
                      <span>{job.phoneRequirement}</span>
                    </div>
                  )}
                  {job.requiredSkills && job.requiredSkills.length > 0 && (
                    <div>
                      <span className="font-medium text-zinc-900">Required Skills: </span>
                      <span>{job.requiredSkills.join(', ')}</span>
                    </div>
                  )}
                  {job.dressCode && (
                    <div>
                      <span className="font-medium text-zinc-900">Dress Code: </span>
                      <span>{job.dressCode}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing Breakdown */}
              <div className="space-y-3">
                <h4 className="font-semibold text-zinc-900 text-sm">Commercials & Breakdown</h4>
                <div className="p-4 bg-white rounded-xl border border-zinc-200 space-y-2">
                  <div className="flex justify-between py-1 border-b border-zinc-100">
                    <span>Intern Pay (Total)</span>
                    <strong className="text-zinc-900">₹{job.internPayment?.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-100">
                    <span>Client Commercial (Total)</span>
                    <strong className="text-zinc-900">₹{job.clientCommercial?.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-zinc-100">
                    <span>Travel Included</span>
                    <span>{job.travelIncluded ? `Yes (₹${job.travelAmount})` : 'No'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Food Included</span>
                    <span>{job.foodIncluded ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'applications' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-zinc-900 text-sm">Applicants for this Gig</h4>
                <span className="text-xs text-zinc-500 font-mono">0 pending screening</span>
              </div>
              <div className="p-8 text-center bg-zinc-50 rounded-xl border border-zinc-200 text-zinc-500 text-xs">
                <Users className="w-8 h-8 mx-auto text-zinc-400 mb-2" />
                <p className="font-medium text-zinc-700">No applicants yet</p>
                <p className="text-[11px] mt-1">
                  Once this gig is published to the InternsHome WhatsApp community, student applications will appear here for shortlisting.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'assigned' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-zinc-900 text-sm">Assigned Interns</h4>
                <span className="text-xs text-zinc-500">Target: {job.numberOfInterns} intern(s)</span>
              </div>
              <div className="p-8 text-center bg-zinc-50 rounded-xl border border-zinc-200 text-zinc-500 text-xs">
                <CheckSquare className="w-8 h-8 mx-auto text-zinc-400 mb-2" />
                <p className="font-medium text-zinc-700">No interns assigned yet</p>
                <p className="text-[11px] mt-1">
                  Select shortlisted applicants to dispatch to this gig.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'communication' && (
            <div className="space-y-4 text-xs">
              <h4 className="font-semibold text-zinc-900 text-sm">Conversation Log</h4>
              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 space-y-3">
                <div>
                  <div className="font-semibold text-zinc-800 text-[11px] mb-1">Original Client Brief:</div>
                  <div className="p-3 bg-white rounded-lg border border-zinc-200 text-zinc-700 italic">
                    "{job.originalClientBrief || 'No original text recorded'}"
                  </div>
                </div>

                {job.clientClarifications && job.clientClarifications.length > 0 && (
                  <div>
                    <div className="font-semibold text-zinc-800 text-[11px] mb-1">Follow-up Clarifications:</div>
                    {job.clientClarifications.map((c, i) => (
                      <div key={i} className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900 mb-2">
                        <div className="text-[10px] text-emerald-700 mb-0.5">{new Date(c.timestamp).toLocaleString()}</div>
                        <div>"{c.text}"</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-4 text-xs">
              <h4 className="font-semibold text-zinc-900 text-sm">Documents & Deliverables Link</h4>
              <div className="p-4 bg-white rounded-xl border border-zinc-200 space-y-3">
                <div>
                  <label className="block text-zinc-500 mb-1 font-medium">Google Drive Work Link</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value="https://drive.google.com/drive/folders/internshome-rai"
                      className="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-xs text-zinc-600"
                    />
                    <a
                      href="https://drive.google.com"
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open Drive
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-4 text-xs">
              <h4 className="font-semibold text-zinc-900 text-sm">Operations Checklist</h4>
              <div className="space-y-2">
                {tasksList.map((task, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 bg-white rounded-xl border border-zinc-200"
                  >
                    <input
                      type="checkbox"
                      defaultChecked={task.done}
                      className="w-4 h-4 text-zinc-900 rounded border-zinc-300 focus:ring-zinc-900"
                    />
                    <span className={`text-xs ${task.done ? 'line-through text-zinc-400' : 'text-zinc-800 font-medium'}`}>
                      {task.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-4 text-xs">
              <h4 className="font-semibold text-zinc-900 text-sm">Audit Trail</h4>
              <div className="space-y-3 border-l-2 border-zinc-200 pl-4 ml-2">
                <div className="relative">
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-900 absolute -left-[21px] top-1" />
                  <div className="font-medium text-zinc-900">Job Record Created</div>
                  <div className="text-[11px] text-zinc-500">
                    Created by {job.createdBy || 'Operations'} on {new Date(job.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="relative">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 absolute -left-[21px] top-1" />
                  <div className="font-medium text-zinc-900">Current Status: {job.status}</div>
                  <div className="text-[11px] text-zinc-500">Last updated {new Date(job.updatedAt).toLocaleString()}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
