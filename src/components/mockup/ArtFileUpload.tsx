import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Upload,
  FileText,
  FileImage,
  Loader2,
  X,
  Download,
  Eye,
} from "lucide-react";

// CorelDraw icon as inline SVG component
function CorelDrawIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <text
        x="12"
        y="15.5"
        textAnchor="middle"
        fontSize="7"
        fontWeight="bold"
        fill="currentColor"
        stroke="none"
      >
        CDR
      </text>
    </svg>
  );
}

export interface ArtFile {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  storagePath: string;
  createdAt: string;
}

interface ArtFileUploadProps {
  files: ArtFile[];
  onFilesChange: (files: ArtFile[]) => void;
  productId?: string | null;
  productName?: string | null;
  maxFiles?: number;
  className?: string;
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/x-cdr",
  "application/cdr",
  "application/coreldraw",
  "application/x-coreldraw",
  "image/x-cdr",
];

const ACCEPTED_EXTENSIONS = [".pdf", ".cdr"];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(fileType: string) {
  if (fileType === "application/pdf" || fileType.endsWith(".pdf")) {
    return <FileText className="h-8 w-8 text-red-500" />;
  }
  return <CorelDrawIcon className="h-8 w-8 text-green-600" />;
}

function isAcceptedFile(file: File): boolean {
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  return (
    ACCEPTED_TYPES.includes(file.type) || ACCEPTED_EXTENSIONS.includes(ext)
  );
}

export function ArtFileUpload({
  files,
  onFilesChange,
  productId,
  productName,
  maxFiles = 5,
  className,
}: ArtFileUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!user) {
        toast.error("Você precisa estar logado para enviar arquivos");
        return null;
      }

      if (!isAcceptedFile(file)) {
        toast.error(
          `Formato não suportado: ${file.name}. Use PDF ou CorelDraw (.cdr)`
        );
        return null;
      }

      if (file.size > MAX_FILE_SIZE) {
        toast.error(`Arquivo muito grande: ${file.name}. Máximo: 50MB`);
        return null;
      }

      const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
      const storagePath = `${user.id}/${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("art-files")
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("art-files").getPublicUrl(storagePath);

      // Save record in DB
      const { data: record, error: dbError } = await supabase
        .from("art_file_attachments")
        .insert({
          user_id: user.id,
          product_id: productId || null,
          product_name: productName || null,
          file_name: file.name,
          file_type: ext === "pdf" ? "pdf" : "cdr",
          file_size: file.size,
          file_url: publicUrl,
          storage_path: storagePath,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      return {
        id: record.id,
        fileName: file.name,
        fileType: ext === "pdf" ? "pdf" : "cdr",
        fileSize: file.size,
        fileUrl: publicUrl,
        storagePath,
        createdAt: record.created_at,
      } as ArtFile;
    },
    [user, productId, productName]
  );

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const incoming = Array.from(fileList);
      const remaining = maxFiles - files.length;

      if (remaining <= 0) {
        toast.error(`Máximo de ${maxFiles} arquivos atingido`);
        return;
      }

      const toUpload = incoming.slice(0, remaining);
      setUploading(true);

      try {
        const results = await Promise.all(toUpload.map(uploadFile));
        const uploaded = results.filter(Boolean) as ArtFile[];
        if (uploaded.length > 0) {
          onFilesChange([...files, ...uploaded]);
          toast.success(
            `${uploaded.length} arquivo(s) enviado(s) com sucesso!`
          );
        }
      } catch (err: any) {
        console.error("Upload error:", err);
        toast.error("Erro ao enviar arquivo: " + err.message);
      } finally {
        setUploading(false);
      }
    },
    [files, maxFiles, onFilesChange, uploadFile]
  );

  const handleRemove = useCallback(
    async (file: ArtFile) => {
      try {
        // Delete from storage
        await supabase.storage.from("art-files").remove([file.storagePath]);
        // Delete DB record
        await supabase
          .from("art_file_attachments")
          .delete()
          .eq("id", file.id);

        onFilesChange(files.filter((f) => f.id !== file.id));
        toast.success("Arquivo removido");
      } catch (err: any) {
        toast.error("Erro ao remover: " + err.message);
      }
    },
    [files, onFilesChange]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  return (
    <div className={cn("space-y-3", className)}>
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border/60 hover:border-primary/50 hover:bg-muted/30",
          uploading && "pointer-events-none opacity-60"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.cdr"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = "";
          }}
          disabled={uploading}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Enviando...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                Arraste ou clique para enviar
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                PDF ou CorelDraw (.cdr) · Máx. 50MB · Até {maxFiles} arquivo(s)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50 bg-muted/20"
            >
              {/* Icon */}
              <div className="shrink-0">{getFileIcon(file.fileType)}</div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.fileSize)} ·{" "}
                  {file.fileType === "pdf" ? "PDF" : "CorelDraw"}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {file.fileType === "pdf" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewPdfUrl(
                        previewPdfUrl === file.fileUrl ? null : file.fileUrl
                      );
                    }}
                    title="Pré-visualizar PDF"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(file.fileUrl, "_blank");
                  }}
                  title="Baixar arquivo"
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(file);
                  }}
                  title="Remover arquivo"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PDF Preview */}
      {previewPdfUrl && (
        <div className="relative border rounded-lg overflow-hidden bg-white">
          <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b">
            <span className="text-xs font-medium text-muted-foreground">
              Pré-visualização PDF
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setPreviewPdfUrl(null)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          <iframe
            src={previewPdfUrl}
            className="w-full h-[400px]"
            title="PDF Preview"
          />
        </div>
      )}
    </div>
  );
}
