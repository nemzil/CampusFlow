'use client';

import { useState, useRef } from 'react';
import { Upload, FileUp, X, FileText } from 'lucide-react';

export default function FileDropzone({
  onFileSelect,
  accept = "*/*",
  maxSize = 10 * 1024 * 1024, // 10MB default
  selectedFile = null,
  onClear = null,
  label = "Upload File",
  hint = "Click to browse or drag and drop"
}) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFile = (file) => {
    // Validate file type
    if (accept !== "*/*") {
      const acceptedTypes = accept.split(',').map(t => t.trim());
      const fileType = file.type || '';
      const fileExt = '.' + file.name.split('.').pop();
      
      const isValid = acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return fileExt === type;
        }
        return fileType.match(new RegExp(type.replace('*', '.*')));
      });

      if (!isValid) {
        alert(`Invalid file type. Accepted: ${accept}`);
        return;
      }
    }

    // Validate file size
    if (file.size > maxSize) {
      const sizeMB = (maxSize / (1024 * 1024)).toFixed(0);
      alert(`File too large. Maximum size: ${sizeMB}MB`);
      return;
    }

    onFileSelect(file);
  };

  const handleInputChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (onClear) {
      onClear();
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
      />
      
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          flex flex-col items-center justify-center gap-2 
          border-2 border-dashed rounded-xl p-6 
          cursor-pointer transition-all
          ${isDragging 
            ? 'border-sky-500 bg-sky-50 scale-[1.02]' 
            : selectedFile 
              ? 'border-sky-400/40 bg-sky-50/50 hover:bg-sky-50/70' 
              : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50/80'
          }
        `}
      >
        {selectedFile ? (
          <>
            <FileText className="w-8 h-8 text-sky-500" />
            <div className="text-center">
              <p className="text-sm font-medium text-slate-700">{selectedFile.name}</p>
              <p className="text-xs text-slate-500 mt-1">{formatFileSize(selectedFile.size)}</p>
            </div>
            {onClear && (
              <button
                onClick={handleClear}
                className="mt-2 px-3 py-1.5 text-xs bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
              >
                <X className="w-3 h-3 inline mr-1" />
                Remove
              </button>
            )}
          </>
        ) : (
          <>
            {isDragging ? (
              <Upload className="w-8 h-8 text-sky-500 animate-bounce" />
            ) : (
              <FileUp className="w-8 h-8 text-slate-400" />
            )}
            <div className="text-center">
              <p className="text-sm text-slate-600 font-medium">{label}</p>
              <p className="text-xs text-slate-500 mt-1">{hint}</p>
              <p className="text-[10px] text-slate-400 mt-1">
                Max size: {(maxSize / (1024 * 1024)).toFixed(0)}MB
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
