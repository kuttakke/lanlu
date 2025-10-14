"use client"

import { useState, useRef } from "react"
import { useLanguage } from "@/contexts/LanguageContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Progress } from "@/components/ui/progress"
import { ArchiveService } from "@/lib/archive-service"
import { Upload, FileText, X, CheckCircle, AlertCircle, Plus } from "lucide-react"

interface UploadFile {
  id: string
  file: File
  title: string
  tags: string
  summary: string
  categoryId: string
  progress: number
  status: "idle" | "uploading" | "success" | "error"
  error?: string
}

interface UploadDrawerProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onUploadComplete?: (archiveId: string) => void
  trigger?: React.ReactNode
}

export function UploadDrawer({ open: controlledOpen, onOpenChange, onUploadComplete, trigger }: UploadDrawerProps) {
  const { t } = useLanguage()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supportedFormats = [".zip", ".rar", ".7z", ".tar", ".gz", ".pdf", ".epub", ".mobi", ".cbz", ".cbr"]

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return

    const newFiles: UploadFile[] = []
    
    Array.from(files).forEach(file => {
      const fileExtension = "." + file.name.split(".").pop()?.toLowerCase()
      if (supportedFormats.includes(fileExtension)) {
        newFiles.push({
          id: Math.random().toString(36).substr(2, 9),
          file,
          title: file.name.replace(/\.[^/.]+$/, ""),
          tags: "",
          summary: "",
          categoryId: "",
          progress: 0,
          status: "idle"
        })
      }
    })

    if (newFiles.length > 0) {
      setUploadFiles(prev => [...prev, ...newFiles])
    }
  }

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(event.target.files)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(false)
    
    handleFileSelect(event.dataTransfer.files)
  }

  const updateFileData = (id: string, field: keyof UploadFile, value: any) => {
    setUploadFiles(prev => prev.map(file => 
      file.id === id ? { ...file, [field]: value } : file
    ))
  }

  const removeFile = (id: string) => {
    setUploadFiles(prev => prev.filter(file => file.id !== id))
  }

  const uploadSingleFile = async (uploadFile: UploadFile) => {
    updateFileData(uploadFile.id, "status", "uploading")
    updateFileData(uploadFile.id, "progress", 0)
    updateFileData(uploadFile.id, "error", undefined)

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadFiles(prev => prev.map(file => {
          if (file.id === uploadFile.id) {
            const newProgress = Math.min(file.progress + 10, 90)
            return { ...file, progress: newProgress }
          }
          return file
        }))
      }, 200)

      const result = await ArchiveService.uploadArchiveWithChunks(uploadFile.file, {
        title: uploadFile.title || undefined,
        tags: uploadFile.tags || undefined,
        summary: uploadFile.summary || undefined,
        categoryId: uploadFile.categoryId || undefined
      }, {
        onProgress: (progress) => {
          updateFileData(uploadFile.id, "progress", progress)
        },
        onChunkComplete: (chunkIndex, totalChunks) => {
          console.log(`文件 ${uploadFile.id} 分片 ${chunkIndex + 1}/${totalChunks} 上传完成`)
        },
        onError: (error, chunkIndex) => {
          console.error(`文件 ${uploadFile.id} 分片上传错误:`, error, chunkIndex)
          updateFileData(uploadFile.id, "error", `分片 ${chunkIndex} 上传失败: ${error.message}`)
        }
      })

      clearInterval(progressInterval)
      
      setUploadFiles(prev => prev.map(file => {
        if (file.id === uploadFile.id) {
          if (result.success && result.id) {
            setTimeout(() => {
              onUploadComplete?.(result.id!)
            }, 1500)
            return { ...file, progress: 100, status: "success" }
          } else {
            return { ...file, status: "error", error: result.error || t("upload.uploadFailed") }
          }
        }
        return file
      }))
    } catch (error) {
      updateFileData(uploadFile.id, "status", "error")
      updateFileData(uploadFile.id, "error", t("upload.uploadFailed"))
    }
  }

  const uploadAllFiles = async () => {
    const filesToUpload = uploadFiles.filter(file => file.status === "idle")
    
    for (const file of filesToUpload) {
      await uploadSingleFile(file)
    }
  }

  const clearCompleted = () => {
    setUploadFiles(prev => prev.filter(file => file.status !== "success"))
  }

  const clearAll = () => {
    setUploadFiles([])
  }

  const handleClose = () => {
    const uploadingFiles = uploadFiles.filter(file => file.status === "uploading")
    if (uploadingFiles.length === 0) {
      setOpen(false)
      clearAll()
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {trigger && <SheetTrigger asChild>{trigger}</SheetTrigger>}
      <SheetContent 
        side="right" 
        className="w-full sm:w-[600px] md:w-[700px] lg:w-[800px] overflow-y-auto"
        onInteractOutside={(e) => {
          const uploadingFiles = uploadFiles.filter(file => file.status === "uploading")
          if (uploadingFiles.length > 0) {
            e.preventDefault()
          }
        }}
      >
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            {t("upload.title")}
            <div className="flex space-x-2">
              {uploadFiles.some(file => file.status === "success") && (
                <Button variant="outline" size="sm" onClick={clearCompleted}>
                  {t("upload.clearCompleted")}
                </Button>
              )}
              {uploadFiles.length > 0 && (
                <Button variant="outline" size="sm" onClick={clearAll}>
                  {t("upload.clearAll")}
                </Button>
              )}
            </div>
          </SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragging ? "border-primary bg-primary/5" : "border-gray-300 hover:border-gray-400"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="space-y-2">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <p className="text-lg font-medium">{t("upload.dragOrClick")}</p>
              <p className="text-sm text-gray-500">
                {t("upload.supportedFormats")}: {supportedFormats.join(", ")}
              </p>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Plus className="mr-2 h-4 w-4" />
                {t("upload.browse")}
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileInputChange}
              accept={supportedFormats.join(",")}
              multiple
            />
          </div>

          {/* Upload List */}
          {uploadFiles.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">{t("upload.fileList")}</h3>
                <Button 
                  onClick={uploadAllFiles}
                  disabled={!uploadFiles.some(file => file.status === "idle")}
                >
                  {t("upload.uploadAll")}
                </Button>
              </div>
              
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                {uploadFiles.map((uploadFile) => (
                  <div key={uploadFile.id} className="border rounded-lg p-4 space-y-3">
                    {/* File Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-5 w-5 text-primary" />
                        <span className="font-medium">{uploadFile.file.name}</span>
                        <span className="text-sm text-gray-500">
                          ({(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {uploadFile.status === "success" && (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        )}
                        {uploadFile.status === "error" && (
                          <AlertCircle className="h-5 w-5 text-red-600" />
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(uploadFile.id)}
                          disabled={uploadFile.status === "uploading"}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Metadata Fields */}
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <Label htmlFor={`title-${uploadFile.id}`}>{t("upload.title")}</Label>
                        <Input
                          id={`title-${uploadFile.id}`}
                          value={uploadFile.title}
                          onChange={(e) => updateFileData(uploadFile.id, "title", e.target.value)}
                          placeholder={t("upload.titlePlaceholder")}
                          disabled={uploadFile.status !== "idle"}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`tags-${uploadFile.id}`}>{t("upload.tags")}</Label>
                        <Input
                          id={`tags-${uploadFile.id}`}
                          value={uploadFile.tags}
                          onChange={(e) => updateFileData(uploadFile.id, "tags", e.target.value)}
                          placeholder={t("upload.tagsPlaceholder")}
                          disabled={uploadFile.status !== "idle"}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`summary-${uploadFile.id}`}>{t("upload.summary")}</Label>
                        <Textarea
                          id={`summary-${uploadFile.id}`}
                          value={uploadFile.summary}
                          onChange={(e) => updateFileData(uploadFile.id, "summary", e.target.value)}
                          placeholder={t("upload.summaryPlaceholder")}
                          rows={2}
                          disabled={uploadFile.status !== "idle"}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`category-${uploadFile.id}`}>{t("upload.category")}</Label>
                        <Input
                          id={`category-${uploadFile.id}`}
                          value={uploadFile.categoryId}
                          onChange={(e) => updateFileData(uploadFile.id, "categoryId", e.target.value)}
                          placeholder={t("upload.categoryPlaceholder")}
                          disabled={uploadFile.status !== "idle"}
                        />
                      </div>
                    </div>

                    {/* Progress Bar */}
                    {uploadFile.status === "uploading" && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{t("upload.uploading")}</span>
                          <span>{uploadFile.progress}%</span>
                        </div>
                        <Progress value={uploadFile.progress} className="w-full" />
                      </div>
                    )}

                    {/* Error Message */}
                    {uploadFile.status === "error" && uploadFile.error && (
                      <div className="text-sm text-red-600">{uploadFile.error}</div>
                    )}

                    {/* Upload Button */}
                    {uploadFile.status === "idle" && (
                      <Button 
                        onClick={() => uploadSingleFile(uploadFile)}
                        className="w-full"
                      >
                        {t("upload.upload")}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={handleClose}>
              {t("upload.close")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}