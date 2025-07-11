'use client';

import { useState, useCallback } from 'react';

export type LoadingType = 'organizations' | 'brands' | 'campaigns' | 'processing' | 'uploading' | 'auth' | 'general' | 'error' | 'success' | 'empty';

interface LoadingState {
  isVisible: boolean;
  type: LoadingType;
  message: string;
  progress?: number;
}

export const useQAlienLoading = (defaultType: LoadingType = 'general') => {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isVisible: false,
    type: defaultType,
    message: '',
    progress: undefined
  });

  const startLoading = useCallback((
    type: LoadingType = defaultType,
    message?: string,
    progress?: number
  ) => {
    const defaultMessages: Record<LoadingType, string> = {
      organizations: 'Scanning the galaxy for organizations...',
      brands: 'Discovering brand universes...',
      campaigns: 'Exploring campaign constellations...',
      processing: 'Computing with alien precision...',
      uploading: 'Beaming files to the mothership...',
      auth: 'Establishing secure alien connection...',
      general: 'QAlien is thinking...',
      error: 'Houston, we have a problem...',
      success: 'Mission accomplished! 🛸',
      empty: 'The universe seems empty here...'
    };

    setLoadingState({
      isVisible: true,
      type,
      message: message || defaultMessages[type],
      progress
    });
  }, [defaultType]);

  const updateProgress = useCallback((progress: number) => {
    setLoadingState(prev => ({
      ...prev,
      progress
    }));
  }, []);

  const updateMessage = useCallback((message: string) => {
    setLoadingState(prev => ({
      ...prev,
      message
    }));
  }, []);

  const stopLoading = useCallback(() => {
    setLoadingState(prev => ({
      ...prev,
      isVisible: false
    }));
  }, []);

  const setLoadingWithProgress = useCallback(async (
    type: LoadingType,
    task: () => Promise<void>,
    progressSteps: { message: string; progress: number }[]
  ) => {
    try {
      startLoading(type, progressSteps[0]?.message);
      
      for (const step of progressSteps) {
        updateMessage(step.message);
        updateProgress(step.progress);
        
        // Small delay to show progress updates
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      await task();
    } finally {
      stopLoading();
    }
  }, [startLoading, updateMessage, updateProgress, stopLoading]);

  // Helper functions for contextual loading states
  const showError = useCallback((message?: string) => {
    startLoading('error', message || 'Houston, we have a problem...');
  }, [startLoading]);

  const showSuccess = useCallback((message?: string) => {
    startLoading('success', message || 'Mission accomplished! 🛸');
  }, [startLoading]);

  const showEmpty = useCallback((message?: string) => {
    startLoading('empty', message || 'The universe seems empty here...');
  }, [startLoading]);

  const showProcessing = useCallback((message?: string) => {
    startLoading('processing', message || 'Computing with alien precision...');
  }, [startLoading]);

  const showAuth = useCallback((message?: string) => {
    startLoading('auth', message || 'Establishing secure alien connection...');
  }, [startLoading]);

  // Auto-dismiss success and error states after a delay
  const showTemporarySuccess = useCallback((message?: string, duration: number = 2000) => {
    showSuccess(message);
    setTimeout(() => {
      stopLoading();
    }, duration);
  }, [showSuccess, stopLoading]);

  const showTemporaryError = useCallback((message?: string, duration: number = 3000) => {
    showError(message);
    setTimeout(() => {
      stopLoading();
    }, duration);
  }, [showError, stopLoading]);

  return {
    ...loadingState,
    startLoading,
    stopLoading,
    updateProgress,
    updateMessage,
    setLoadingWithProgress,
    // Contextual helpers
    showError,
    showSuccess,
    showEmpty,
    showProcessing,
    showAuth,
    showTemporarySuccess,
    showTemporaryError
  };
};

export default useQAlienLoading;