import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { HomePage } from './pages/HomePage'
import { NotePage } from './pages/NotePage'
import { notes } from './content/notes'

export function App() {
  const firstNote = notes[0]

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="notes/:noteId" element={<NotePage />} />
        <Route
          path="*"
          element={firstNote ? <Navigate to={`/notes/${firstNote.id}`} replace /> : <HomePage />}
        />
      </Route>
    </Routes>
  )
}
