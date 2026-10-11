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

  // Navigation tab: 'jobs' | 'new' | 'import'
  const [activeTab, setActiveTab] = useState('jobs')

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
    event.preventDefault()

    if (isBusy) return

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
        const user = await apiRequest('/auth/register', {
          method: 'POST',
          body: credentials,
        })

        form.reset()
        setIsRegistering(false)
        setNotice(`Tunnus ${user.username} luotiin onnistuneesti. Voit nyt kirjautua sisään.`)
        return
      }

      const login = await apiRequest('/auth/login', {
        method: 'POST',
        body: credentials,
      })

      const ownJobs = await apiRequest('/jobs', {
        token: login.token,
      })

      form.reset()
      setJobs(ownJobs)
      setFilters({ status: '', sort: 'newest' })
      setActiveTab('jobs')
      setEditingJob(null)
      setSession(login)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsBusy(false)
    }
  }

  function changeAuthMode() {
    if (isBusy) return

    setIsRegistering((currentMode) => !currentMode)
    setError('')
    setNotice('')
  }

  function showRequestError(requestError) {
    if (requestError.status === 401) {
      setSession(null)
      setJobs([])
      setEditingJob(null)
      setActiveTab('jobs')
    }

    setError(requestError.message)
  }

  async function loadJobs(nextFilters) {
    const query = new URLSearchParams({
      sort: nextFilters.sort,
    })

    if (nextFilters.status) {
      query.set('status', nextFilters.status)
    }

    const ownJobs = await apiRequest(`/jobs?${query.toString()}`, {
      token: session.token,
    })

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
      showRequestError(requestError)
    } finally {
      setIsBusy(false)
    }
  }

  function startEditing(job) {
    if (isBusy) return

    setEditingJob(job)
    setActiveTab('new')
    setError('')
    setNotice('')
  }

  function cancelEditing() {
    setEditingJob(null)
    setActiveTab('jobs')
    setError('')
    setNotice('')
  }

  async function previewImport(file) {
    if (isBusy) return null

    setError('')
    setNotice('')
    setIsBusy(true)

    try {
      if (!(file instanceof File) || file.size === 0) {
        throw new Error('Valitse JSON-tiedosto, jossa on työpaikkojen tiedot.')
      }

      if (file.size > 256 * 1024) {
        throw new Error('Tiedosto on liian suuri. Enimmäiskoko on 256 KiB.')
      }

      const text = await file.text()
      let body

      try {
        body = JSON.parse(text)
      } catch {
        throw new Error('Tiedosto ei ole kelvollista JSONia. Tarkista sen sisältö.')
      }

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
        await loadJobs(filters)
      } catch (requestError) {
        if (requestError.status === 401) {
          showRequestError(requestError)
        } else {
          setError(
            'Tuonti onnistui, mutta lista ei päivittynyt. '
            + 'Näkyvä lista voi olla vanhentunut. Paina Päivitä lista.',
          )
        }
      }

      // Return to jobs tab after successful import
      setActiveTab('jobs')
      return true
    } catch (requestError) {
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
      const path = editingJob ? `/jobs/${editingJob.id}` : '/jobs'
      const method = editingJob ? 'PUT' : 'POST'

      const savedJob = await apiRequest(path, {
        method,
        token: session.token,
        body,
      })

      setEditingJob(null)
      setActiveTab('jobs')

      const hiddenByFilter = (
        filters.status && savedJob.status !== filters.status
      )

      setNotice(
        hiddenByFilter
          ? 'Työpaikka tallennettu. Nykyinen tilasuodatus rajaa sen pois listalta.'
          : 'Työpaikka tallennettu onnistuneesti.',
      )

      try {
        await loadJobs(filters)
      } catch (requestError) {
        if (requestError.status === 401) {
          showRequestError(requestError)
        } else {
          setError(
            'Työpaikka tallennettiin, mutta listaa ei voitu päivittää automaattisesti.',
          )
        }
      }

      return true
    } catch (requestError) {
      showRequestError(requestError)
      return false
    } finally {
      setIsBusy(false)
    }
  }

  async function deleteJob(job) {
    if (isBusy) return

    const confirmed = window.confirm(
      `Haluatko varmasti poistaa työpaikan ${job.company} – ${job.title}?`,
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

      if (editingJob?.id === job.id) {
        setEditingJob(null)
      }

      setNotice(`Työpaikka ${job.company} – ${job.title} poistettiin.`)

      try {
        await loadJobs(filters)
      } catch (requestError) {
        if (requestError.status === 401) {
          showRequestError(requestError)
        } else {
          setError(
            'Työpaikka poistettiin, mutta listaa ei voitu päivittää automaattisesti.',
          )
        }
      }
    } catch (requestError) {
      showRequestError(requestError)
    } finally {
      setIsBusy(false)
    }
  }

  function handleLogout() {
    setSession(null)
    setJobs([])
    setEditingJob(null)
    setActiveTab('jobs')
    setError('')
    setNotice('')
  }

  return (
    <main>
      <header className="page-header">
        <div className="brand-group">
          <div className="brand-logo">JT</div>
          <div>
            <h1 className="brand-title">JobTrack</h1>
            <p className="brand-subtitle">Työnhaun ja hakemusten seurantasovellus</p>
          </div>
        </div>

        {session && (
          <div className="session-controls">
            <div className="user-badge" title="Kirjautunut käyttäjä">
              <span className="user-avatar">👤</span>
              <span className="user-name">{session.user.username}</span>
            </div>

            <button
              type="button"
              className="btn-secondary"
              onClick={handleLogout}
              disabled={isBusy}
            >
              Kirjaudu ulos
            </button>
          </div>
        )}
      </header>

      {error && <div className="error-banner" role="alert">{error}</div>}
      {notice && <div className="notice-banner" role="status">{notice}</div>}

      {!session ? (
        <section className="login-panel" aria-labelledby="auth-heading">
          <h2 id="auth-heading">
            {isRegistering ? 'Luo uusi käyttäjätili' : 'Kirjaudu sisään'}
          </h2>

          <form
            key={isRegistering ? 'register' : 'login'}
            onSubmit={handleAuth}
            className="auth-form"
          >
            <div className="form-group">
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
                placeholder="esim. matti"
              />
              {isRegistering && (
                <p id="username-help" className="field-hint">
                  3–30 merkkiä: a–z, numeroita tai alaviivaa.
                </p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="password">Salasana</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isRegistering ? 'new-password' : 'current-password'}
                aria-describedby={isRegistering ? 'password-help' : undefined}
                required
                disabled={isBusy}
                placeholder="Vähintään 8 merkkiä"
              />
              {isRegistering && (
                <p id="password-help" className="field-hint">
                  Vähintään 8 merkkiä (enintään 72 tavua).
                </p>
              )}
            </div>

            <div className="auth-actions">
              <button type="submit" className="btn-primary full-width" disabled={isBusy}>
                {isBusy
                  ? 'Käsitellään…'
                  : isRegistering
                    ? 'Luo käyttäjätili'
                    : 'Kirjaudu sisään'}
              </button>

              <button
                type="button"
                className="btn-link"
                onClick={changeAuthMode}
                disabled={isBusy}
              >
                {isRegistering
                  ? '← Onko sinulla jo tunnus? Kirjaudu sisään'
                  : 'Ei vielä tunnusta? Luo uusi tili →'}
              </button>
            </div>
          </form>
        </section>
      ) : (
        <div className="workspace">
          {/* Navigation tabs for switching views cleanly */}
          <nav className="tab-nav" aria-label="Näkymät">
            <button
              type="button"
              className={`tab-btn ${activeTab === 'jobs' && !editingJob ? 'active' : ''}`}
              onClick={() => {
                setEditingJob(null)
                setActiveTab('jobs')
              }}
            >
              <span className="tab-icon">📋</span>
              <span>Omat työpaikat</span>
              <span className="tab-badge">{jobs.length}</span>
            </button>

            <button
              type="button"
              className={`tab-btn ${activeTab === 'new' || editingJob ? 'active' : ''}`}
              onClick={() => setActiveTab('new')}
            >
              <span className="tab-icon">{editingJob ? '✏️' : '➕'}</span>
              <span>{editingJob ? 'Muokkaa työpaikkaa' : 'Uusi työpaikka'}</span>
            </button>

            <button
              type="button"
              className={`tab-btn ${activeTab === 'import' && !editingJob ? 'active' : ''}`}
              onClick={() => {
                setEditingJob(null)
                setActiveTab('import')
              }}
            >
              <span className="tab-icon">📥</span>
              <span>Tuo ilmoituksia (JSON)</span>
            </button>
          </nav>

          <div className="tab-content">
            {/* View 1: Job list and filters */}
            {activeTab === 'jobs' && !editingJob && (
              <section className="jobs-section" aria-labelledby="jobs-heading">
                <div className="list-header">
                  <div>
                    <h2 id="jobs-heading">
                      Työpaikat ({jobs.length})
                    </h2>
                    <p className="section-subtitle">
                      Klikkaa työpaikan riviä tai &quot;Avaa&quot;-painiketta tarkastellaksesi kaikkia tietoja.
                    </p>
                  </div>

                  <div className="header-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => refreshJobs()}
                      disabled={isBusy}
                    >
                      {isBusy ? 'Päivitetään…' : '🔄 Päivitä lista'}
                    </button>

                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => setActiveTab('new')}
                    >
                      ➕ Lisää työpaikka
                    </button>
                  </div>
                </div>

                <div className="job-filters-bar">
                  <div className="filter-item">
                    <label htmlFor="filter-status">Hakemuksen tila</label>
                    <select
                      id="filter-status"
                      value={filters.status}
                      onChange={(event) => refreshJobs({
                        ...filters,
                        status: event.target.value,
                      })}
                      disabled={isBusy}
                    >
                      <option value="">Kaikki tilat</option>
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-item">
                    <label htmlFor="filter-sort">Järjestys</label>
                    <select
                      id="filter-sort"
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
                  </div>
                </div>

                <JobList
                  jobs={jobs}
                  onEdit={startEditing}
                  onDelete={deleteJob}
                  isBusy={isBusy}
                />
              </section>
            )}

            {/* View 2: Job form for adding or editing */}
            {(activeTab === 'new' || editingJob) && (
              <div className="form-view-container">
                <div className="view-header">
                  <button
                    type="button"
                    className="btn-link"
                    onClick={cancelEditing}
                  >
                    ← Takaisin työpaikkalistaan
                  </button>
                </div>

                <JobForm
                  key={editingJob?.id ?? 'new'}
                  job={editingJob}
                  onSave={saveJob}
                  onCancel={cancelEditing}
                  isBusy={isBusy}
                />
              </div>
            )}

            {/* View 3: JSON Import */}
            {activeTab === 'import' && !editingJob && (
              <div className="import-view-container">
                <div className="view-header">
                  <button
                    type="button"
                    className="btn-link"
                    onClick={() => setActiveTab('jobs')}
                  >
                    ← Takaisin työpaikkalistaan
                  </button>
                </div>

                <JobImport
                  onPreview={previewImport}
                  onImport={importJobs}
                  isBusy={isBusy}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}