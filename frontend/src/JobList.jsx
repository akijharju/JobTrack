import { useState, useEffect } from 'react'
import { statusLabels, priorityLabels, matchLevelLabels } from './jobLabels'

export default function JobList({ jobs, onEdit, onDelete, isBusy }) {
  // Store the job currently opened in the detail modal.
  const [activeJob, setActiveJob] = useState(null)

  // Close modal with the Escape key.
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setActiveJob(null)
      }
    }
    if (activeJob) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [activeJob])

  if (jobs.length === 0) {
    return (
      <div className="empty-state">
        <p>Ei työpaikkoja näillä valinnoilla.</p>
      </div>
    )
  }

  return (
    <>
      <div className="table-wrap">
        <table className="jobs-table">
          <caption>Omat työpaikat – klikkaa riviä nähdäksesi kaikki tiedot</caption>

          <thead>
            <tr>
              <th scope="col" className="col-company">Yritys</th>
              <th scope="col" className="col-title">Tehtävä</th>
              <th scope="col" className="col-badge">Tila</th>
              <th scope="col" className="col-badge">Prioriteetti</th>
              <th scope="col" className="col-badge">Sopivuus</th>
              <th scope="col" className="col-deadline">Hakuaika</th>
              <th scope="col" className="col-actions">Toiminnot</th>
            </tr>
          </thead>

          <tbody>
            {jobs.map((job) => {
              const deadline = job.deadline
                ? job.deadline.split('-').reverse().join('.')
                : '—'

              return (
                <tr
                  key={job.id}
                  className="job-row"
                  onClick={() => setActiveJob(job)}
                  title="Klikkaa avataksesi työpaikan tiedot"
                >
                  <td className="company-cell">
                    <strong>{job.company}</strong>
                  </td>

                  <td className="title-cell">
                    {job.title}
                  </td>

                  <td className="badge-cell">
                    <span className={`badge badge-status-${job.status}`}>
                      {statusLabels[job.status]}
                    </span>
                  </td>

                  <td className="badge-cell">
                    <span className={`badge badge-priority-${job.priority}`}>
                      {priorityLabels[job.priority]}
                    </span>
                  </td>

                  <td className="badge-cell">
                    {job.match_level ? (
                      <span className={`badge badge-match-${job.match_level}`}>
                        {matchLevelLabels[job.match_level]}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>

                  <td className="deadline-cell">{deadline}</td>

                  <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                    <div className="row-actions">
                      <button
                        type="button"
                        className="btn-sm btn-info"
                        onClick={() => setActiveJob(job)}
                        title="Näytä kaikki tiedot"
                      >
                        Avaa
                      </button>

                      <button
                        type="button"
                        className="btn-sm btn-secondary"
                        onClick={() => onEdit(job)}
                        disabled={isBusy}
                      >
                        Muokkaa
                      </button>

                      <button
                        type="button"
                        className="btn-sm btn-danger"
                        onClick={() => onDelete(job)}
                        disabled={isBusy}
                      >
                        Poista
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Detail Modal for viewing full job data without opening editing mode */}
      {activeJob && (
        <div
          className="modal-backdrop"
          onClick={() => setActiveJob(null)}
          role="presentation"
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="modal-header">
              <div>
                <span className="modal-company">{activeJob.company}</span>
                <h3 id="modal-title" className="modal-title">
                  {activeJob.title}
                </h3>
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setActiveJob(null)}
                aria-label="Sulje"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-badges">
                <span className={`badge badge-status-${activeJob.status}`}>
                  {statusLabels[activeJob.status]}
                </span>
                <span className={`badge badge-priority-${activeJob.priority}`}>
                  {priorityLabels[activeJob.priority]} prioriteetti
                </span>
                {activeJob.match_level && (
                  <span className={`badge badge-match-${activeJob.match_level}`}>
                    {matchLevelLabels[activeJob.match_level]}
                  </span>
                )}
              </div>

              <dl className="modal-meta">
                <div>
                  <dt>Sijainti</dt>
                  <dd>{activeJob.location || '—'}</dd>
                </div>

                <div>
                  <dt>Hakuaika päättyy</dt>
                  <dd>
                    {activeJob.deadline
                      ? activeJob.deadline.split('-').reverse().join('.')
                      : '—'}
                  </dd>
                </div>

                {activeJob.url && (
                  <div className="full-width-meta">
                    <dt>Ilmoituksen verkko-osoite</dt>
                    <dd>
                      <a
                        href={activeJob.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="external-link"
                      >
                        Avaa ilmoitus uuteen välilehteen ↗
                      </a>
                    </dd>
                  </div>
                )}
              </dl>

              {activeJob.notes && (
                <div className="modal-notes-section">
                  <h4>Omat muistiinpanot</h4>
                  <p className="modal-notes-text">{activeJob.notes}</p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  const jobToEdit = activeJob
                  setActiveJob(null)
                  onEdit(jobToEdit)
                }}
                disabled={isBusy}
              >
                ✏️ Muokkaa tietoja
              </button>

              <button
                type="button"
                className="btn-danger"
                onClick={() => {
                  const jobToDelete = activeJob
                  setActiveJob(null)
                  onDelete(jobToDelete)
                }}
                disabled={isBusy}
              >
                🗑️ Poista työpaikka
              </button>

              <button
                type="button"
                className="btn-primary"
                onClick={() => setActiveJob(null)}
              >
                Sulje
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
