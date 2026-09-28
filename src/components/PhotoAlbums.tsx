import React from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Cloud,
  Copy,
  ExternalLink,
  FolderOpen,
  HardDrive,
  ImagePlus,
  Images,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Save,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UploadCloud,
  Users,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import type { PhotoAlbum, PhotoAlbumFile, Student } from '../types';
import { evaluatePhotoAlbumSharing, isPhotoAlbumShareExpired, photoPermissionLabel } from '../lib/photoAlbumPolicy';
import {
  connectOneDrive,
  getValidOneDriveToken,
  readOneDriveToken,
} from '../lib/oneDriveSession';

const MAX_PHOTO_BYTES = 25 * 1024 * 1024;
const DEFAULT_SHARE_DAYS = 30;

function makeId(prefix: string): string {
  const random = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
  return `${prefix}-${random}`;
}

function formatDate(value?: string): string {
  if (!value) return 'Kein Datum';
  const date = new Date(value.length <= 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('de-AT');
}

function albumStatus(album: PhotoAlbum): 'shared' | 'expired' | 'draft' {
  if (!album.shareUrl) return 'draft';
  return isPhotoAlbumShareExpired(album.shareExpiresAt) ? 'expired' : 'shared';
}

function uniqueFiles(files: PhotoAlbumFile[]): PhotoAlbumFile[] {
  const seen = new Set<string>();
  return files.filter(file => {
    const key = file.driveItemId || file.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function PhotoAlbums() {
  const { app, setApp } = useApp();
  const { showToast } = useToast();
  const activeClassId = app.activeClassId || 'legacy-class';
  const students = app.schueler || [];

  const albums = React.useMemo(
    () => (app.photoAlbums || [])
      .filter(album => album.classId === activeClassId)
      .sort((a, b) => (b.eventDate || b.createdAt).localeCompare(a.eventDate || a.createdAt)),
    [app.photoAlbums, activeClassId],
  );

  const [selectedAlbumId, setSelectedAlbumId] = React.useState<string | null>(albums[0]?.id || null);
  const [showCreate, setShowCreate] = React.useState(albums.length === 0);
  const [oneDriveConnected, setOneDriveConnected] = React.useState(() => Boolean(readOneDriveToken()));
  const [connecting, setConnecting] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [sharing, setSharing] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState({ done: 0, total: 0 });
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [draftTitle, setDraftTitle] = React.useState('');
  const [draftDescription, setDraftDescription] = React.useState('');
  const [draftDate, setDraftDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [draftStudentIds, setDraftStudentIds] = React.useState<string[]>([]);
  const [draftNoIdentifiableStudents, setDraftNoIdentifiableStudents] = React.useState(false);
  const [shareDays, setShareDays] = React.useState(DEFAULT_SHARE_DAYS);
  const [shareConsentConfirmed, setShareConsentConfirmed] = React.useState(false);
  const [editingAlbum, setEditingAlbum] = React.useState(false);
  const [editTitle, setEditTitle] = React.useState('');
  const [editDescription, setEditDescription] = React.useState('');
  const [editDate, setEditDate] = React.useState('');
  const [editStudentIds, setEditStudentIds] = React.useState<string[]>([]);
  const [editNoIdentifiableStudents, setEditNoIdentifiableStudents] = React.useState(false);

  React.useEffect(() => {
    if (selectedAlbumId && albums.some(album => album.id === selectedAlbumId)) return;
    setSelectedAlbumId(albums[0]?.id || null);
  }, [albums, selectedAlbumId]);

  const selectedAlbum = albums.find(album => album.id === selectedAlbumId) || null;
  const selectedStudents = React.useMemo(
    () => students.filter(student => selectedAlbum?.studentIds.includes(student.id)),
    [students, selectedAlbum],
  );
  const selectedPolicy = evaluatePhotoAlbumSharing(
    selectedStudents,
    selectedAlbum?.noIdentifiableStudents === true,
  );
  const selectedShareExpired = Boolean(
    selectedAlbum?.shareUrl && isPhotoAlbumShareExpired(selectedAlbum.shareExpiresAt),
  );
  const shareSafetyProblem = Boolean(
    selectedAlbum?.shareUrl && !selectedShareExpired && !selectedPolicy.canShare,
  );

  React.useEffect(() => {
    setShareConsentConfirmed(false);
    setShareDays(DEFAULT_SHARE_DAYS);
    setEditingAlbum(false);
  }, [selectedAlbumId]);

  const patchAlbum = React.useCallback((albumId: string, patch: Partial<PhotoAlbum>) => {
    setApp(prev => ({
      ...prev,
      photoAlbums: (prev.photoAlbums || []).map(album =>
        album.id === albumId
          ? { ...album, ...patch, updatedAt: new Date().toISOString() }
          : album
      ),
    }));
  }, [setApp]);

  const beginEditAlbum = () => {
    if (!selectedAlbum) return;
    setEditTitle(selectedAlbum.title);
    setEditDescription(selectedAlbum.description || '');
    setEditDate(selectedAlbum.eventDate || '');
    setEditStudentIds(selectedAlbum.studentIds || []);
    setEditNoIdentifiableStudents(selectedAlbum.noIdentifiableStudents === true);
    setEditingAlbum(true);
  };

  const saveAlbumEdits = () => {
    if (!selectedAlbum) return;
    const title = editTitle.trim();
    if (!title) {
      showToast('Bitte einen Albumnamen eingeben.', 'error');
      return;
    }
    if (!editNoIdentifiableStudents && editStudentIds.length === 0) {
      showToast('Bitte abgebildete Kinder auswählen oder „Keine Kinder erkennbar“ bestätigen.', 'error');
      return;
    }

    const editedStudents = students.filter(student => editStudentIds.includes(student.id));
    const editedPolicy = evaluatePhotoAlbumSharing(editedStudents, editNoIdentifiableStudents);
    if (selectedAlbum.shareUrl && !selectedShareExpired && !editedPolicy.canShare) {
      showToast('Bitte zuerst den aktiven Elternlink beenden. Die neue Auswahl wäre nicht freigegeben.', 'error');
      return;
    }

    patchAlbum(selectedAlbum.id, {
      title,
      description: editDescription.trim() || undefined,
      eventDate: editDate || undefined,
      studentIds: editNoIdentifiableStudents ? [] : editStudentIds,
      noIdentifiableStudents: editNoIdentifiableStudents,
    });
    setEditingAlbum(false);
    showToast('Albumdaten aktualisiert.', 'success');
  };

  const handleCreateAlbum = () => {
    const title = draftTitle.trim();
    if (!title) {
      showToast('Bitte einen Albumnamen eingeben.', 'error');
      return;
    }
    if (!draftNoIdentifiableStudents && draftStudentIds.length === 0) {
      showToast('Bitte abgebildete Kinder auswählen oder „Keine Kinder erkennbar“ bestätigen.', 'error');
      return;
    }

    const album: PhotoAlbum = {
      id: makeId('photoalbum'),
      classId: activeClassId,
      title,
      description: draftDescription.trim() || undefined,
      eventDate: draftDate || undefined,
      studentIds: draftNoIdentifiableStudents ? [] : draftStudentIds,
      noIdentifiableStudents: draftNoIdentifiableStudents,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      files: [],
    };

    setApp(prev => ({
      ...prev,
      photoAlbums: [...(prev.photoAlbums || []), album],
    }));
    setSelectedAlbumId(album.id);
    setShowCreate(false);
    setDraftTitle('');
    setDraftDescription('');
    setDraftStudentIds([]);
    setDraftNoIdentifiableStudents(false);
    showToast('Fotoalbum angelegt.', 'success');
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await connectOneDrive();
      setOneDriveConnected(true);
      showToast('OneDrive ist verbunden.', 'success');
    } catch (error: any) {
      showToast(error?.message || 'OneDrive-Verbindung fehlgeschlagen.', 'error');
    } finally {
      setConnecting(false);
    }
  };

  const tokenOrConnect = async (): Promise<string | null> => {
    let token = await getValidOneDriveToken();
    if (token) {
      setOneDriveConnected(true);
      return token;
    }

    try {
      await connectOneDrive();
      setOneDriveConnected(true);
      token = await getValidOneDriveToken();
      return token;
    } catch (error: any) {
      showToast(error?.message || 'Bitte OneDrive verbinden.', 'error');
      return null;
    }
  };

  const handleUpload = async (fileList: FileList | null) => {
    if (!selectedAlbum || !fileList?.length) return;

    const files = Array.from(fileList).filter(file => {
      if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
        showToast(`${file.name}: Dieses Bildformat wird nicht unterstützt.`, 'error');
        return false;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        showToast(`${file.name}: Maximal 25 MB pro Foto.`, 'error');
        return false;
      }
      return true;
    });
    if (!files.length) return;

    const token = await tokenOrConnect();
    if (!token) return;

    setUploading(true);
    setUploadProgress({ done: 0, total: files.length });

    let folderId = selectedAlbum.oneDriveFolderId;
    let folderWebUrl = selectedAlbum.oneDriveFolderWebUrl;
    const uploaded: PhotoAlbumFile[] = [];

    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const headers: Record<string, string> = {
          Authorization: `Bearer ${token}`,
          'Content-Type': file.type || 'application/octet-stream',
          'X-Klassio-Album-Id': encodeURIComponent(selectedAlbum.id),
          'X-Klassio-Album-Title': encodeURIComponent(selectedAlbum.title),
          'X-Klassio-Filename': encodeURIComponent(file.name),
        };
        if (folderId) headers['X-Klassio-Folder-Id'] = encodeURIComponent(folderId);

        const response = await fetch('/api/onedrive/photos/upload', {
          method: 'PUT',
          headers,
          body: file,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data?.error || `Upload von ${file.name} fehlgeschlagen.`);
        }

        folderId = data.folder?.id || folderId;
        folderWebUrl = data.folder?.webUrl || folderWebUrl;
        uploaded.push({
          id: makeId('photo'),
          name: data.file?.name || file.name,
          size: Number(data.file?.size ?? file.size),
          mimeType: file.type,
          uploadedAt: new Date().toISOString(),
          driveItemId: data.file?.id,
          webUrl: data.file?.webUrl,
        });
        setUploadProgress({ done: index + 1, total: files.length });
      }

      const currentFiles = selectedAlbum.files || [];
      patchAlbum(selectedAlbum.id, {
        oneDriveFolderId: folderId,
        oneDriveFolderWebUrl: folderWebUrl,
        files: uniqueFiles([...currentFiles, ...uploaded]),
      });
      showToast(`${uploaded.length} Foto${uploaded.length === 1 ? '' : 's'} hochgeladen.`, 'success');
    } catch (error: any) {
      showToast(error?.message || 'Foto-Upload fehlgeschlagen.', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleShare = async () => {
    if (!selectedAlbum?.oneDriveFolderId) {
      showToast('Bitte zuerst mindestens ein Foto hochladen.', 'error');
      return;
    }
    if (!selectedPolicy.canShare) {
      showToast('Die Foto-Freigaben erlauben dieses Elternalbum noch nicht.', 'error');
      return;
    }

    const token = await tokenOrConnect();
    if (!token) return;

    setSharing(true);
    try {
      const expiresAt = new Date(Date.now() + DEFAULT_SHARE_DAYS * 24 * 60 * 60 * 1000);
      const response = await fetch('/api/onedrive/photos/share', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folderId: selectedAlbum.oneDriveFolderId,
          expirationDateTime: expiresAt.toISOString(),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Freigabelink konnte nicht erstellt werden.');

      patchAlbum(selectedAlbum.id, {
        shareUrl: data.shareUrl,
        sharePermissionId: data.permissionId,
        shareCreatedAt: new Date().toISOString(),
        shareExpiresAt: data.expirationDateTime || expiresAt.toISOString(),
      });
      showToast('Elternlink wurde erstellt.', 'success');
    } catch (error: any) {
      showToast(error?.message || 'Freigabelink konnte nicht erstellt werden.', 'error');
    } finally {
      setSharing(false);
    }
  };

  const handleUnshare = async () => {
    if (!selectedAlbum?.oneDriveFolderId || !selectedAlbum.sharePermissionId) {
      patchAlbum(selectedAlbum!.id, {
        shareUrl: undefined,
        sharePermissionId: undefined,
        shareCreatedAt: undefined,
        shareExpiresAt: undefined,
      });
      return;
    }

    const token = await tokenOrConnect();
    if (!token) return;

    setSharing(true);
    try {
      const response = await fetch('/api/onedrive/photos/unshare', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          folderId: selectedAlbum.oneDriveFolderId,
          permissionId: selectedAlbum.sharePermissionId,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Freigabe konnte nicht beendet werden.');

      patchAlbum(selectedAlbum.id, {
        shareUrl: undefined,
        sharePermissionId: undefined,
        shareCreatedAt: undefined,
        shareExpiresAt: undefined,
      });
      showToast('Elternlink wurde deaktiviert.', 'success');
    } catch (error: any) {
      showToast(error?.message || 'Freigabe konnte nicht beendet werden.', 'error');
    } finally {
      setSharing(false);
    }
  };

  const copyParentMessage = async () => {
    if (!selectedAlbum?.shareUrl) return;
    const expiry = selectedAlbum.shareExpiresAt
      ? ` Der Link ist bis ${formatDate(selectedAlbum.shareExpiresAt)} gültig.`
      : '';
    const message = `Fotos: ${selectedAlbum.title}\n\nHier können Sie die Fotos ansehen:\n${selectedAlbum.shareUrl}\n\n${expiry.trim()}`.trim();
    try {
      await navigator.clipboard.writeText(message);
      showToast('Elternnachricht kopiert.', 'success');
    } catch {
      showToast('Kopieren wurde vom Browser blockiert.', 'error');
    }
  };

  const removeAlbum = (album: PhotoAlbum) => {
    const confirmed = window.confirm(
      `„${album.title}“ aus KLASSIO entfernen? Die Fotos im OneDrive werden dabei nicht gelöscht.`
    );
    if (!confirmed) return;
    setApp(prev => ({
      ...prev,
      photoAlbums: (prev.photoAlbums || []).filter(item => item.id !== album.id),
    }));
    showToast('Album aus KLASSIO entfernt. OneDrive-Dateien bleiben erhalten.', 'success');
  };

  const permissionPill = (student: Student) => {
    const status = student.fotoFreigabe;
    const className =
      status === 'erlaubt'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : status === 'nur_homepage'
          ? 'bg-amber-50 text-amber-700 border-amber-200'
          : 'bg-rose-50 text-rose-700 border-rose-200';
    return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${className}`}>{photoPermissionLabel(status)}</span>;
  };

  return (
    <div className="min-h-full bg-[var(--surface-app,var(--bg))] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-[28px] border border-[var(--border-default,var(--border))] bg-[var(--surface-card,var(--surface))] p-5 sm:p-7 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-[var(--accent-soft)] p-3 text-[var(--accent)]">
                <Images size={26} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[var(--text-muted,var(--text3))]">Klasse & Eltern</p>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-[var(--text-primary,var(--text))]">Elternfotos</h1>
                <p className="mt-1 max-w-2xl text-sm font-medium leading-relaxed text-[var(--text-secondary,var(--text2))]">
                  Alben in KLASSIO verwalten, Fotos direkt im verbundenen OneDrive speichern und einen zeitlich begrenzten Elternlink erstellen.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleConnect}
                disabled={connecting}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-black transition-colors disabled:opacity-60 ${
                  oneDriveConnected
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-[var(--border-default,var(--border))] bg-[var(--surface-subtle,var(--surface2))] text-[var(--text-primary,var(--text))]'
                }`}
              >
                {connecting ? <Loader2 size={16} className="animate-spin" /> : <Cloud size={16} />}
                {oneDriveConnected ? 'OneDrive verbunden' : 'OneDrive verbinden'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-xs font-black text-[var(--accent-text,#fff)] shadow-sm"
              >
                <Plus size={16} /> Neues Album
              </button>
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="space-y-3">
            {albums.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-[var(--border-default,var(--border))] bg-[var(--surface-card,var(--surface))] p-6 text-center">
                <ImagePlus size={30} className="mx-auto text-[var(--text-muted,var(--text3))]" />
                <p className="mt-3 text-sm font-black text-[var(--text-primary,var(--text))]">Noch kein Fotoalbum</p>
                <p className="mt-1 text-xs text-[var(--text-secondary,var(--text2))]">Lege zuerst ein Album für einen Ausflug, ein Projekt oder ein Klassenereignis an.</p>
              </div>
            ) : albums.map(album => {
              const selected = album.id === selectedAlbumId;
              const status = albumStatus(album);
              return (
                <button
                  type="button"
                  key={album.id}
                  onClick={() => setSelectedAlbumId(album.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition-all ${
                    selected
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)] shadow-sm'
                      : 'border-[var(--border-default,var(--border))] bg-[var(--surface-card,var(--surface))] hover:border-[var(--accent)]/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[var(--text-primary,var(--text))]">{album.title}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-[var(--text-muted,var(--text3))]">
                        <CalendarDays size={12} /> {formatDate(album.eventDate || album.createdAt)}
                      </p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-wider ${
                      status === 'shared' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {status === 'shared' ? 'Geteilt' : 'Entwurf'}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-[var(--text-secondary,var(--text2))]">
                    <span>{album.files?.length || 0} Fotos</span>
                    <span>{album.noIdentifiableStudents ? 'keine Kinder erkennbar' : `${album.studentIds.length} Kinder`}</span>
                  </div>
                </button>
              );
            })}
          </aside>

          <main className="min-w-0">
            {showCreate ? (
              <section className="rounded-[28px] border border-[var(--border-default,var(--border))] bg-[var(--surface-card,var(--surface))] p-5 sm:p-7 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted,var(--text3))]">Neues Album</p>
                    <h2 className="mt-1 text-xl font-black text-[var(--text-primary,var(--text))]">Fotos vorbereiten</h2>
                  </div>
                  {albums.length > 0 && (
                    <button type="button" onClick={() => setShowCreate(false)} className="rounded-xl p-2 text-[var(--text-muted,var(--text3))] hover:bg-[var(--surface-subtle,var(--surface2))]">
                      <X size={18} />
                    </button>
                  )}
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <label className="space-y-1.5 md:col-span-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-[var(--text-secondary,var(--text2))]">Albumname</span>
                    <input
                      value={draftTitle}
                      onChange={event => setDraftTitle(event.target.value)}
                      placeholder="z. B. Wandertag September"
                      className="w-full rounded-xl border border-[var(--border-default,var(--border))] bg-[var(--surface-subtle,var(--surface2))] px-4 py-3 text-sm font-bold text-[var(--text-primary,var(--text))] outline-none focus:border-[var(--accent)]"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-[11px] font-black uppercase tracking-wider text-[var(--text-secondary,var(--text2))]">Datum</span>
                    <input
                      type="date"
                      value={draftDate}
                      onChange={event => setDraftDate(event.target.value)}
                      className="w-full rounded-xl border border-[var(--border-default,var(--border))] bg-[var(--surface-subtle,var(--surface2))] px-4 py-3 text-sm font-bold text-[var(--text-primary,var(--text))] outline-none focus:border-[var(--accent)]"
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-[11px] font-black uppercase tracking-wider text-[var(--text-secondary,var(--text2))]">Kurzbeschreibung</span>
                    <input
                      value={draftDescription}
                      onChange={event => setDraftDescription(event.target.value)}
                      placeholder="optional"
                      className="w-full rounded-xl border border-[var(--border-default,var(--border))] bg-[var(--surface-subtle,var(--surface2))] px-4 py-3 text-sm font-bold text-[var(--text-primary,var(--text))] outline-none focus:border-[var(--accent)]"
                    />
                  </label>
                </div>

                <div className="mt-6 rounded-2xl border border-[var(--border-default,var(--border))] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-black text-[var(--text-primary,var(--text))]"><Users size={16} /> Welche Kinder sind auf den Fotos erkennbar?</p>
                      <p className="mt-1 text-xs text-[var(--text-secondary,var(--text2))]">KLASSIO prüft diese Auswahl vor dem Teilen.</p>
                    </div>
                    <button
                      type="button"
                      disabled={draftNoIdentifiableStudents}
                      onClick={() => setDraftStudentIds(students.filter(student => student.fotoFreigabe === 'erlaubt').map(student => student.id))}
                      className="rounded-lg border border-[var(--border-default,var(--border))] px-3 py-2 text-[10px] font-black text-[var(--text-secondary,var(--text2))] disabled:opacity-40"
                    >
                      Alle mit Freigabe
                    </button>
                  </div>

                  <label className="mt-4 flex items-start gap-3 rounded-xl bg-[var(--surface-subtle,var(--surface2))] p-3">
                    <input
                      type="checkbox"
                      checked={draftNoIdentifiableStudents}
                      onChange={event => {
                        setDraftNoIdentifiableStudents(event.target.checked);
                        if (event.target.checked) setDraftStudentIds([]);
                      }}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="block text-xs font-black text-[var(--text-primary,var(--text))]">Auf den Fotos sind keine Kinder identifizierbar</span>
                      <span className="block text-[11px] text-[var(--text-secondary,var(--text2))]">Nur verwenden, wenn tatsächlich kein Kind erkennbar ist.</span>
                    </span>
                  </label>

                  {!draftNoIdentifiableStudents && (
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {students.map(student => {
                        const checked = draftStudentIds.includes(student.id);
                        return (
                          <label key={student.id} className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3 ${
                            checked ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border-default,var(--border))]'
                          }`}>
                            <span className="flex min-w-0 items-center gap-2">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={event => setDraftStudentIds(prev =>
                                  event.target.checked
                                    ? [...prev, student.id]
                                    : prev.filter(id => id !== student.id)
                                )}
                              />
                              <span className="truncate text-xs font-bold text-[var(--text-primary,var(--text))]">
                                {[student.vorname, student.nachname].filter(Boolean).join(' ') || student.name}
                              </span>
                            </span>
                            {permissionPill(student)}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end">
                  <button type="button" onClick={handleCreateAlbum} className="rounded-xl bg-[var(--accent)] px-5 py-3 text-xs font-black text-[var(--accent-text,#fff)]">
                    Album anlegen
                  </button>
                </div>
              </section>
            ) : selectedAlbum ? (
              <section className="space-y-5">
                <div className="rounded-[28px] border border-[var(--border-default,var(--border))] bg-[var(--surface-card,var(--surface))] p-5 sm:p-7 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-black text-[var(--text-primary,var(--text))]">{selectedAlbum.title}</h2>
                        {selectedAlbum.shareUrl && <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-700">Elternlink aktiv</span>}
                      </div>
                      <p className="mt-1 text-xs font-bold text-[var(--text-muted,var(--text3))]">{formatDate(selectedAlbum.eventDate || selectedAlbum.createdAt)}</p>
                      {selectedAlbum.description && <p className="mt-2 text-sm text-[var(--text-secondary,var(--text2))]">{selectedAlbum.description}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedAlbum.oneDriveFolderWebUrl && (
                        <a href={selectedAlbum.oneDriveFolderWebUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-default,var(--border))] px-3 py-2 text-xs font-black text-[var(--text-secondary,var(--text2))]">
                          <FolderOpen size={15} /> OneDrive öffnen
                        </a>
                      )}
                      <button type="button" onClick={() => removeAlbum(selectedAlbum)} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-xs font-black text-rose-700">
                        <Trash2 size={15} /> Aus KLASSIO entfernen
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                  <div className="rounded-3xl border border-[var(--border-default,var(--border))] bg-[var(--surface-card,var(--surface))] p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted,var(--text3))]">1 · Fotos</p>
                        <h3 className="mt-1 text-base font-black text-[var(--text-primary,var(--text))]">Direkt nach OneDrive</h3>
                      </div>
                      <HardDrive size={20} className="text-[var(--accent)]" />
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary,var(--text2))]">
                      Die Bilder werden nicht dauerhaft auf dem KLASSIO-Webserver gespeichert.
                    </p>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/gif"
                      multiple
                      className="hidden"
                      onChange={event => handleUpload(event.target.files)}
                    />
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--border-default,var(--border))] bg-[var(--surface-subtle,var(--surface2))] px-4 py-8 text-sm font-black text-[var(--text-primary,var(--text))] transition-colors hover:border-[var(--accent)] disabled:opacity-60"
                    >
                      {uploading ? <Loader2 size={20} className="animate-spin" /> : <UploadCloud size={20} />}
                      {uploading ? `Upload ${uploadProgress.done}/${uploadProgress.total}` : 'Fotos auswählen'}
                    </button>

                    <div className="mt-4 space-y-2">
                      {(selectedAlbum.files || []).slice().reverse().map(file => (
                        <div key={file.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-default,var(--border))] px-3 py-2.5">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-[var(--text-primary,var(--text))]">{file.name}</p>
                            <p className="mt-0.5 text-[10px] text-[var(--text-muted,var(--text3))]">{Math.max(1, Math.round(file.size / 1024))} KB</p>
                          </div>
                          {file.webUrl && (
                            <a href={file.webUrl} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-[var(--text-muted,var(--text3))] hover:bg-[var(--surface-subtle,var(--surface2))]">
                              <ExternalLink size={14} />
                            </a>
                          )}
                        </div>
                      ))}
                      {(selectedAlbum.files || []).length === 0 && (
                        <p className="py-2 text-center text-xs text-[var(--text-muted,var(--text3))]">Noch keine Fotos hochgeladen.</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-[var(--border-default,var(--border))] bg-[var(--surface-card,var(--surface))] p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted,var(--text3))]">2 · Freigabe prüfen</p>
                        <h3 className="mt-1 text-base font-black text-[var(--text-primary,var(--text))]">Fotoerlaubnis</h3>
                      </div>
                      {selectedPolicy.canShare ? <ShieldCheck size={21} className="text-emerald-600" /> : <ShieldAlert size={21} className="text-amber-600" />}
                    </div>

                    {selectedAlbum.noIdentifiableStudents ? (
                      <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                        <p className="flex items-center gap-2 text-xs font-black"><CheckCircle2 size={16} /> Keine Kinder als identifizierbar bestätigt</p>
                      </div>
                    ) : selectedPolicy.needsSelection ? (
                      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                        <p className="flex items-center gap-2 text-xs font-black"><AlertTriangle size={16} /> Es wurden keine abgebildeten Kinder angegeben.</p>
                      </div>
                    ) : selectedPolicy.blocked.length > 0 ? (
                      <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4">
                        <p className="flex items-center gap-2 text-xs font-black text-rose-800"><ShieldAlert size={16} /> Teilen ist blockiert</p>
                        <div className="mt-3 space-y-2">
                          {selectedPolicy.blocked.map(item => (
                            <div key={item.id} className="flex items-center justify-between gap-3 text-xs">
                              <span className="font-bold text-rose-900">{item.name}</span>
                              <span className="text-rose-700">{photoPermissionLabel(item.status)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                        <p className="flex items-center gap-2 text-xs font-black"><CheckCircle2 size={16} /> {selectedPolicy.allowedCount} ausgewählte Kinder mit hinterlegter Freigabe</p>
                      </div>
                    )}

                    <p className="mt-4 text-[11px] leading-relaxed text-[var(--text-secondary,var(--text2))]">
                      KLASSIO prüft den gespeicherten Status. Ob die konkrete Einwilligung Ihrer Schule das Teilen im Elternalbum umfasst, bleibt durch die Schule zu prüfen.
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl border border-[var(--border-default,var(--border))] bg-[var(--surface-card,var(--surface))] p-5 sm:p-6 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted,var(--text3))]">3 · Elternzugang</p>
                      <h3 className="mt-1 text-base font-black text-[var(--text-primary,var(--text))]">Zeitlich begrenzten Link erstellen</h3>
                      <p className="mt-1 text-xs text-[var(--text-secondary,var(--text2))]">Standardmäßig 30 Tage. Externes Teilen muss im Microsoft-365-Konto der Schule erlaubt sein.</p>
                    </div>

                    {!selectedAlbum.shareUrl ? (
                      <button
                        type="button"
                        disabled={sharing || !selectedPolicy.canShare || !(selectedAlbum.files || []).length}
                        onClick={handleShare}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-xs font-black text-[var(--accent-text,#fff)] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {sharing ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
                        Elternlink erstellen
                      </button>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={copyParentMessage} className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 text-xs font-black text-[var(--accent-text,#fff)]">
                          <Copy size={15} /> Nachricht kopieren
                        </button>
                        <a href={selectedAlbum.shareUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-default,var(--border))] px-4 py-3 text-xs font-black text-[var(--text-primary,var(--text))]">
                          <ExternalLink size={15} /> Link öffnen
                        </a>
                        <button type="button" disabled={sharing} onClick={handleUnshare} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-3 text-xs font-black text-rose-700 disabled:opacity-50">
                          {sharing ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />} Freigabe beenden
                        </button>
                      </div>
                    )}
                  </div>

                  {selectedAlbum.shareUrl && (
                    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="break-all text-xs font-bold text-emerald-900">{selectedAlbum.shareUrl}</p>
                      {selectedAlbum.shareExpiresAt && (
                        <p className="mt-2 text-[11px] font-bold text-emerald-700">Gültig bis {formatDate(selectedAlbum.shareExpiresAt)}</p>
                      )}
                    </div>
                  )}
                </div>
              </section>
            ) : null}
          </main>
        </div>

        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs leading-relaxed text-sky-900">
          <strong>Speicherprinzip:</strong> KLASSIO hält nur Album-Metadaten und Freigabeinformationen im verschlüsselten App-Datenbestand. Die Bilddateien liegen im OneDrive der Lehrkraft.
        </div>
      </div>
    </div>
  );
}
