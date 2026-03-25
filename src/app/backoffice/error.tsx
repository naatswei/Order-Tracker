'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCcw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Backoffice Error:', error)
  }, [error])

  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center p-6 text-center space-y-6">
      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
        <AlertCircle className="w-8 h-8 text-red-600" />
      </div>
      
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-slate-900">Something went wrong</h2>
        <p className="text-slate-500 max-w-md mx-auto">
          We encountered a client-side error in the dashboard.
          {error.message && (
            <code className="block mt-4 p-3 bg-slate-100 rounded text-xs text-left overflow-auto max-h-32">
              {error.message}
            </code>
          )}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <Button 
          onClick={() => reset()}
          className="bg-[#191A43] hover:bg-[#191A43]/90 text-white gap-2 px-6"
        >
          <RefreshCcw className="w-4 h-4" /> Try again
        </Button>
        
        <Button 
          variant="outline"
          onClick={() => window.location.reload()}
          className="border-slate-200 text-slate-600 hover:bg-slate-50"
        >
          Reload page
        </Button>
      </div>
      
      <p className="text-xs text-slate-400">
        Error Digest: {error.digest || 'no-digest'}
      </p>
    </div>
  )
}
