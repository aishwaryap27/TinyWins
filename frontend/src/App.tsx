import { useState } from 'react'
import {
  ArrowDown,
  ArrowRight,
  Check,
  CheckCheck,
  Clock3,
  Copy,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  Sprout,
  WandSparkles,
  Zap,
} from 'lucide-react'

type Energy = 'Low' | 'Medium' | 'High'
type Step = { title: string; minutes: number; explanation: string }

const timeOptions = [10, 20, 30, 60, 120]
const energyOptions: { name: Energy; note: string; icon: string }[] = [
  { name: 'Low', note: 'Keep it gentle', icon: '☁' },
  { name: 'Medium', note: 'Steady pace', icon: '◒' },
  { name: 'High', note: 'Ready to go', icon: '↗' },
]

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      payload &&
      typeof payload === 'object' &&
      'detail' in payload &&
      typeof payload.detail === 'string'
        ? payload.detail
        : 'Something went wrong. Please try again in a moment.'
    throw new Error(message)
  }
  if (!payload) throw new Error('The server returned an empty response.')
  return payload as T
}

function App() {
  const [task, setTask] = useState('')
  const [minutes, setMinutes] = useState(20)
  const [energy, setEnergy] = useState<Energy>('Medium')
  const [steps, setSteps] = useState<Step[]>([])
  const [busy, setBusy] = useState(false)
  const [smallening, setSmallening] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  async function createPlan() {
    setBusy(true)
    setError('')
    setCopied(false)
    try {
      const result = await postJson<{ steps: Step[] }>('/api/plan', {
        task: task.trim(),
        available_minutes: minutes,
        energy,
      })
      setSteps(result.steps)
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'We couldn’t make your plan right now. Please try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function makeSmaller(index: number) {
    setSmallening(index)
    setError('')
    try {
      const result = await postJson<{ step: Step }>('/api/steps/smaller', {
        task: task.trim(),
        step: steps[index],
        energy,
      })
      setSteps((current) =>
        current.map((step, position) => (position === index ? result.step : step)),
      )
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'We couldn’t make that step smaller. Please try again.',
      )
    } finally {
      setSmallening(null)
    }
  }

  async function copyPlan() {
    const plan = `My next steps for: ${task.trim()}\n\n${steps
      .map((step, index) => `${index + 1}. ${step.title} (${step.minutes} min)\n   ${step.explanation}`)
      .join('\n\n')}`
    try {
      await navigator.clipboard.writeText(plan)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Clipboard access is unavailable. You can still select and copy your plan.')
    }
  }

  function resetPlan() {
    setSteps([])
    setError('')
    setCopied(false)
  }

  const canCreate = task.trim().length > 0 && !busy

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="TinyWins home" onClick={resetPlan}>
          <span className="brand-mark"><Sprout size={19} strokeWidth={2.4} /></span>
          <span>tinywins</span>
        </a>
        <div className="top-note"><span className="status-dot" /> a little help, right on time</div>
      </header>

      <section className="hero">
        <div className="eyebrow"><Sparkles size={14} /> YOUR GENTLE PRODUCTIVITY BUDDY</div>
        <h1>You don’t need to do<br className="desktop-break" /> everything<span className="period">.</span></h1>
        <p className="tagline">You don’t need to do everything. Just start somewhere.</p>
      </section>

      <div className="workspace">
        <section className="input-card" aria-labelledby="task-heading">
          <div className="card-heading">
            <div className="heading-icon"><WandSparkles size={19} /></div>
            <div>
              <h2 id="task-heading">What’s on your mind?</h2>
              <p>Big, messy, or not quite figured out yet — it all belongs here.</p>
            </div>
          </div>

          <label className="sr-only" htmlFor="task-input">Describe the task you want to work on</label>
          <textarea
            id="task-input"
            value={task}
            onChange={(event) => setTask(event.target.value.slice(0, 2000))}
            placeholder="e.g. I need to prepare for my biology exam next week…"
            maxLength={2000}
            rows={3}
          />
          <div className="field-meta"><span>Start with whatever’s in your head.</span><span>{task.length}/2000</span></div>

          <div className="settings-grid">
            <fieldset className="setting-group">
              <legend><Clock3 size={15} /> How much time do you have?</legend>
              <div className="time-options">
                {timeOptions.map((option) => (
                  <button
                    className={`time-option ${minutes === option ? 'selected' : ''}`}
                    key={option}
                    onClick={() => setMinutes(option)}
                    type="button"
                    aria-pressed={minutes === option}
                  >
                    {option}<span>min</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="setting-group">
              <legend><Zap size={15} /> What’s your energy like?</legend>
              <div className="energy-options">
                {energyOptions.map((option) => (
                  <button
                    className={`energy-option ${energy === option.name ? 'selected' : ''}`}
                    key={option.name}
                    onClick={() => setEnergy(option.name)}
                    type="button"
                    aria-pressed={energy === option.name}
                  >
                    <span className="energy-emoji" aria-hidden="true">{option.icon}</span>
                    <span className="energy-label">{option.name}<small>{option.note}</small></span>
                    {energy === option.name && <Check size={14} className="energy-check" />}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <button className="primary-button" onClick={createPlan} disabled={!canCreate} type="button">
            {busy ? <LoaderCircle className="spin" size={18} /> : <Sparkles size={17} />}
            {busy ? 'Finding your next steps…' : 'Find my next steps'}
            {!busy && <ArrowRight size={17} className="button-arrow" />}
          </button>
          <p className="privacy-note">No pressure, no perfect plans. Just a place to begin.</p>
        </section>

        {error && <div className="error-message" role="alert"><span>Oh, a little hiccup.</span> {error}</div>}

        {steps.length > 0 ? (
          <section className="results" aria-live="polite">
            <div className="results-heading">
              <div>
                <div className="eyebrow result-eyebrow"><span className="result-dot" /> YOUR NEXT THREE STEPS</div>
                <h2>Small steps. Real progress.</h2>
                <p>That’s all you need to think about right now.</p>
              </div>
              <div className="result-actions">
                <button className="quiet-button" onClick={copyPlan} type="button">
                  {copied ? <CheckCheck size={15} /> : <Copy size={15} />}{copied ? 'Copied!' : 'Copy plan'}
                </button>
                <button className="quiet-button" onClick={createPlan} disabled={busy} type="button">
                  <RefreshCw size={15} /> Try again
                </button>
              </div>
            </div>
            <div className="step-list">
              {steps.map((step, index) => (
                <article className="step-card" key={`${index}-${step.title}`}>
                  <div className="step-number">{String(index + 1).padStart(2, '0')}</div>
                  <div className="step-content">
                    <h3>{step.title}</h3>
                    <p>{step.explanation}</p>
                    <div className="step-footer">
                      <span className="duration"><Clock3 size={13} /> about {step.minutes} min</span>
                      <button
                        className="smaller-button"
                        disabled={smallening !== null}
                        onClick={() => makeSmaller(index)}
                        type="button"
                      >
                        {smallening === index ? <LoaderCircle className="spin" size={14} /> : <ArrowDown size={14} />}
                        {smallening === index ? 'Making it smaller…' : 'Make it smaller'}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            <div className="gentle-reminder"><span>✳</span> You’re allowed to do just one of these. That still counts.</div>
          </section>
        ) : (
          <div className="empty-note"><span className="empty-spark">✳</span><span>Your next small win is just around the corner.</span></div>
        )}
      </div>
      <footer className="footer">Made for the days when everything feels like a lot <span>·</span> one little win at a time</footer>
    </main>
  )
}

export default App
