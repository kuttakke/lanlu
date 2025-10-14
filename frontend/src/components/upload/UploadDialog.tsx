"use client"

import { useState, useRef } from "react"
import { useLanguage } from "@/contexts/LanguageContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { ArchiveService } from "@/lib/archive-service"
import { Upload, FileText, X, CheckCircle, AlertCircle } from "lucide-react"

interface UploadDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onUploadComplete?: (archiveId: string) => void
  trigger?: React.ReactNode
}

export function UploadDialog({ open: controlledOpen, onOpenChange, onUploadComplete, trigger }: UploadDialogProps) {
  const { t } = useLanguage()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [tags, setTags] = useState("")
  const [summary, setSummary] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supportedFormats = [".zip", ".rar", ".7z", ".tar", ".gz", ".pdf", ".epub", ".mobi", ".cbz", ".cbr"]

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      const fileExtension = "." + selectedFile.name.split(".").pop()?.toLowerCase()
      if (supportedFormats.includes(fileExtension)) {
        setFile(selectedFile)
        if (!title) {
          setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""))
        }
        setUploadStatus("idle")
        setErrorMessage("")
      } else {
        setUploadStatus("error")
        setErrorMessage(t("upload.unsupportedFormat").replace("{format}", fileExtension))
      }
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    
    const droppedFile = event.dataTransfer.files[0]
    if (droppedFile) {
      const fileExtension = "." + droppedFile.name.split(".").pop()?.toLowerCase()
      if (supportedFormats.includes(fileExtension)) {
        setFile(droppedFile)
        if (!title) {
          setTitle(droppedFile.name.replace(/\.[^/.]+$/, ""))
        }
        setUploadStatus("idle")
        setErrorMessage("")
      } else {
        setUploadStatus("error")
        setErrorMessage(t("upload.unsupportedFormat").replace("{format}", fileExtension))
      }
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setUploadStatus("error")
      setErrorMessage(t("upload.noFile"))
      return
    }

    // 首先验证文件
    const validation = ArchiveService.validateFile(file)
    if (!validation.valid) {
      setUploadStatus("error")
      setErrorMessage(validation.error || t("upload.unsupportedFormat"))
      return
    }

    setUploading(true)
    setUploadProgress(0)
    setUploadStatus("uploading")
    setErrorMessage("")

    try {
      const result = await ArchiveService.uploadArchiveWithChunks(file, {
        title: title || undefined,
        tags: tags || undefined,
        summary: summary || undefined,
        categoryId: categoryId || undefined
      }, {
        onProgress: (progress) => {
          setUploadProgress(progress)
        },
        onChunkComplete: (chunkIndex, totalChunks) => {
          console.log(`分片 ${chunkIndex + 1}/${totalChunks} 上传完成`)
        },
        onError: (error, chunkIndex) => {
          console.error(`分片上传错误:`, error, chunkIndex)
          setErrorMessage(`分片 ${chunkIndex} 上传失败: ${error.message}`)
        }
      })

      setUploadProgress(100)

      if (result.success && result.id) {
        setUploadStatus("success")
        setTimeout(() => {
          setOpen(false)
          resetForm()
          onUploadComplete?.(result.id!)
        }, 1500)
      } else {
        setUploadStatus("error")
        setErrorMessage(result.error || t("upload.uploadFailed"))
      }
    } catch (error) {
      setUploadStatus("error")
      const errorMessage = ArchiveService.getUploadErrorMessage(error)
      setErrorMessage(errorMessage)
    } finally {
      setUploading(false)
    }
  }

  const resetForm = () => {
    setFile(null)
    setTitle("")
    setTags("")
    setSummary("")
    setCategoryId("")
    setUploadProgress(0)
    setUploadStatus("idle")
    setErrorMessage("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleClose = () => {
    if (!uploading) {
      setOpen(false)
      resetForm()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("upload.title")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              file ? "border-primary bg-primary/5" : "border-gray-300 hover:border-gray-400"
            }`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {file ? (
              <div className="flex items-center justify-center space-x-2">
                <FileText className="h-8 w-8 text-primary" />
                <div className="text-left">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFile(null)
                    if (fileInputRef.current) {
                      fileInputRef.current.value = ""
                    }
                  }}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="text-lg font-medium">{t("upload.dragOrClick")}</p>
                <p className="text-sm text-gray-500">
                  {t("upload.supportedFormats")}: {supportedFormats.join(", ")}
                </p>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {t("upload.browse")}
                </Button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept={supportedFormats.join(",")}
              disabled={uploading}
            />
          </div>

          {/* Metadata Fields */}
          <div className="space-y-3">
            <div>
              <Label htmlFor="title">{t("upload.title")}</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("upload.titlePlaceholder")}
                disabled={uploading}
              />
            </div>
            <div>
              <Label htmlFor="tags">{t("upload.tags")}</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder={t("upload.tagsPlaceholder")}
                disabled={uploading}
              />
            </div>
            <div>
              <Label htmlFor="summary">{t("upload.summary")}</Label>
              <Textarea
                id="summary"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder={t("upload.summaryPlaceholder")}
                rows={3}
                disabled={uploading}
              />
            </div>
            <div>
              <Label htmlFor="category">{t("upload.category")}</Label>
              <Input
                id="category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                placeholder={t("upload.categoryPlaceholder")}
                disabled={uploading}
              />
            </div>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t("upload.uploading")}</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          {/* Status Messages */}
          {uploadStatus === "success" && (
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              <span>档案上传成功！</span>
            </div>
          )}
          {uploadStatus === "error" && errorMessage && (
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={handleClose} disabled={uploading}>
              {t("upload.cancel")}
            </Button>
            <Button onClick={handleUpload} disabled={!file || uploading}>
              {uploading ? t("upload.uploading") : t("upload.upload")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}