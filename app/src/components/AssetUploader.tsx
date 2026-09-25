import React, { useRef, useState } from 'react';
import { X, Image } from 'lucide-react';
import { supabase } from '../supabase';

interface AssetUploaderProps {
  bucket: string;
  currentPath: string | null;
  onUpload: (path: string) => void;
  onRemove?: () => void;
  label?: string;
  accept?: string;
}

export default function AssetUploader({ bucket, currentPath, onUpload, onRemove, label = 'Upload Image', accept = 'image/png,image/jpeg,image/webp' }: AssetUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const previewUrl = currentPath ? `${supabaseUrl}/storage/v1/object/public/${bucket}/${currentPath}` : null;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setUploading(true);
    setError(null);

    const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    const { data, error: uploadError } = await supabase.storage.from(bucket).upload(fileName, file);

    if (data) {
      onUpload(data.path);
    } else {
      setError(uploadError?.message || 'Upload failed');
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col gap-3">
      <span className="font-mono text-xs uppercase text-zinc-400 tracking-widest">{label}</span>
      
      {previewUrl ? (
        <div className="relative group rounded-lg overflow-hidden border border-white/10 bg-black/30">
          <img src={previewUrl} alt="Preview" className="w-full max-h-60 object-contain bg-zinc-900" />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-cyan-500 text-black px-4 py-2 font-bold text-xs uppercase tracking-widest rounded"
            >
              Replace
            </button>
            {onRemove && (
              <button
                onClick={onRemove}
                className="bg-red-500 text-white px-4 py-2 font-bold text-xs uppercase tracking-widest rounded flex items-center gap-1"
              >
                <X size={14} /> Remove
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full h-40 border-2 border-dashed border-white/10 hover:border-cyan-400/50 rounded-lg flex flex-col items-center justify-center gap-3 text-zinc-500 hover:text-cyan-400 transition-all bg-black/20"
        >
          {uploading ? (
            <span className="animate-pulse font-mono text-sm uppercase tracking-widest">Uploading...</span>
          ) : (
            <>
              <Image size={32} />
              <span className="font-mono text-xs uppercase tracking-widest">Click to upload</span>
              <span className="text-[10px] text-zinc-600">PNG, JPG, WEBP</span>
            </>
          )}
        </button>
      )}
      
      <input ref={fileInputRef} type="file" accept={accept} onChange={handleUpload} className="hidden" />
      {error && <p className="text-red-400 text-xs font-mono">{error}</p>}
      {currentPath && <p className="text-zinc-600 text-[10px] font-mono truncate">{currentPath}</p>}
    </div>
  );
}
