"use client"

import { useState, useRef, useCallback } from "react"
import { useLanguage } from "@/contexts/LanguageContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { ArchiveService } from "@/lib/archive-service"
import { Upload, FileText, X, CheckCircle, AlertCircle, Pause, Play, RotateCcw } from "lucide-react"

interface EnhancedUploadDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onUploadComplete?: (archiveId: string) => void
  trigger?: React.ReactNode
}

interface UploadSession {
  uploadId?: string
  file: File
  title: string
  tags: string
  summary: string
  categoryId: string
  progress: number
  status: "idle" | "uploading" | "paused" | "success" | "error"
  errorMessage?: string
  uploadedChunks?: number
  totalChunks?: number
  currentSpeed?: number
  estimatedTime?: number
}

export function EnhancedUploadDialog({ open: controlledOpen, onOpenChange, onUploadComplete, trigger }: EnhancedUploadDialogProps) {
  const { t } = useLanguage()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen
  
  const [currentSession, setCurrentSession] = useState<UploadSession | null>(null)
  const [title, setTitle] = useState("")
  const [tags, setTags] = useState("")
  const [summary, setSummary] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [dragActive, setDragActive] = useState(false)
  const [isResumable, setIsResumable] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadAbortController = useRef<AbortController | null>(null)
  const progressInterval = useRef<NodeJS.Timeout | null>(null)

  const supportedFormats = [".zip", ".rar", ".7z", ".tar", ".gz", ".pdf", ".epub", ".mobi", ".cbz", ".cbr"]

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      validateAndSetFile(selectedFile)
    }
  }

  const validateAndSetFile = (file: File) => {
    const validation = ArchiveService.validateFile(file)
    if (!validation.valid) {
      setCurrentSession({
        file,
        title: file.name.replace(/\.[^/.]+$/, ""),
        tags: "",
        summary: "",
        categoryId: "",
        progress: 0,
        status: "error",
        errorMessage: validation.error || t("upload.unsupportedFormat")
      })
      return
    }

    setCurrentSession({
      file,
      title: file.name.replace(/\.[^/.]+$/, ""),
      tags: "",
      summary: "",
      categoryId: "",
      progress: 0,
      status: "idle"
    })
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setDragActive(true)
  }

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setDragActive(false)
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setDragActive(false)

    const files = event.dataTransfer.files
    if (files.length > 0) {
      validateAndSetFile(files[0])
    }
  }

  const handleUpload = async () => {
    if (!currentSession || !currentSession.file) {
      return
    }

    // 如果是暂停状态，恢复上传
    if (currentSession.status === "paused" && currentSession.uploadId) {
      await resumeUpload()
      return
    }

    // 开始新的上传
    setCurrentSession(prev => prev ? { ...prev, status: "uploading", errorMessage: undefined } : null)
    
    uploadAbortController.current = new AbortController()

    try {
      const startTime = Date.now()
      let lastProgress = 0
      let lastTime = startTime

      const result = await ArchiveService.uploadArchiveWithChunks(
        currentSession.file,
        {
          title: title || currentSession.title,
          tags: tags || currentSession.tags,
          summary: summary || currentSession.summary,
          categoryId: categoryId || currentSession.categoryId
        },
        {
          onProgress: (progress) => {
            setCurrentSession(prev => prev ? { ...prev, progress } : null)
            
            // 计算上传速度
            const currentTime = Date.now()
            const timeDiff = (currentTime - lastTime) / 1000 // 秒
            const progressDiff = progress - lastProgress
            
            if (timeDiff > 0 && progressDiff > 0) {
              const fileSize = currentSession.file.size
              const uploadedSize = (progress / 100) * fileSize
              const speed = (progressDiff / 100 * fileSize) / timeDiff // bytes per second
              const remainingSize = fileSize - uploadedSize
              const estimatedTime = remainingSize / speed
              
              setCurrentSession(prev => prev ? {
                ...prev,
                currentSpeed: speed,
                estimatedTime
              } : null)
              
              lastProgress = progress
              lastTime = currentTime
            }
          },
          onChunkComplete: (chunkIndex, totalChunks, uploadedChunks) => {
            setCurrentSession(prev => prev ? {
              ...prev,
              uploadedChunks: uploadedChunks,
              totalChunks
            } : null)
          },
          onError: (error, chunkIndex) => {
            console.error(`分片上传错误:`, error, chunkIndex)
            setCurrentSession(prev => prev ? {
              ...prev,
              status: "error",
              errorMessage: `分片 ${chunkIndex} 上传失败: ${error.message}`
            } : null)
          }
        }
      )

      if (result.success && result.id) {
        setCurrentSession(prev => prev ? { ...prev, status: "success", progress: 100 } : null)
        setTimeout(() => {
          setOpen(false)
          resetForm()
          onUploadComplete?.(result.id!)
        }, 2000)
      } else {
        setCurrentSession(prev => prev ? {
          ...prev,
          status: "error",
          errorMessage: result.error || t("upload.uploadFailed")
        } : null)
      }
    } catch (error) {
      setCurrentSession(prev => prev ? {
        ...prev,
        status: "error",
        errorMessage: ArchiveService.getUploadErrorMessage(error)
      } : null)
    }
  }

  const handlePause = () => {
    if (uploadAbortController.current) {
      uploadAbortController.current.abort()
      uploadAbortController.current = null
    }
    
    setCurrentSession(prev => prev ? { ...prev, status: "paused" } : null)
  }

  const resumeUpload = async () => {
    if (!currentSession || !currentSession.uploadId) {
      return
    }

    setCurrentSession(prev => prev ? { ...prev, status: "uploading" } : null)
    uploadAbortController.current = new AbortController()

    try {
      const result = await ArchiveService.resumeUpload(
        currentSession.uploadId,
        currentSession.file,
        {
          title: title || currentSession.title,
          tags: tags || currentSession.tags,
          summary: summary || currentSession.summary,
          categoryId: categoryId || currentSession.categoryId
        },
        {
          onProgress: (progress) => {
            setCurrentSession(prev => prev ? { ...prev, progress } : null)
          },
          onChunkComplete: (chunkIndex, totalChunks, uploadedChunks) => {
            setCurrentSession(prev => prev ? {
              ...prev,
              uploadedChunks: uploadedChunks,
              totalChunks
            } : null)
          },
          onError: (error, chunkIndex) => {
            console.error(`分片上传错误:`, error, chunkIndex)
            setCurrentSession(prev => prev ? {
              ...prev,
              status: "error",
              errorMessage: `分片 ${chunkIndex} 上传失败: ${error.message}`
            } : null)
          }
        }
      )

      if (result.success && result.id) {
        setCurrentSession(prev => prev ? { ...prev, status: "success", progress: 100 } : null)
        setTimeout(() => {
          setOpen(false)
          resetForm()
          onUploadComplete?.(result.id!)
        }, 2000)
      } else {
        setCurrentSession(prev => prev ? {
          ...prev,
          status: "error",
          errorMessage: result.error || t("upload.uploadFailed")
        } : null)
      }
    } catch (error) {
      setCurrentSession(prev => prev ? {
        ...prev,
        status: "error",
        errorMessage: ArchiveService.getUploadErrorMessage(error)
      } : null)
    }
  }

  const handleCancel = async () => {
    if (uploadAbortController.current) {
      uploadAbortController.current.abort()
      uploadAbortController.current = null
    }

    if (currentSession?.uploadId) {
      await ArchiveService.cancelUpload(currentSession.uploadId)
    }

    resetForm()
    setOpen(false)
  }

  const handleRetry = () => {
    if (currentSession) {
      setCurrentSession({
        ...currentSession,
        status: "idle",
        progress: 0,
        errorMessage: undefined,
        uploadedChunks: 0,
        totalChunks: undefined
      })
    }
  }

  const resetForm = () => {
    setCurrentSession(null)
    setTitle("")
    setTags("")
    setSummary("")
    setCategoryId("")
    setDragActive(false)
    setIsResumable(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleClose = () => {
    if (currentSession?.status === "uploading") {
      if (!confirm("上传正在进行中，确定要关闭吗？")) {
        return
      }
      handleCancel()
    } else {
      resetForm()
    }
    setOpen(false)
  }

  const formatSpeed = (bytesPerSecond: number) => {
    if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(0)} B/s`
    if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`
    return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`
  }

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}秒`
    if (seconds < 3600) return `${Math.round(seconds / 60)}分钟`
    return `${Math.round(seconds / 3600)}小时`
  }

  const getStatusIcon = () => {
    if (!currentSession) return <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
    
    switch (currentSession.status) {
      case "uploading":
        return <Upload className="mx-auto h-12 w-12 text-blue-500 mb-4 animate-pulse" />
      case "paused":
        return <Pause className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
      case "success":
        return <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
      case "error":
        return <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
      default:
        return <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
    }
  }

  const getStatusText = () => {
    if (!currentSession) return t("upload.dragOrClick")
    
    switch (currentSession.status) {
      case "uploading":
        return t("upload.uploading")
      case "paused":
        return "上传已暂停"
      case "success":
        return "上传成功"
      case "error":
        return currentSession.errorMessage || t("upload.uploadFailed")
      default:
        return t("upload.dragOrClick")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t("upload.title")}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* 文件选择区域 */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            {getStatusIcon()}
            
            {!currentSession?.file ? (
              <div>
                <p className="text-gray-600 mb-4">{getStatusText()}</p>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {t("upload.browse")}
                </Button>
                <p className="text-sm text-gray-500 mt-2">
                  {t("upload.supportedFormats")}: {supportedFormats.join(", ")}
                </p>
              </div>
            ) : (
              <div className="text-left">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium truncate flex-1 mr-2">{currentSession.file.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentSession(null)}
                    disabled={currentSession.status === "uploading"}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-500">
                  {(currentSession.file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                
                {/* 上传进度 */}
                {currentSession.status !== "idle" && (
                  <div className="mt-4 space-y-2">
                    <Progress value={currentSession.progress} className="w-full" />
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{currentSession.progress.toFixed(1)}%</span>
                      {currentSession.uploadedChunks && currentSession.totalChunks && (
                        <span>分片: {currentSession.uploadedChunks}/{currentSession.totalChunks}</span>
                      )}
                    </div>
                    
                    {/* 上传速度和预计时间 */}
                    {currentSession.currentSpeed && (
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>速度: {formatSpeed(currentSession.currentSpeed)}</span>
                        {currentSession.estimatedTime && (
                          <span>剩余: {formatTime(currentSession.estimatedTime)}</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                <p className="text-sm mt-2">{getStatusText()}</p>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={supportedFormats.join(",")}
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* 元数据输入 */}
          {currentSession?.file && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">{t("upload.title")}</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("upload.titlePlaceholder")}
                  disabled={currentSession.status === "uploading"}
                />
              </div>
              
              <div>
                <Label htmlFor="tags">{t("upload.tags")}</Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder={t("upload.tagsPlaceholder")}
                  disabled={currentSession.status === "uploading"}
                />
              </div>
              
              <div>
                <Label htmlFor="summary">{t("upload.summary")}</Label>
                <Textarea
                  id="summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  placeholder={t("upload.summaryPlaceholder")}
                  disabled={currentSession.status === "uploading"}
                />
              </div>
              
              <div>
                <Label htmlFor="category">{t("upload.category")}</Label>
                <Input
                  id="category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  placeholder={t("upload.categoryPlaceholder")}
                  disabled={currentSession.status === "uploading"}
                />
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          {currentSession?.file && (
            <div className="flex gap-2">
              {currentSession.status === "idle" && (
                <Button onClick={handleUpload} className="flex-1">
                  <Upload className="w-4 h-4 mr-2" />
                  {t("upload.upload")}
                </Button>
              )}
              
              {currentSession.status === "uploading" && (
                <>
                  <Button onClick={handlePause} variant="outline">
                    <Pause className="w-4 h-4 mr-2" />
                    暂停
                  </Button>
                  <Button onClick={handleCancel} variant="outline">
                    <X className="w-4 h-4 mr-2" />
                    取消
                  </Button>
                </>
              )}
              
              {currentSession.status === "paused" && (
                <>
                  <Button onClick={handleUpload} className="flex-1">
                    <Play className="w-4 h-4 mr-2" />
                    恢复
                  </Button>
                  <Button onClick={handleCancel} variant="outline">
                    <X className="w-4 h-4 mr-2" />
                    取消
                  </Button>
                </>
              )}
              
              {currentSession.status === "error" && (
                <>
                  <Button onClick={handleRetry} className="flex-1">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    重试
                  </Button>
                  <Button onClick={handleCancel} variant="outline">
                    <X className="w-4 h-4 mr-2" />
                    取消
                  </Button>
                </>
              )}
              
              {currentSession.status === "success" && (
                <Button onClick={handleClose} className="flex-1">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {t("upload.close")}
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}