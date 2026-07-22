import { useEffect, useRef, useState } from 'react'

export function useSpeechTranscriber(onFinalChunk) {
  const recognitionRef = useRef(null)
  const finalChunkRef = useRef(onFinalChunk)
  const [supported, setSupported] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [transcriptLines, setTranscriptLines] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    finalChunkRef.current = onFinalChunk
  }, [onFinalChunk])

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      setSupported(false)
      return undefined
    }

    setSupported(true)
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-IN'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event) => {
      let interim = ''

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        const chunk = result[0]?.transcript?.trim()

        if (!chunk) {
          continue
        }

        if (result.isFinal) {
          setTranscriptLines((current) => [...current, chunk])
          finalChunkRef.current?.(chunk)
        } else {
          interim += `${chunk} `
        }
      }

      setInterimText(interim.trim())
    }

    recognition.onerror = (event) => {
      setError(event.error || 'speech-recognition-error')
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      recognition.stop()
    }
  }, [])

  const start = async () => {
    setError('')

    if (!recognitionRef.current) {
      setSupported(false)
      return
    }

    try {
      recognitionRef.current.start()
      setIsListening(true)
    } catch (speechError) {
      setError(speechError.message)
    }
  }

  const stop = () => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }

  const injectText = (text) => {
    const chunk = text.trim()
    if (!chunk) {
      return
    }

    setTranscriptLines((current) => [...current, chunk])
    finalChunkRef.current?.(chunk)
  }

  return {
    supported,
    isListening,
    interimText,
    transcriptLines,
    error,
    start,
    stop,
    injectText,
    setTranscriptLines
  }
}