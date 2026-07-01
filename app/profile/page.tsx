'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  UploadCloud,
  FileText,
  Trash2,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Info
} from 'lucide-react';
import { useApp } from '@/components/providers/app-context';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';

interface UploadedFile {
  name: string;
  id: string;
  created_at: string;
  size: number;
  metadata?: {
    size?: number;
    mimetype?: string;
  };
}

export default function ProfilePage() {
  const { user, isLoading: authLoading } = useApp();
  const router = useRouter();

  // Component States
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // name of file undergoing download/delete
  
  // Alert/Status States
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);



  // Fetch user files from storage
  const fetchUserFiles = async (userId: string) => {
    setLoadingFiles(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase.storage
        .from('user-documents')
        .list(userId, {
          limit: 50,
          sortBy: { column: 'name', order: 'asc' }
        });

      if (fetchError) {
        throw fetchError;
      }

      // Map Supabase storage format to UploadedFile interface
      if (data) {
        const formattedFiles: UploadedFile[] = data
          .filter(f => f.name !== '.emptyFolderPlaceholder') // filter out placeholder files
          .map(f => ({
            name: f.name,
            id: f.id || '',
            created_at: f.created_at || new Date().toISOString(),
            size: f.metadata?.size || 0,
            metadata: f.metadata ? {
              size: f.metadata.size,
              mimetype: f.metadata.mimetype
            } : undefined
          }));
        setFiles(formattedFiles);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("Error fetching files:", err);
      setError(errorMessage || "Failed to load files from storage.");
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchUserFiles(user.id);
    }
  }, [user, authLoading]);


  // Helper: Format bytes to readable size
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // File Upload Logic
  const handleFileUpload = async (file: File) => {
    if (!user) return;
    setError(null);
    setSuccess(null);

    // Validate extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'pdf' && extension !== 'docx') {
      setError("Invalid file format. Only PDF (.pdf) and Word (.docx) files are allowed.");
      return;
    }

    // Validate size (10MB maximum)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setError("File is too large. Maximum file size allowed is 10MB.");
      return;
    }

    setUploading(true);
    setUploadProgress(10); // start transition

    try {
      const filePath = `${user.id}/${file.name}`;
      setUploadProgress(40);

      const { error: uploadError } = await supabase.storage
        .from('user-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      setUploadProgress(70);
      
      // Generate temporary signed URL to send to processing API
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('user-documents')
        .createSignedUrl(filePath, 60);

      if (signedUrlError || !signedUrlData?.signedUrl) {
        throw new Error(signedUrlError?.message || "Failed to generate temporary access link for indexing.");
      }

      setUploadProgress(85);
      
      // Call API endpoint to extract text, chunk, embed, and index in Pinecone
      setUploadProgress(90);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (user.id) {
        headers['x-user-id'] = user.id;
      }

      const processRes = await fetch('/api/vault/process', {
        method: 'POST',
        headers,
        body: JSON.stringify({ fileName: file.name, fileUrl: signedUrlData.signedUrl })
      });

      if (!processRes.ok) {
        const errData = await processRes.json().catch(() => ({}));
        throw new Error(errData.error || "File uploaded to storage, but vector search indexing failed. Please ensure Pinecone environment variables are configured.");
      }

      const processData = await processRes.json();
      setSuccess(`File "${file.name}" uploaded and indexed successfully into Pinecone (${processData.chunksCount} chunks generated)!`);
      
      // Refresh user's file list
      await fetchUserFiles(user.id);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("Upload error:", err);
      setError(errorMessage || "Failed to upload file to storage.");
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Triggered when file input changes
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
  };

  // Drag and Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Download logic (Creates a signed download URL valid for 60 seconds)
  const handleDownload = async (fileName: string) => {
    if (!user) return;
    setActionLoading(fileName);
    setError(null);
    try {
      const { data, error: downloadError } = await supabase.storage
        .from('user-documents')
        .createSignedUrl(`${user.id}/${fileName}`, 60);

      if (downloadError) throw downloadError;

      if (data?.signedUrl) {
        // Open download link in a new window/tab
        window.open(data.signedUrl, '_blank');
      } else {
        throw new Error("Failed to generate signed download link.");
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("Download error:", err);
      setError(errorMessage || "Failed to download file.");
    } finally {
      setActionLoading(null);
    }
  };

  // Delete logic
  const handleDelete = async (fileName: string) => {
    if (!user) return;
    if (!confirm(`Are you sure you want to permanently delete "${fileName}"?`)) return;

    setActionLoading(fileName);
    setError(null);
    setSuccess(null);
    try {
      // 1. Remove file from Supabase storage bucket
      const { error: deleteError } = await supabase.storage
        .from('user-documents')
        .remove([`${user.id}/${fileName}`]);

      if (deleteError) throw deleteError;

      // 2. Remove matching document vectors from Pinecone
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (user.id) {
        headers['x-user-id'] = user.id;
      }

      const deleteRes = await fetch('/api/vault/process', {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ fileName })
      });

      if (!deleteRes.ok) {
        console.warn("File deleted from storage, but Pinecone vector index cleanup failed.");
      }

      setSuccess(`File "${fileName}" deleted successfully from vault.`);
      
      // Update list
      setFiles(prev => prev.filter(f => f.name !== fileName));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error("Delete error:", err);
      setError(errorMessage || "Failed to delete file.");
    } finally {
      setActionLoading(null);
    }
  };

  // Loading indicator for Auth check
  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-neutral-800 dark:text-zinc-200" />
        <p className="text-zinc-500 text-sm animate-pulse">Loading profile settings...</p>
      </div>
    );
  }

  // Not Logged In View
  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="relative inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 mb-6 shadow-sm">
          <User className="h-10 w-10 text-neutral-600 dark:text-zinc-400" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">
          Access Restricted
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8 leading-relaxed">
          Please sign in to your ShopNow account to upload and view your documents, invoices, or guides in your secure storage vault.
        </p>
        <div className="flex flex-col gap-2">
          <Button onClick={() => router.push('/auth')} className="w-full rounded-full py-6 font-semibold cursor-pointer">
            Sign In Now
          </Button>
          <Button variant="outline" onClick={() => router.push('/')} className="w-full rounded-full py-6 text-zinc-500 cursor-pointer">
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  // Logged In Vault View
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back Button */}
      <button
        onClick={() => router.push('/')}
        className="group mb-6 flex items-center gap-2 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors uppercase tracking-wider"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        Back to shopping
      </button>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
        {/* Profile Sidebar */}
        <div className="flex flex-col gap-6 md:col-span-1">
          <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm dark:border-zinc-900 dark:bg-zinc-950">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-900 text-2xl font-bold text-white shadow-md dark:bg-zinc-100 dark:text-black">
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <h3 className="mt-4 font-bold text-zinc-900 dark:text-zinc-50 truncate max-w-full">
                My Vault
              </h3>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                {user.email}
              </p>
              
              <div className="mt-6 w-full border-t border-zinc-100 dark:border-zinc-900 pt-4 text-left">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Secure Storage Details
                </span>
                <div className="mt-3 flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                  <Info className="h-4 w-4 text-zinc-400 shrink-0" />
                  <span>Only PDF and DOCX files are allowed up to 10MB. Files are locked to your user account.</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Storage Vault Panel */}
        <div className="flex flex-col gap-6 md:col-span-2">
          {/* Status Banners */}
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-xs font-medium text-red-600 dark:text-red-400 flex items-start gap-2.5 shadow-sm animate-in fade-in duration-200">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}
          {success && (
            <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4 text-xs font-medium text-green-600 dark:text-green-400 flex items-start gap-2.5 shadow-sm animate-in fade-in duration-200">
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{success}</span>
            </div>
          )}

          {/* Upload card */}
          <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm dark:border-zinc-900 dark:bg-zinc-950">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-1">
              Upload Files
            </h2>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-6">
              Select or drag documents here to save them to your private space.
            </p>

            {/* Drag Zone */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 cursor-pointer ${
                isDragActive
                  ? 'border-neutral-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900/50'
                  : 'border-zinc-200 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-700 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                onChange={onFileChange}
                className="hidden"
                disabled={uploading}
              />

              {uploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-10 w-10 animate-spin text-neutral-800 dark:text-zinc-200" />
                  <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                    Uploading document...
                  </p>
                  <p className="text-xs text-zinc-400 animate-pulse">
                    Please do not close this page
                  </p>
                  
                  {uploadProgress !== null && (
                    <div className="w-48 bg-zinc-100 rounded-full h-1.5 mt-2 dark:bg-zinc-800 overflow-hidden">
                      <div 
                        className="bg-neutral-900 dark:bg-zinc-100 h-1.5 rounded-full transition-all duration-300" 
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-50 dark:bg-zinc-900 text-zinc-400 mb-4 group-hover:scale-105 transition-transform">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Drag and drop file here, or click to browse
                  </p>
                  <p className="text-xs text-zinc-400 mt-1.5">
                    Supports PDF and DOCX formats up to 10MB
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Files List Card */}
          <div className="rounded-2xl border border-zinc-100 bg-white p-6 shadow-sm dark:border-zinc-900 dark:bg-zinc-950">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                My Uploaded Documents
              </h2>
              <span className="text-[10px] font-bold bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 px-2 py-0.5 rounded text-zinc-500">
                {files.length} {files.length === 1 ? 'file' : 'files'}
              </span>
            </div>

            {loadingFiles ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-zinc-400">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-xs animate-pulse">Syncing document lists...</p>
              </div>
            ) : files.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-400 border border-dashed border-zinc-100 dark:border-zinc-900 rounded-xl bg-zinc-50/20 dark:bg-zinc-950/20">
                <FileText className="h-10 w-10 text-zinc-300 dark:text-zinc-700 mb-3" />
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  No documents in vault
                </p>
                <p className="text-xs text-zinc-400 max-w-xs mt-1">
                  Your uploaded files will appear here once you upload them.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-900 border border-zinc-100 dark:border-zinc-900 rounded-xl overflow-hidden bg-zinc-50/10">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/20 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-semibold text-xs">
                        <FileText className="h-5 w-5 text-neutral-500" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate pr-4 max-w-[250px] sm:max-w-[320px]">
                          {file.name}
                        </span>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-400 font-medium">
                          <span>{formatBytes(file.size)}</span>
                          <span>•</span>
                          <span>Uploaded {new Date(file.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={actionLoading === file.name}
                        onClick={() => handleDownload(file.name)}
                        className="rounded-lg gap-1 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 h-9 font-medium text-xs shadow-none cursor-pointer"
                        title="Download"
                      >
                        {actionLoading === file.name ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                        Download
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={actionLoading === file.name}
                        onClick={() => handleDelete(file.name)}
                        className="rounded-lg gap-1 h-9 text-xs shadow-none cursor-pointer"
                        title="Delete"
                      >
                        {actionLoading === file.name ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
