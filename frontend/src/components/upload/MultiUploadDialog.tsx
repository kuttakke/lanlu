"use client"

import { useState, useRef } from "react"
import { useLanguage } from "@/contexts/LanguageContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { ArchiveService } from "@/lib/archive-service"
import { Upload, FileText, X, CheckCircle, AlertCircle, Edit, Plus } from "lucide-react"
import { EditMetadataDialog } from "@/components/archive/EditMetadataDialog"
import { ArchiveMetadata } from "@/types/archive"

interface UploadDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onUploadComplete?: (archiveIds: string[]) => void
  trigger?: React.ReactNode
}

interface UploadedFile {
  file: File
  id?: string
  title: string
  tags: string
  summary: string
  categoryId: string
  status: "pending" | "uploading" | "success" | "error"
  progress: number
  errorMessage?: string
}

export function MultiUploadDialog({ open: controlledOpen, onOpenChange, onUploadComplete, trigger }: UploadDialogProps) {
  const { t } = useLanguage()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [currentUploadIndex, setCurrentUploadIndex] = useState(-1)
  const [editingFile, setEditingFile] = useState<UploadedFile | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supportedFormats = [".zip", ".rar", ".7z", ".tar", ".gz", ".pdf", ".epub", ".mobi", ".cbz", ".cbr"]

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || [])
    const newFiles: UploadedFile[] = selectedFiles.map(file => {
      const fileExtension = "." + file.name.split(".").pop()?.toLowerCase()
      if (supportedFormats.includes(fileExtension)) {
        return {
          file,
          title: file.name.replace(/\.[^/.]+$/, ""),
          tags: "",
          summary: "",
          categoryId: "",
          status: "pending" as const,
          progress: 0
        }
      }
      return null
    }).filter(Boolean) as UploadedFile[]

    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles])
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    
    const droppedFiles = Array.from(event.dataTransfer.files)
    const newFiles: UploadedFile[] = droppedFiles.map(file => {
      const fileExtension = "." + file.name.split(".").pop()?.toLowerCase()
      if (supportedFormats.includes(fileExtension)) {
        return {
          file,
          title: file.name.replace(/\.[^/.]+$/, ""),
          tags: "",
          summary: "",
          categoryId: "",
          status: "pending" as const,
          progress: 0
        }
      }
      return null
    }).filter(Boolean) as UploadedFile[]

    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles])
    }
  }

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const updateFileMetadata = (index: number, metadata: Partial<UploadedFile>) => {
    setFiles(prev => prev.map((file, i) => 
      i === index ? { ...file, ...metadata } : file
    ))
  }

  const openEditDialog = (file: UploadedFile, index: number) => {
    setEditingFile({ ...file, id: index.toString() })
    setEditDialogOpen(true)
  }

  const handleEditMetadata = (metadata: Partial<UploadedFile>) => {
    if (editingFile) {
      const index = parseInt(editingFile.id || "0")
      updateFileMetadata(index, metadata)
    }
    setEditDialogOpen(false)
    setEditingFile(null)
  }

  const uploadFile = async (fileData: UploadedFile, index: number): Promise<string | null> => {
    updateFileMetadata(index, { status: "uploading", progress: 0 })

    try {
      const progressInterval = setInterval(() => {
        updateFileMetadata(index, {
          progress: Math.min(files[index].progress + 10, 90)
        })
      }, 200)

      const result = await ArchiveService.uploadArchiveWithChunks(fileData.file, {
        title: fileData.title || undefined,
        tags: fileData.tags || undefined,
        summary: fileData.summary || undefined,
        categoryId: fileData.categoryId || undefined
      }, {
        onProgress: (progress) => {
          updateFileMetadata(index, { progress })
        },
        onChunkComplete: (chunkIndex, totalChunks) => {
          console.log(`文件 ${index} 分片 ${chunkIndex + 1}/${totalChunks} 上传完成`)
        },
        onError: (error, chunkIndex) => {
          console.error(`文件 ${index} 分片上传错误:`, error, chunkIndex)
          updateFileMetadata(index, {
            errorMessage: `分片 ${chunkIndex} 上传失败: ${error.message}`
          })
        }
      })

      clearInterval(progressInterval)
      
      if (result.success && result.id) {
        updateFileMetadata(index, { status: "success", progress: 100, id: result.id })
        return result.id
      } else {
        updateFileMetadata(index, { 
          status: "error", 
          errorMessage: result.error || t("upload.uploadFailed") 
        })
        return null
      }
    } catch (error) {
      updateFileMetadata(index, { 
        status: "error", 
        errorMessage: t("upload.uploadFailed") 
      })
      return null
    }
  }

  const handleUploadAll = async () => {
    if (files.length === 0) return

    setUploading(true)
    const successfulUploads: string[] = []

    for (let i = 0; i < files.length; i++) {
      if (files[i].status === "pending") {
        setCurrentUploadIndex(i)
        const result = await uploadFile(files[i], i)
        if (result) {
          successfulUploads.push(result)
        }
      }
    }

    setCurrentUploadIndex(-1)
    setUploading(false)

    if (successfulUploads.length > 0) {
      onUploadComplete?.(successfulUploads)
    }
  }

  const resetForm = () => {
    setFiles([])
    setUploading(false)
    setCurrentUploadIndex(-1)
  }

  const handleClose = () => {
    if (!uploading) {
      resetForm()
      setOpen(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("upload.title")}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* 文件选择区域 */}
            <div
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">{t("upload.dragOrClick")}</p>
              <p className="text-sm text-muted-foreground mb-4">{t("upload.browse")}</p>
              <div className="flex flex-wrap justify-center gap-1">
                {supportedFormats.map(format => (
                  <Badge key={format} variant="secondary" className="text-xs">
                    {format}
                  </Badge>
                ))}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={supportedFormats.join(",")}
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* 文件列表 */}
            {files.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium">{t("upload.fileList") || "文件列表"}</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {files.map((fileData, index) => (
                    <div key={index} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <FileText className="h-4 w-4 flex-shrink-0" />
                          <span className="text-sm font-medium truncate">{fileData.file.name}</span>
                          <Badge variant={
                            fileData.status === "success" ? "default" :
                            fileData.status === "error" ? "destructive" :
                            fileData.status === "uploading" ? "secondary" : "outline"
                          }>
                            {fileData.status === "pending" && (t("upload.pending") || "等待")}
                            {fileData.status === "uploading" && (t("upload.uploading") || "上传中")}
                            {fileData.status === "success" && (t("upload.success") || "成功")}
                            {fileData.status === "error" && (t("upload.error") || "错误")}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-1">
                          {fileData.status === "success" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(fileData, index)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            disabled={uploading}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {fileData.status === "uploading" && (
                        <Progress value={fileData.progress} className="w-full" />
                      )}
                      
                      {fileData.status === "error" && fileData.errorMessage && (
                        <p className="text-sm text-destructive">{fileData.errorMessage}</p>
                      )}
                      
                      <div className="grid grid-cols-1 gap-2 text-xs">
                        <div>
                          <Label>{t("upload.title")}</Label>
                          <Input
                            value={fileData.title}
                            onChange={(e) => updateFileMetadata(index, { title: e.target.value })}
                            disabled={uploading}
                            placeholder={t("upload.titlePlaceholder")}
                          />
                        </div>
                        <div>
                          <Label>{t("upload.tags")}</Label>
                          <Input
                            value={fileData.tags}
                            onChange={(e) => updateFileMetadata(index, { tags: e.target.value })}
                            disabled={uploading}
                            placeholder={t("upload.tagsPlaceholder")}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t("upload.addFiles") || "添加文件"}
              </Button>
              <div className="space-x-2">
                <Button variant="outline" onClick={handleClose} disabled={uploading}>
                  {t("common.cancel")}
                </Button>
                <Button 
                  onClick={handleUploadAll} 
                  disabled={uploading || files.length === 0}
                >
                  {uploading ? t("upload.uploading") : (t("upload.uploadAll") || "全部上传")}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 编辑元数据对话框 */}
      {editingFile && (
        <EditMetadataDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          metadata={{
            arcid: editingFile.id || "",
            title: editingFile.title,
            tags: editingFile.tags,
            summary: editingFile.summary,
            filename: editingFile.file.name,
            isnew: "true",
            pagecount: 0,
            progress: 0,
            lastreadtime: 0,
            file_size: editingFile.file.size,
            size: editingFile.file.size,
            extension: editingFile.file.name.split('.').pop() || "",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            relative_path: ""
          }}
          onMetadataUpdated={() => {
            // 编辑完成后刷新数据
            if (editingFile.id) {
              // 可以在这里添加刷新逻辑
            }
          }}
        />
      )}
    </>
  )
}