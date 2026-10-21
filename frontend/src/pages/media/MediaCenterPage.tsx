import { useState, useEffect, useCallback, useRef } from 'react';
import { Image, Video, FileText, Plus, Upload, FolderOpen, Eye, Download } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import api from '../../lib/api';
import type { MediaAlbum, MediaFile } from '../../types/modules';

// ─── API ──────────────────────────────────────────────────────────────────────

const mediaApi = {
  listAlbums: () => api.get<MediaAlbum[]>('/media/albums/'),
  createAlbum: (data: Partial<MediaAlbum>) => api.post<MediaAlbum>('/media/albums/', data),
  listFiles: (albumId: string) =>
    api.get<MediaFile[]>('/media/files/', { params: { album: albumId } }),
  uploadFile: (albumId: string, file: File) => {
    const fd = new FormData();
    fd.append('album', albumId);
    fd.append('file', file);
    fd.append('original_name', file.name);
    fd.append('file_type', file.type.startsWith('image/') ? 'IMAGE' : file.type.startsWith('video/') ? 'VIDEO' : 'DOC');
    return api.post<MediaFile>('/media/files/', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ─── File Icon ─────────────────────────────────────────────────────────────

function FileTypeIcon({ type }: { type: string }) {
  if (type === 'IMAGE') return <Image className="w-5 h-5 text-blue-400" />;
  if (type === 'VIDEO') return <Video className="w-5 h-5 text-purple-400" />;
  return <FileText className="w-5 h-5 text-green-400" />;
}

function formatSize(bytes?: number | null) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ─── Album Viewer ────────────────────────────────────────────────────────────

interface AlbumViewerProps {
  album: MediaAlbum;
  onClose: () => void;
}

function AlbumViewer({ album, onClose }: AlbumViewerProps) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<MediaFile | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    const res = await mediaApi.listFiles(album.id);
    setFiles(res.data);
    setLoading(false);
  }, [album.id]);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await mediaApi.uploadFile(album.id, file);
      await loadFiles();
    } finally {
      setUploading(false);
    }
  };

  const images = files.filter((f) => f.file_type === 'IMAGE');
  const others = files.filter((f) => f.file_type !== 'IMAGE');

  return (
    <Modal open onClose={onClose} title={album.title} size="lg">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-muted">{files.length} ملف</p>
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} loading={uploading}>
            <Upload className="w-3.5 h-3.5" />
            رفع ملف
          </Button>
          <input ref={inputRef} type="file" className="hidden" onChange={handleUpload}
            accept="image/*,video/*,.pdf,.doc,.docx,.xlsx" />
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : (
          <>
            {/* Images grid */}
            {images.length > 0 && (
              <div>
                <p className="text-xs font-bold text-text-muted mb-2">الصور ({images.length})</p>
                <div className="grid grid-cols-3 gap-2">
                  {images.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setPreview(f)}
                      className="aspect-square rounded-xl overflow-hidden border border-border hover:border-gold-400/50 transition-all group relative"
                    >
                      <img
                        src={f.file}
                        alt={f.original_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                        <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-all" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Other files */}
            {others.length > 0 && (
              <div>
                <p className="text-xs font-bold text-text-muted mb-2">ملفات أخرى ({others.length})</p>
                <div className="space-y-2">
                  {others.map((f) => (
                    <div key={f.id} className="flex items-center gap-3 p-2.5 bg-surface-3 rounded-xl border border-border">
                      <FileTypeIcon type={f.file_type} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{f.original_name}</p>
                        <p className="text-xs text-text-muted">{formatSize(f.file_size)}</p>
                      </div>
                      <a href={f.file} download={f.original_name} className="p-1.5 hover:bg-surface rounded-lg text-text-muted hover:text-gold-400 transition-all">
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {files.length === 0 && (
              <div className="text-center py-10 text-text-muted">
                <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>الألبوم فارغ — ارفع ملفاً للبدء</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Image lightbox */}
      {preview && (
        <Modal open onClose={() => setPreview(null)} title={preview.original_name} size="lg">
          <img src={preview.file} alt={preview.original_name} className="w-full rounded-xl object-contain max-h-[70vh]" />
        </Modal>
      )}
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function MediaCenterPage() {
  const [albums, setAlbums] = useState<MediaAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<MediaAlbum | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchAlbums = useCallback(async () => {
    setLoading(true);
    const res = await mediaApi.listAlbums();
    setAlbums(res.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAlbums(); }, [fetchAlbums]);

  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    await mediaApi.createAlbum({ title: newTitle });
    setNewTitle('');
    setShowCreate(false);
    setCreating(false);
    fetchAlbums();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-text-primary flex items-center gap-2">
            <Image className="w-6 h-6 text-gold-400" />
            مركز الميديا
          </h1>
          <p className="text-text-muted text-sm mt-1">ألبومات الصور والفيديوهات والمستندات</p>
        </div>
        <Button variant="primary" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" />
          ألبوم جديد
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : albums.length === 0 ? (
        <div className="text-center py-16 text-text-muted">
          <Image className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">لا توجد ألبومات بعد</p>
          <p className="text-sm mt-1">أنشئ ألبوماً جديداً لحفظ الصور والملفات</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {albums.map((album) => (
            <Card key={album.id} hover onClick={() => setSelectedAlbum(album)} className="cursor-pointer !p-0">
              <div className="aspect-video bg-surface-3 rounded-t-2xl overflow-hidden relative">
                {album.cover_image ? (
                  <img src={album.cover_image} alt={album.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FolderOpen className="w-12 h-12 text-text-muted opacity-40" />
                  </div>
                )}
              </div>
              <CardContent>
                <p className="font-bold text-text-primary mt-3">{album.title}</p>
                {album.description && (
                  <p className="text-xs text-text-muted mt-1 line-clamp-2">{album.description}</p>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-text-muted">
                    {new Date(album.created_at).toLocaleDateString('ar-EG')}
                  </span>
                  <Button variant="ghost" size="sm">
                    <Eye className="w-3.5 h-3.5" />
                    فتح
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create album modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="ألبوم جديد">
        <form onSubmit={handleCreateAlbum} className="space-y-4">
          <Input
            label="اسم الألبوم"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="مثال: رحلة 2026"
            required
          />
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)} className="flex-1">إلغاء</Button>
            <Button type="submit" variant="primary" loading={creating} className="flex-1">
              <Plus className="w-4 h-4" />
              إنشاء
            </Button>
          </div>
        </form>
      </Modal>

      {selectedAlbum && (
        <AlbumViewer album={selectedAlbum} onClose={() => setSelectedAlbum(null)} />
      )}
    </div>
  );
}
