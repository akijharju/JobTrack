import { useState } from 'react'
import { apiRequest } from './api'
import JobList from './JobList'

export default function App() {
  // Keep the session in memory; reloading the page requires a new login.
  const [session, setSession] = useState(null)
  const [jobs, setJobs] = useState([])
  const [error, setError] = useState('')
  const [isBusy, setIsBusy] = useState(false)

  async function handleLogin(event) {
    // Handle the form in React instead of letting the browser reload the page.
    event.preventDefault()

    if (isBusy) return

    const form = event.currentTarget
    const formData = new FormData(form)

    setError('')
    setIsBusy(true)

    try {
      const login = await apiRequest('/auth/login', {
        method: 'POST',
        body: {
          username: formData.get('username'),
          password: formData.get('password'),
        },
      })

      // Fetch this user's records with the token returned by the backend.
      const ownJobs = await apiRequest('/jobs', {
        token: login.token,
      })

      // Clear the form before switching to the authenticated view.
      form.reset()
      setJobs(ownJobs)
      setSession(login)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      // Always allow another attempt after success or failure.
      setIsBusy(false)
    }
  }

  async function refreshJobs() {
    if (isBusy) return

    setError('')
    setIsBusy(true)

    try {
      const ownJobs = await apiRequest('/jobs', {
        token: session.token,
      })

      setJobs(ownJobs)
    } catch (requestError) {
      // Remove private records from the view when authentication is rejected.
      if (requestError.status === 401) {
        setSession(null)
        setJobs([])
      }

      setError(requestError.message)
    } finally {
      setIsBusy(false)
    }
  }

  function handleLogout() {
    // Forget the local token and remove the previous user's records.
    setSession(null)
    setJobs([])
    setError('')
  }

  return (
    <main>
      <header className="page-header">
        <div>
          <h1>JobTrack</h1>
          <p>Omat työpaikat ja hakemukset yhdessä paikassa.</p>
        </div>

        {session && (
          <div className="session-controls">
            <span>{session.user.username}</span>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isBusy}
            >
              Kirjaudu ulos
            </button>
          </div>
        )}
      </header>

      {error && <p className="error" role="alert">{error}</p>}

      {!session ? (
        <section className="login-panel" aria-labelledby="login-heading">
          <h2 id="login-heading">Kirjaudu sisään</h2>

          <form onSubmit={handleLogin}>
            <label htmlFor="username">Käyttäjätunnus</label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              required
              disabled={isBusy}
            />

            <label htmlFor="password">Salasana</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={isBusy}
            />

            <button type="submit" disabled={isBusy}>
              {isBusy ? 'Kirjaudutaan…' : 'Kirjaudu sisään'}
            </button>
          </form>
        </section>
      ) : (
        <section aria-labelledby="jobs-heading">
          <div className="list-header">
            <h2 id="jobs-heading">Työpaikat ({jobs.length})</h2>
            <button
              type="button"
              onClick={refreshJobs}
              disabled={isBusy}
            >
              {isBusy ? 'Päivitetään…' : 'Päivitä lista'}
            </button>
          </div>

          <JobList jobs={jobs} />
        </section>
      )}
    </main>
  )
}