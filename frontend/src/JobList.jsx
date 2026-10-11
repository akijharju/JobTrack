import { statusLabels, priorityLabels, matchLevelLabels } from './jobLabels'

// Show the jobs and let the parent handle editing and deletion.
export default function JobList({ jobs, onEdit, onDelete, isBusy }) {
  // An empty result may mean that no jobs match the selected status.
  if (jobs.length === 0) {
    return <p>Ei työpaikkoja näillä valinnoilla.</p>
  }

  return (
    <div className="table-wrap">
      <table>
        <caption>Omat työpaikat</caption>

        <thead>
          <tr>
            <th scope="col">Yritys</th>
            <th scope="col">Tehtävä</th>
            <th scope="col">Tila</th>
            <th scope="col">Prioriteetti</th>
            <th scope="col">Sopivuus</th>
            <th scope="col">Hakuaika</th>
            <th scope="col">Toiminnot</th>
          </tr>
        </thead>

        <tbody>
          {jobs.map((job) => {
            // Format the date as text so timezones cannot change the day.
            const deadline = job.deadline
              ? job.deadline.split('-').reverse().join('.')
              : '—'

            return (
              // The database ID helps React identify each row after changes.
              <tr key={job.id}>
                <td>{job.company}</td>

                <td>
                  {/* Show a link only when the job has a saved address. */}
                  {job.url ? (
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {job.title}
                    </a>
                  ) : (
                    job.title
                  )}
                </td>

                {/* Translate API values into Finnish display labels. */}
                <td>{statusLabels[job.status]}</td>
                <td>{priorityLabels[job.priority]}</td>
                {/* A missing match level means that the job has not been assessed. */}
                <td>{matchLevelLabels[job.match_level ?? '']}</td>
                <td>{deadline}</td>

                <td>
                  <div className="row-actions">
                    {/* Pass the selected job to the parent's edit handler. */}
                    <button
                      type="button"
                      onClick={() => onEdit(job)}
                      disabled={isBusy}
                    >
                      Muokkaa
                    </button>

                    {/* The parent asks for confirmation before deletion. */}
                    <button
                      type="button"
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
  )
}
