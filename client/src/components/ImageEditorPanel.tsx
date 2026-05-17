import { useRef, useState } from 'react';
import { X, UploadIcon, ImageIcon } from 'lucide-react';

interface ImageEditorPanelProps {
    selectedImage: {
        src: string;
        alt: string;
        className: string;
    } | null;
    onUpdate: (newSrc: string) => void;
    onClose: () => void;
}

const ImageEditorPanel = ({ selectedImage, onUpdate, onClose }: ImageEditorPanelProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    if (!selectedImage) return null;

    const handleFile = (file: File) => {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            setPreview(dataUrl);
        };
        reader.readAsDataURL(file);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
    };

    const handleApply = () => {
        if (preview) {
            onUpdate(preview);
            setPreview(null);
        }
    };

    return (
        <div className='absolute top-4 right-4 w-80 bg-white rounded-xl shadow-2xl border border-amber-100 p-4 z-50'>
            {/* Header */}
            <div className='flex justify-between items-center mb-4'>
                <div className='flex items-center gap-2'>
                    <div className='w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center'>
                        <ImageIcon className='w-3.5 h-3.5 text-amber-600' />
                    </div>
                    <h3 className='font-semibold text-gray-800 text-sm'>Replace Image</h3>
                </div>
                <button onClick={onClose} className='hover:bg-gray-100 rounded-full p-1 transition-colors'>
                    <X className='w-4 h-4 text-gray-500' />
                </button>
            </div>

            {/* Current image preview */}
            <div className='mb-3'>
                <p className='text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wide'>Current</p>
                <div className='w-full h-24 bg-gray-50 rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center'>
                    <img
                        src={selectedImage.src}
                        alt={selectedImage.alt}
                        className='max-w-full max-h-full object-contain'
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                </div>
            </div>

            {/* Upload area */}
            <div className='mb-3'>
                <p className='text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wide'>New Image</p>
                <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`w-full h-28 rounded-lg border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all
                        ${isDragging ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50/40'}`}
                >
                    {preview ? (
                        <img src={preview} alt='preview' className='max-w-full max-h-full object-contain rounded-md' />
                    ) : (
                        <>
                            <UploadIcon className='w-6 h-6 text-gray-300 mb-1.5' />
                            <p className='text-xs text-gray-400 text-center'>
                                Click or drag & drop<br />
                                <span className='text-gray-300'>PNG, JPG, GIF, WebP</span>
                            </p>
                        </>
                    )}
                </div>
                <input
                    ref={fileInputRef}
                    type='file'
                    accept='image/*'
                    className='hidden'
                    onChange={handleFileChange}
                />
            </div>

            {/* Actions */}
            <div className='flex gap-2'>
                <button
                    onClick={onClose}
                    className='flex-1 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors'
                >
                    Cancel
                </button>
                <button
                    onClick={handleApply}
                    disabled={!preview}
                    className='flex-1 py-1.5 text-sm rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
                >
                    Apply
                </button>
            </div>
        </div>
    );
};

export default ImageEditorPanel;
