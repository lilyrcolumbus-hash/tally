import { useCallback, useRef, useState } from 'react'

/**
 * Records mic audio with MediaRecorder. We do NOT use the Web Speech API —
 * it is unsupported in iOS Safari PWAs. The recorded blob is sent to Gemini
 * for transcription + extraction.
 */
export function useRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  const start = useCallback(async (): Promise<void> => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      chunksRef.current = []
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      const recorder = new MediaRecorder(stream, { mimeType: mime })
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.start()
      recorderRef.current = recorder
      setIsRecording(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Microphone access denied')
      throw err
    }
  }, [])

  const stop = useCallback((): Promise<{ blob: Blob; mimeType: string } | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current
      if (!recorder) {
        resolve(null)
        return
      }
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type: mimeType })
        streamRef.current?.getTracks().forEach((t) => t.stop())
        streamRef.current = null
        recorderRef.current = null
        setIsRecording(false)
        resolve(blob.size > 0 ? { blob, mimeType } : null)
      }
      recorder.stop()
    })
  }, [])

  const cancel = useCallback((): void => {
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') recorder.stop()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    recorderRef.current = null
    chunksRef.current = []
    setIsRecording(false)
  }, [])

  return { isRecording, error, start, stop, cancel }
}
