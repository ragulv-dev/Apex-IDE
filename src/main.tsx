import React from 'react'
import ReactDOM from 'react-dom/client'
import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import App from './App'
import './styles/globals.css'

// Configure @monaco-editor/react to use local bundled monaco instance
// This completely avoids CDN dependency and prevents "Loading..." hang offline
loader.config({ monaco })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)


