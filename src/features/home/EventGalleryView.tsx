import React, { useState } from 'react';
import {
  Calendar,
  MapPin,
  Users,
  ExternalLink,
  Plus,
  X,
  ChevronRight,
  FolderOpen,
  Image as ImageIcon,
  CheckCircle2,
  Link as LinkIcon,
  Eye,
  AlertCircle,
  FileText,
} from 'lucide-react';
import {
  InternsHomeEvent,
  EventMedia,
} from '../../types/crm';
import { addDriveLinkToEventGallery } from '../../services/lumaEventService';
import { parseGoogleDriveUrl } from '../../utils/driveUtils';

interface EventGalleryViewProps {
  events: InternsHomeEvent[];
  media: EventMedia[];
}

export const EventGalleryView: React.FC<EventGalleryViewProps> = ({ events, media }) => {
  const [selectedEvent, setSelectedEvent] = useState<InternsHomeEvent | null>(null);
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [targetEventId, setTargetEventId] = useState<string>(events[0]?.id || '');
  const [driveUrlInput, setDriveUrlInput] = useState('');
  const [caption, setCaption] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [activeDrivePreview, setActiveDrivePreview] = useState<string | null>(null);

  // Group media by event
  const getEventMedia = (evtId: string) => {
    return media.filter((m) => m.eventId === evtId);
  };

  const parsedInputDrive = parseGoogleDriveUrl(driveUrlInput);

  const formatEventDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  const handleDriveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driveUrlInput.trim() || !targetEventId) return;
    setIsSaving(true);
    try {
      const targetEvent = events.find((ev) => ev.id === targetEventId);
      await addDriveLinkToEventGallery(
        targetEventId,
        targetEvent?.name || 'InternsHome Event',
        driveUrlInput.trim(),
        caption.trim() || (parsedInputDrive.type === 'folder' ? `Google Drive Photo Album: ${targetEvent?.name}` : `Event Photo: ${targetEvent?.name}`)
      );
      setDriveUrlInput('');
      setCaption('');
      setShowDriveModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Editorial Header */}
      <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Event Gallery & Drive Archives</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
              Google Drive Integrated
            </span>
          </div>
          <p className="text-xs text-zinc-500 max-w-xl">
            A visual retrospective of InternsHome offline workshops, creator bootcamps, and career summits.
            Upload Google Drive links to browse high-resolution event albums directly in the CRM.
          </p>
        </div>

        {/* User requested button label: "add drive link of the event photos" */}
        <button
          onClick={() => {
            if (events.length > 0) setTargetEventId(events[0].id);
            setShowDriveModal(true);
          }}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white shadow-2xs transition cursor-pointer self-start md:self-auto"
        >
          <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
          <span>Add drive link of the event photos</span>
        </button>
      </div>

      {/* Visual Editorial Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {events.map((evt) => {
          const evtPhotos = getEventMedia(evt.id);
          const hasDriveAlbum = evt.driveFolderUrl || evtPhotos.some((m) => m.isDriveLink);

          return (
            <div
              key={evt.id}
              onClick={() => setSelectedEvent(evt)}
              className="group bg-white rounded-2xl border border-zinc-200/80 overflow-hidden hover:shadow-md transition duration-200 flex flex-col cursor-pointer"
            >
              {/* Cover Card with Hover Zoom */}
              <div className="relative aspect-16/10 w-full bg-zinc-900 overflow-hidden">
                <img
                  src={evt.coverImage || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=80'}
                  alt={evt.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500 opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Status & Media Count */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/60 text-white backdrop-blur-xs">
                    {evt.city}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {hasDriveAlbum && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-600/90 text-white backdrop-blur-xs">
                        <FolderOpen className="w-2.5 h-2.5" />
                        <span>Drive Folder</span>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/60 text-white backdrop-blur-xs">
                      <ImageIcon className="w-3 h-3" />
                      <span>{evtPhotos.length + 1} assets</span>
                    </span>
                  </div>
                </div>

                {/* Bottom Overlay Title */}
                <div className="absolute bottom-3 left-3 right-3 text-white space-y-0.5">
                  <h3 className="font-bold text-base line-clamp-1 leading-snug drop-shadow-xs">
                    {evt.name}
                  </h3>
                  <div className="flex items-center gap-3 text-[11px] text-zinc-300">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-zinc-400" />
                      {formatEventDate(evt.startAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3 text-zinc-400" />
                      {evt.attendanceCount > 0 ? `${evt.attendanceCount} attended` : `${evt.registrationCount} registered`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Card Snippet */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed">
                  {evt.description}
                </p>

                <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-zinc-500 font-medium truncate max-w-[200px]">
                    📍 {evt.venue}
                  </span>
                  <span className="text-[11px] font-semibold text-zinc-900 group-hover:text-indigo-600 inline-flex items-center gap-0.5 transition">
                    View Gallery & Drive <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Event Visual Detail Showcase Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-zinc-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Visual Hero Header */}
            <div className="relative h-52 md:h-60 w-full bg-zinc-950 overflow-hidden shrink-0">
              <img
                src={selectedEvent.coverImage}
                alt={selectedEvent.name}
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />

              <button
                onClick={() => setSelectedEvent(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="absolute bottom-4 left-5 right-5 text-white space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500 text-white">
                    Luma Event Showcase
                  </span>
                  {selectedEvent.driveFolderUrl && (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white flex items-center gap-1">
                      <FolderOpen className="w-3 h-3" /> Drive Folder Linked
                    </span>
                  )}
                </div>
                <h2 className="text-xl md:text-2xl font-bold tracking-tight">
                  {selectedEvent.name}
                </h2>
                <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-300">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                    {formatEventDate(selectedEvent.startAt)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                    {selectedEvent.venue}, {selectedEvent.city}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-zinc-400" />
                    {selectedEvent.attendanceCount > 0
                      ? `${selectedEvent.attendanceCount} verified attendees`
                      : `${selectedEvent.registrationCount} registrations`}
                  </span>
                </div>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Google Drive Album Banner & Embedded Preview */}
              {selectedEvent.driveFolderUrl && (
                <div className="p-4 bg-blue-50/70 border border-blue-200/90 rounded-2xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <FolderOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-zinc-900">Official Google Drive Event Photo Album</h4>
                        <p className="text-[11px] text-zinc-500">
                          {selectedEvent.driveFolderUrl}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const parsed = parseGoogleDriveUrl(selectedEvent.driveFolderUrl || '');
                          if (activeDrivePreview === selectedEvent.id) {
                            setActiveDrivePreview(null);
                          } else {
                            setActiveDrivePreview(selectedEvent.id);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-blue-300 text-blue-800 hover:bg-blue-100 transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>{activeDrivePreview === selectedEvent.id ? 'Hide Embed' : 'Preview in CRM'}</span>
                      </button>
                      <a
                        href={selectedEvent.driveFolderUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition shadow-2xs"
                      >
                        <span>Open Drive</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  {/* Interactive In-CRM Drive Preview iframe */}
                  {activeDrivePreview === selectedEvent.id && (
                    <div className="pt-2 animate-in fade-in duration-200">
                      <div className="relative rounded-xl overflow-hidden border border-blue-300 bg-white shadow-xs">
                        {(() => {
                          const parsed = parseGoogleDriveUrl(selectedEvent.driveFolderUrl || '');
                          return (
                            <iframe
                              src={parsed.embedUrl || `https://drive.google.com/embeddedfolderview?id=${parsed.id}#grid`}
                              className="w-full h-80 border-0"
                              title="Google Drive Folder Preview"
                              allow="autoplay"
                            />
                          );
                        })()}
                      </div>
                      <span className="text-[10px] text-zinc-400 mt-1 block">
                        * Note: To view folder contents in embedded preview, ensure the Google Drive folder sharing permissions are set to &quot;Anyone with the link can view&quot;.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Photo & Drive Media Showcase */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
                      Event Photos & Drive Links ({getEventMedia(selectedEvent.id).length} items)
                    </h3>
                    <span className="text-[11px] text-zinc-500">Curated community photos and Drive links</span>
                  </div>
                  <button
                    onClick={() => {
                      setTargetEventId(selectedEvent.id);
                      setShowDriveModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition cursor-pointer"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
                    <span>Add drive link of the event photos</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {getEventMedia(selectedEvent.id).length === 0 ? (
                    <div className="col-span-3 py-10 text-center text-zinc-400 text-xs bg-zinc-50 rounded-xl border border-dashed border-zinc-200 space-y-2">
                      <FolderOpen className="w-8 h-8 text-zinc-300 mx-auto" />
                      <p>No photos or Drive links added yet for this event.</p>
                      <button
                        onClick={() => {
                          setTargetEventId(selectedEvent.id);
                          setShowDriveModal(true);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      >
                        + Add drive link of the event photos
                      </button>
                    </div>
                  ) : (
                    getEventMedia(selectedEvent.id).map((item) => {
                      const isDrive = item.isDriveLink || item.type === 'drive_album';
                      return (
                        <div
                          key={item.id}
                          className="group relative rounded-xl overflow-hidden border border-zinc-200 bg-zinc-100 flex flex-col"
                        >
                          {/* Image or Drive Banner */}
                          <div className="relative aspect-4/3 w-full bg-zinc-900 overflow-hidden">
                            {item.url && item.url.startsWith('http') && !item.url.includes('drive.google.com/drive/folders') ? (
                              <img
                                src={item.url}
                                alt={item.caption}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-blue-900 via-indigo-900 to-zinc-900 p-4 flex flex-col justify-between text-white">
                                <div className="flex items-center justify-between">
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-500/80 text-white">
                                    Google Drive Album
                                  </span>
                                  <FolderOpen className="w-5 h-5 text-blue-300" />
                                </div>
                                <div className="space-y-1">
                                  <h4 className="text-xs font-bold line-clamp-2">{item.caption}</h4>
                                  <span className="text-[10px] text-zinc-300">Click to view in Google Drive</span>
                                </div>
                              </div>
                            )}

                            {isDrive && (
                              <div className="absolute top-2 right-2">
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-blue-600 text-white shadow-xs">
                                  Drive Link
                                </span>
                              </div>
                            )}

                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition p-3 flex flex-col justify-end">
                              <p className="text-xs font-medium text-white">{item.caption}</p>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-[10px] text-zinc-300">{item.uploadedBy}</span>
                                {item.url && (
                                  <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-1 rounded bg-white/20 text-white hover:bg-white/40 transition"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Card bottom text */}
                          <div className="p-2.5 bg-white border-t border-zinc-100 flex items-center justify-between">
                            <span className="text-[11px] font-medium text-zinc-800 truncate max-w-[180px]">
                              {item.caption}
                            </span>
                            {item.url && (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-blue-600 font-semibold hover:underline inline-flex items-center gap-0.5"
                              >
                                <span>Open</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Drive Link Modal */}
      {showDriveModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-zinc-200 overflow-hidden">
            <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-zinc-900">Add Drive Link of Event Photos</h3>
              </div>
              <button
                onClick={() => setShowDriveModal(false)}
                className="w-6 h-6 rounded-full hover:bg-zinc-100 text-zinc-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDriveSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Target Event *</label>
                <select
                  value={targetEventId}
                  onChange={(e) => setTargetEventId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                >
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name} ({formatEventDate(ev.startAt)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Google Drive Link of Event Photos *</label>
                <input
                  type="url"
                  required
                  placeholder="https://drive.google.com/drive/folders/1ABCxyz... or /file/d/..."
                  value={driveUrlInput}
                  onChange={(e) => setDriveUrlInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
                <span className="text-[10px] text-zinc-400 mt-1 block">
                  Paste the Google Drive folder link or individual photo link. The CRM will embed and preview the folder automatically.
                </span>
              </div>

              {/* Instant Drive Detection & In-CRM Preview */}
              {driveUrlInput.trim().length > 15 && (
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-700 flex items-center gap-1.5">
                      <CheckCircle2 className={`w-3.5 h-3.5 ${parsedInputDrive.isDriveLink ? 'text-emerald-600' : 'text-amber-500'}`} />
                      <span>{parsedInputDrive.label}</span>
                    </span>
                    <span className="text-[10px] uppercase font-bold text-zinc-400">
                      {parsedInputDrive.type}
                    </span>
                  </div>

                  {parsedInputDrive.type === 'folder' && parsedInputDrive.embedUrl && (
                    <div className="rounded-lg overflow-hidden border border-zinc-200 bg-white">
                      <iframe
                        src={parsedInputDrive.embedUrl}
                        className="w-full h-44 border-0"
                        title="Drive Folder Live Preview"
                      />
                    </div>
                  )}

                  {parsedInputDrive.type === 'file' && parsedInputDrive.thumbnailUrl && (
                    <div className="rounded-lg overflow-hidden border border-zinc-200 bg-zinc-900 h-36 flex items-center justify-center">
                      <img
                        src={parsedInputDrive.thumbnailUrl}
                        alt="Drive File Preview"
                        className="max-h-full max-w-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Album Title / Caption</label>
                <input
                  type="text"
                  placeholder="e.g. Official Photographer Drive Album, Booth Photos, etc."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowDriveModal(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-900 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-1.5 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
                  <span>{isSaving ? 'Saving Drive Link...' : 'Save Drive Link'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
