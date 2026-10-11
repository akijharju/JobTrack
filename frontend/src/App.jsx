import { useState } from 'react'
import { apiRequest } from './api'
import JobForm from './JobForm'
import JobList from './JobList'
import { statusLabels } from './jobLabels'
import JobImport from './JobImport'

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

  // Keep the filter options that match the currently displayed list.
  const [filters, setFilters] = useState({
    status: '',
    sort: 'newest',
  })

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

      // Each login starts with all jobs in the backend's default order.
      setFilters({ status: '', sort: 'newest' })

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

  async function loadJobs(nextFilters) {
    // Build the query string without joining parameter values by hand.
    const query = new URLSearchParams({
      sort: nextFilters.sort,
    })

    // An omitted status means all statuses; an empty parameter is invalid.
    if (nextFilters.status) {
      query.set('status', nextFilters.status)
    }

    // The backend handles filtering, ordering and ownership checks.
    const ownJobs = await apiRequest(`/jobs?${query.toString()}`, {
      token: session.token,
    })

    // Change the list and its selected options only after a successful fetch.
    setJobs(ownJobs)
    setFilters(nextFilters)
  }

  async function refreshJobs(nextFilters = filters) {
    if (isBusy) return

    setError('')
    setNotice('')
    setIsBusy(true)

    try {
      await loadJobs(nextFilters)
    } catch (requestError) {
      // Keep the previous list and options if the new request fails.
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

  async function previewImport(file) {
    if (isBusy) return null

    setError('')
    setNotice('')
    setIsBusy(true)

    try {
      // Check the size before reading the file into browser memory.
      if (!(file instanceof File) || file.size === 0) {
        throw new Error('Valitse JSON-tiedosto, jossa on työpaikkojen tiedot.')
      }

      if (file.size > 256 * 1024) {
        throw new Error('Tiedosto on liian suuri. Enimmäiskoko on 256 KiB.')
      }

      // Read the file as text; parsing does not execute its contents.
      const text = await file.text()
      let body

      try {
        body = JSON.parse(text)
      } catch {
        throw new Error('Tiedosto ei ole kelvollista JSONia. Tarkista sen sisältö.')
      }

      // The backend checks the structure, fields and current duplicates.
      return await apiRequest('/job-import/preview', {
        method: 'POST',
        token: session.token,
        body,
      })
    } catch (requestError) {
      showRequestError(requestError)
      return null
    } finally {
      setIsBusy(false)
    }
  }

  async function importJobs(selectedJobs) {
    if (isBusy || selectedJobs.length === 0) return false

    setError('')
    setNotice('')
    setIsBusy(true)

    try {
      // Send job fields only; the backend assigns IDs and ownership.
      const result = await apiRequest('/job-import/save', {
        method: 'POST',
        token: session.token,
        body: { jobs: selectedJobs },
      })

      const { imported, duplicate } = result.summary

      setNotice(
        `Tuonti valmis. Tallennettu: ${imported}. `
        + `Kaksoiskappaleita ohitettu: ${duplicate}.`
        + (filters.status
          ? ' Nykyinen tilasuodatus voi rajata työpaikkoja pois listalta.'
          : ''),
      )

      try {
        // Preserve the user's current filter and ordering after import.
        await loadJobs(filters)
      } catch (requestError) {
        if (requestError.status === 401) {
          showRequestError(requestError)
        } else {
          // A failed list refresh does not undo the completed import.
          setError(
            'Tuonti onnistui, mutta lista ei päivittynyt. '
            + 'Näkyvä lista voi olla vanhentunut. Paina Päivitä lista.',
          )
        }
      }

      // Close the preview after a confirmed save, even if refresh failed.
      return true
    } catch (requestError) {
      // Keep the selection available so the user can retry the import.
      showRequestError(requestError)
      return false
    } finally {
      setIsBusy(false)
    }
  }

  async function saveJob(body) {
    if (isBusy) return false

    setError('')
    setNotice('')
    setIsBusy(true)

    try {
      // Use the same form for creating and updating a job.
      const path = editingJob ? `/jobs/${editingJob.id}` : '/jobs'
      const method = editingJob ? 'PUT' : 'POST'

      const savedJob = await apiRequest(path, {
        method,
        token: session.token,
        body,
      })

      // The write succeeded, so the editor can return to creation mode.
      setEditingJob(null)

      // Explain why a saved job may be absent from the filtered list.
      const hiddenByFilter = (
        filters.status && savedJob.status !== filters.status
      )

      setNotice(
        hiddenByFilter
          ? 'Työpaikka tallennettu. Nykyinen tilasuodatus rajaa sen pois listalta.'
          : 'Työpaikka tallennettu.',
      )

      try {
        // Fetch again so changed statuses and priorities appear correctly.
        await loadJobs(filters)
      } catch (requestError) {
        if (requestError.status === 401) {
          showRequestError(requestError)
        } else {
          // A failed refresh does not undo the successful database write.
          setError(
            'Tallennus onnistui, mutta lista ei päivittynyt. '
            + 'Näkyvä lista voi olla vanhentunut. Paina Päivitä lista.',
          )
        }
      }

      // Clear the submitted form even if the later list refresh failed.
      return true
    } catch (requestError) {
      // A failed write keeps the form values available for correction.
      showRequestError(requestError)
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
          {/* Keep imported file contents inside the authenticated view. */}
          <JobImport
            onPreview={previewImport}
            onImport={importJobs}
            isBusy={isBusy}
          />
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
              {/* The count describes the current results, not all saved jobs. */}
              <h2 id="jobs-heading">
                Näytettävät työpaikat ({jobs.length})
              </h2>

              <button
                type="button"
                onClick={() => refreshJobs()}
                disabled={isBusy}
              >
                {isBusy ? 'Odota…' : 'Päivitä lista'}
              </button>
            </div>

            <div className="job-filters">
              <label>
                Hakemuksen tila
                <select
                  value={filters.status}
                  onChange={(event) => refreshJobs({
                    ...filters,
                    status: event.target.value,
                  })}
                  disabled={isBusy}
                >
                  <option value="">Kaikki tilat</option>

                  {/* Reuse the same status names as the editing form. */}
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Järjestys
                <select
                  value={filters.sort}
                  onChange={(event) => refreshJobs({
                    ...filters,
                    sort: event.target.value,
                  })}
                  disabled={isBusy}
                >
                  <option value="newest">Uusimmat ensin</option>
                  <option value="priority">Prioriteetti: korkea ensin</option>
                </select>
              </label>
            </div>

            {/* Editing and deletion still use the existing handlers. */}
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