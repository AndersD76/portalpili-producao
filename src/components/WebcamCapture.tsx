'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface WebcamCaptureProps {
  onPhotoCapture: (photoDataUrl: string) => void;
  currentPhoto?: string | null;
}

export default function WebcamCapture({
  onPhotoCapture,
  currentPhoto,
}: WebcamCaptureProps) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(currentPhoto || null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
      }
    } catch (err) {
      console.error('Erro ao acessar câmera:', err);
      setError('Erro ao acessar a câmera. Verifique as permissões.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current) {
      console.error('Video ref não disponível');
      return;
    }

    // Verificar se o vídeo está pronto
    if (videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      alert('Aguarde o vídeo carregar completamente');
      return;
    }

    const video = videoRef.current;
    const canvas = document.createElement('canvas');

    // Usar as dimensões do vídeo ou definir dimensões padrão
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    console.log('Capturando foto:', canvas.width, 'x', canvas.height);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

      console.log('Foto capturada, tamanho:', dataUrl.length);

      setCapturedPhoto(dataUrl);
      onPhotoCapture(dataUrl);
      stopCamera();
    } else {
      console.error('Não foi possível obter contexto do canvas');
    }
  }, [onPhotoCapture, stopCamera]);

  const retakePhoto = useCallback(() => {
    setCapturedPhoto(null);
    onPhotoCapture('');
    startCamera();
  }, [startCamera, onPhotoCapture]);

  // Limpar stream quando o componente for desmontado
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="bg-gray-100 rounded-lg overflow-hidden">
        {!isStreaming && !capturedPhoto && (
          <div className="flex flex-col items-center justify-center p-8 space-y-4">
            <svg
              className="w-16 h-16 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <p className="text-sm text-gray-600 text-center">
              Tire uma foto do responsável pela execução da atividade
            </p>
            <button
              type="button"
              onClick={startCamera}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
              </svg>
              <span>Abrir Câmera</span>
            </button>
          </div>
        )}

        {isStreaming && (
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full"
            />
            <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-3">
              <button
                type="button"
                onClick={stopCamera}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={capturePhoto}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                </svg>
                <span>Capturar Foto</span>
              </button>
            </div>
          </div>
        )}

        {capturedPhoto && (
          <div className="relative">
            <img src={capturedPhoto} alt="Foto capturada" className="w-full" />
            <div className="absolute bottom-4 left-0 right-0 flex justify-center">
              <button
                type="button"
                onClick={retakePhoto}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span>Tirar Nova Foto</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      <p className="text-xs text-gray-500 text-center">
        A foto será anexada como comprovação da execução da atividade
      </p>
    </div>
  );
}
