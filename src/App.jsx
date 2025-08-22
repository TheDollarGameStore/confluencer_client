import React, { useCallback } from 'react'
import Feed from './components/Feed'
import './App.css'

function App() {
  const handleVisibleChange = useCallback((name, index) => {
    console.log('App visible image:', index + 1, name)
  }, [])

  return <Feed onVisibleChange={handleVisibleChange} />
}

export default App
