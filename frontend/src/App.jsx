import { useState } from 'react'
import { apiRequest } from './api'
import JobForm from './JobForm'
import JobList from './JobList'

export default function App() {
  // Keep the session in memory; reloading the page requires a new login.
  const [session, setSession] = useState(null)

  // Store the jobs shown in the list.
  const [jobs, setJobs] = useState([])

  // Null means creation mode; a job object means editing mode.
  const [editingJob, setEditingJob] = useState(null)

  // Keep error messages separate from successful action messages.
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // Disable controls while a request is running.
  const [isBusy, setIsBusy] = useState(false)

  // Switch between login and registration without leaving the page.
  const [isRegistering, setIsRegistering] = useState(false)

  async function handleAuth(event) {
    // Handle submission in React without reloading the page.
    event.preventDefault()

    if (isBusy) return

    // Read the credentials before the inputs become disabled.
    const form = event.currentTarget
    const formData = new FormData(form)
    const credentials = {
      username: formData.get('username'),
      password: formData.get('password'),
    }

    setError('')
    setNotice('')
    setIsBusy(true)

    try {
      if (isRegistering) {
        // The backend validates the input and hashes the password.
        const user = await apiRequest('/auth/register', {
          method: 'POST',
          body: credentials,
        })

        // Registration creates an account but does not return a login token.
        form.reset()
        setIsRegistering(false)
        setNotice(`Tunnus ${user.username} luotiin. Kirjaudu sisään.`)

        // Stop here so account creation does not also attempt a login.
        return
      }

      const login = await apiRequest('/auth/login', {
        method: 'POST',
        body: credentials,
      })

      // Fetch private records using the token returned by the backend.
      const ownJobs = await apiRequest('/jobs', {
        token: login.token,
      })

      // Open the main view only after both requests succeed.
      form.reset()
      setJobs(ownJobs)
      setSession(login)
    } catch (requestError) {
      // Show backend errors, such as an existing username, above the form.
      setError(requestError.message)
    } finally {
      // This also runs after the return in the registration branch.
      setIsBusy(false)
    }
  }

  function changeAuthMode() {
    // Do not switch forms while a login or registration request is running.
    if (isBusy) return

    setIsRegistering((currentMode) => !currentMode)

    // Old messages may no longer describe the newly selected form.
    setError('')
    setNotice('')
  }

  // Handle failures from requests that require a logged-in user.
  function showRequestError(requestError) {
    // A rejected session must also clear private data from the screen.
    if (requestError.status === 401) {
      setSession(null)
      setJobs([])
      setEditingJob(null)
    }

    setError(requestError.message)
  }

  async function refreshJobs() {
    if (isBusy) return

    setError('')
    setNotice('')
    setIsBusy(true)

    try {
      // Replace the local list with the current records from the server.
      const ownJobs = await apiRequest('/jobs', {
        token: session.token,
      })

      setJobs(ownJobs)
    } catch (requestError) {
      showRequestError(requestError)
    } finally {
      setIsBusy(false)
    }
  }

  function startEditing(job) {
    if (isBusy) return

    // Selecting a job fills the shared form with its saved values.
    setEditingJob(job)
    setError('')
    setNotice('')
  }

  function cancelEditing() {
    // Form edits have not been saved, so no API request is needed.
    setEditingJob(null)
    setError('')
    setNotice('')
  }

  async function saveJob(body) {
    if (isBusy) return false

    setError('')
    setNotice('')
    setIsBusy(true)

    try {
      // Use POST for a new job and PUT to replace an existing job's fields.
      const path = editingJob ? `/jobs/${editingJob.id}` : '/jobs'
      const method = editingJob ? 'PUT' : 'POST'

      const savedJob = await apiRequest(path, {
        method,
        token: session.token,
        body,
      })

      // Use the server's values, which include the ID and cleaned input.
      setJobs((currentJobs) => (
        editingJob
          ? currentJobs.map((job) => (
              job.id === savedJob.id ? savedJob : job
            ))
          : [savedJob, ...currentJobs]
      ))

      // Return to creation mode after a successful save.
      setEditingJob(null)
      setNotice('Työpaikka tallennettu.')

      // Tell JobForm that it may clear the submitted values.
      return true
    } catch (requestError) {
      showRequestError(requestError)

      // Keep the entered values so the user can correct them or retry.
      return false
    } finally {
      setIsBusy(false)
    }
  }

  async function deleteJob(job) {
    if (isBusy) return

    // Ask before sending a request that removes a database record.
    const confirmed = window.confirm(
      `Poistetaanko työpaikka "${job.title}" (${job.company})?`,
    )

    if (!confirmed) return

    setError('')
    setNotice('')
    setIsBusy(true)

    try {
      await apiRequest(`/jobs/${job.id}`, {
        method: 'DELETE',
        token: session.token,
      })

      // Remove the row only after the server confirms deletion.
      setJobs((currentJobs) => (
        currentJobs.filter((item) => item.id !== job.id)
      ))

      // Close the editor if the deleted job was being edited.
      if (editingJob?.id === job.id) {
        setEditingJob(null)
      }

      setNotice('Työpaikka poistettu.')
    } catch (requestError) {
      showRequestError(requestError)
    } finally {
      setIsBusy(false)
    }
  }

  function handleLogout() {
    // Forget the local token; this does not revoke it on the server.
    setSession(null)

    // Clear private records and unfinished edits from the current view.
    setJobs([])
    setEditingJob(null)
    setError('')
    setNotice('')
  }

  return (
    <main>
      <header className="page-header">
        <div>
          <h1>JobTrack</h1>
          <p>Omat työpaikat ja hakemukset yhdessä paikassa.</p>
        </div>

        {/* Show session controls only after a successful login. */}
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

      {/* Announce changing messages to screen reader users. */}
      {error && <p className="error" role="alert">{error}</p>}
      {notice && <p className="notice" role="status">{notice}</p>}

      {!session ? (
        <section className="login-panel" aria-labelledby="auth-heading">
          <h2 id="auth-heading">
            {isRegistering ? 'Luo käyttäjätili' : 'Kirjaudu sisään'}
          </h2>

          {/* A changed key clears credentials when the form mode changes. */}
          <form
            key={isRegistering ? 'register' : 'login'}
            onSubmit={handleAuth}
          >
            <label htmlFor="username">Käyttäjätunnus</label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              aria-describedby={isRegistering ? 'username-help' : undefined}
              required
              disabled={isBusy}
            />

            {/* Show account rules when the user is choosing new credentials. */}
            {isRegistering && (
              <p id="username-help">
                Käytä 3–30 merkkiä: kirjaimia a–z, numeroita tai alaviivaa.
                Isot kirjaimet muutetaan pieniksi.
              </p>
            )}

            <label htmlFor="password">Salasana</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
              aria-describedby={isRegistering ? 'password-help' : undefined}
              required
              disabled={isBusy}
            />

            {/* The backend measures the byte limit because Unicode sizes vary. */}
            {isRegistering && (
              <p id="password-help">
                Vähintään 8 merkkiä ja enintään 72 tavua.
                Erikoismerkit ja emojit voivat käyttää useita tavuja.
              </p>
            )}

            <button type="submit" disabled={isBusy}>
              {isBusy
                ? 'Odota…'
                : isRegistering
                  ? 'Luo käyttäjätili'
                  : 'Kirjaudu sisään'}
            </button>

            {/* This button changes the form mode without submitting credentials. */}
            <button
              type="button"
              onClick={changeAuthMode}
              disabled={isBusy}
            >
              {isRegistering
                ? 'Takaisin kirjautumiseen'
                : 'Ei tunnusta? Luo käyttäjätili'}
            </button>
          </form>
        </section>
      ) : (
        <div className="workspace">
          {/* A changed key resets the form when the selected job changes. */}
          <JobForm
            key={editingJob?.id ?? 'new'}
            job={editingJob}
            onSave={saveJob}
            onCancel={cancelEditing}
            isBusy={isBusy}
          />

          <section aria-labelledby="jobs-heading">
            <div className="list-header">
              <h2 id="jobs-heading">Työpaikat ({jobs.length})</h2>

              <button
                type="button"
                onClick={refreshJobs}
                disabled={isBusy}
              >
                {isBusy ? 'Odota…' : 'Päivitä lista'}
              </button>
            </div>

            {/* The list calls these handlers without managing API requests. */}
            <JobList
              jobs={jobs}
              onEdit={startEditing}
              onDelete={deleteJob}
              isBusy={isBusy}
            />
          </section>
        </div>
      )}
    </main>
  )
}