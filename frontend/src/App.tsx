import { useRef, useState, type FormEvent } from 'react'
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  Leaf,
  RotateCcw,
  Sparkles,
  ThumbsUp,
  Zap,
} from 'lucide-react'
import {
  createPlan,
  makeSmallerStep,
  type Energy,
  type Plan,
  type PlanStep,
} from './planner'

const timeOptions = [5, 15, 30, 60] as const
const energyOptions: { name: Energy; hint: string; icon: string }[] = [
  { name: 'Low', hint: 'Keep it gentle', icon: '☁' },
  { name: 'Medium', hint: 'Steady pace', icon: '◒' },
  { name: 'High', hint: 'Ready to go', icon: '↗' },
]

function App() {
  const [task, setTask] = useState('')
  const [availableMinutes, setAvailableMinutes] = useState<number>(15)
  const [energy, setEnergy] = useState<Energy>('Low')
  const [plan, setPlan] = useState<Plan | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [feedbackStepId, setFeedbackStepId] = useState<string | null>(null)
  const [variation, setVariation] = useState(0)
  const taskInput = useRef<HTMLTextAreaElement>(null)

  const completedCount = plan?.steps.filter((step) => step.done).length ?? 0
  const progress = plan ? Math.round((completedCount / plan.steps.length) * 100) : 0
  const remainingMinutes =
    plan?.steps.filter((step) => !step.done).reduce((total, step) => total + step.minutes, 0) ?? 0
  const nextStep = plan?.steps.find((step) => !step.done)

  function generatePlan(event?: FormEvent<HTMLFormElement>, nextVariation = 0) {
    event?.preventDefault()
    const cleanedTask = task.trim()
    if (!cleanedTask) {
      setError('Tell me one thing you’d like to work on, and we’ll make a gentle start.')
      setNotice('')
      taskInput.current?.focus()
      return
    }

    const nextPlan = createPlan({
      task: cleanedTask,
      availableMinutes,
      energy,
      variation: nextVariation,
    })
    setPlan(nextPlan)
    setVariation(nextVariation)
    setError('')
    setNotice('A fresh plan, picked just for the time and energy you have right now.')
    setFeedbackStepId(null)
  }

  function startAnotherPlan() {
    generatePlan(undefined, variation + 1)
  }

  function toggleStep(stepId: string) {
    setPlan((current) =>
      current
        ? {
            ...current,
            steps: current.steps.map((step) =>
              step.id === stepId ? { ...step, done: !step.done } : step,
            ),
          }
        : current,
    )
    setNotice('')
    setFeedbackStepId(null)
  }

  function adaptStep(targetStep: PlanStep, feedbackCount: number) {
    if (!plan) return
    const adaptation = makeSmallerStep({
      task: plan.task,
      remainingMinutes,
      energy,
      unfinishedSteps: plan.steps.filter((step) => !step.done),
      targetStepId: targetStep.id,
      feedbackCount,
    })
    if (!adaptation) return

    setPlan((current) =>
      current
        ? {
            ...current,
            feedbackCount,
            steps: current.steps.map((step) =>
              step.id === adaptation.step.id ? adaptation.step : step,
            ),
          }
        : current,
    )
    setNotice(adaptation.explanation)
    setFeedbackStepId(null)
  }

  function respondToFeedback(helped: boolean, step: PlanStep) {
    if (helped) {
      setPlan((current) =>
        current
          ? {
              ...current,
              steps: current.steps.map((item) =>
                item.id === step.id ? { ...item, done: true } : item,
              ),
            }
          : current,
      )
      setNotice('Glad it helped. That small action counts as progress.')
      setFeedbackStepId(null)
      return
    }

    adaptStep(step, (plan?.feedbackCount ?? 0) + 1)
  }

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setPlan(null); setNotice(''); setError('') }}>
          <span className="brand-mark" aria-hidden="true"><Leaf size={18} /></span>
          <span>TinyWins</span>
        </a>
        <span className="local-badge"><span className="local-dot" /> Private &amp; runs on this device</span>
      </header>

      <section className="hero">
        <div className="eyebrow"><Sparkles size={14} /> A LITTLE HELP GETTING STARTED</div>
        <h1>You don’t need to do<br className="desktop-break" /> everything<span>.</span></h1>
        <p>You don’t need to do everything. Just start somewhere.</p>
      </section>

      <div className="main-grid">
        <section className="input-card" aria-labelledby="task-heading">
          <div className="card-heading">
            <span className="heading-icon"><Sparkles size={18} /></span>
            <div>
              <h2 id="task-heading">What feels like a lot?</h2>
              <p>One task is enough. It doesn’t need to be perfectly described.</p>
            </div>
          </div>

          <form onSubmit={(event) => generatePlan(event)} noValidate>
            <label htmlFor="task-input">Your task</label>
            <textarea
              ref={taskInput}
              id="task-input"
              value={task}
              onChange={(event) => {
                setTask(event.target.value.slice(0, 500))
                if (error) setError('')
              }}
              placeholder="e.g. Study Java strings, prepare for an interview, tidy my desk…"
              maxLength={500}
              rows={3}
              aria-describedby={error ? 'task-error' : 'task-hint'}
            />
            {error ? (
              <p className="field-error" id="task-error" role="alert">{error}</p>
            ) : (
              <p className="field-hint" id="task-hint">Your words stay in this browser; no account needed.</p>
            )}

            <fieldset className="setting-group">
              <legend><Clock3 size={14} /> How much time do you have?</legend>
              <div className="time-options">
                {timeOptions.map((option) => (
                  <button
                    aria-pressed={availableMinutes === option}
                    className={`time-option ${availableMinutes === option ? 'selected' : ''}`}
                    key={option}
                    onClick={() => setAvailableMinutes(option)}
                    type="button"
                  >
                    {option}<span>min</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="setting-group energy-group">
              <legend><Zap size={14} /> What’s your energy like?</legend>
              <div className="energy-options">
                {energyOptions.map((option) => (
                  <button
                    aria-pressed={energy === option.name}
                    className={`energy-option ${energy === option.name ? 'selected' : ''}`}
                    key={option.name}
                    onClick={() => setEnergy(option.name)}
                    type="button"
                  >
                    <span className="energy-emoji" aria-hidden="true">{option.icon}</span>
                    <span className="energy-copy">{option.name}<small>{option.hint}</small></span>
                    {energy === option.name && <Check size={13} className="energy-check" />}
                  </button>
                ))}
              </div>
            </fieldset>

            <button className="primary-button" type="submit">
              <Sparkles size={16} /> Find my next steps <ArrowRight size={16} />
            </button>
          </form>
          <p className="gentle-note">No pressure to finish it all. One small win is enough.</p>
        </section>

        <section className={`plan-panel ${plan ? 'has-plan' : ''}`} aria-live="polite">
          {!plan ? (
            <div className="empty-state">
              <div className="empty-art" aria-hidden="true">
                <span className="art-sun" />
                <span className="art-leaf"><Leaf size={31} /></span>
                <span className="art-spark">✳</span>
              </div>
              <p className="empty-kicker">A softer place to begin</p>
              <h2>Your next small win<br />starts here.</h2>
              <p>Tell TinyWins what’s on your mind. We’ll turn it into a few doable actions that fit your time and energy.</p>
              <div className="empty-tip"><span>✦</span> Try “Study Java strings” or “Tidy my desk”</div>
            </div>
          ) : (
            <div className="plan-content">
              <div className="plan-header">
                <div className="eyebrow result-eyebrow"><span className="result-dot" /> YOUR SMALL-STEP PLAN</div>
                <h2>{plan.title}</h2>
                <p className="plan-reason">{plan.reason}</p>
              </div>

              <div className="progress-card">
                <div className="progress-copy">
                  <span className="progress-title">
                    {completedCount === plan.steps.length ? 'Lovely work — you did it!' : 'Your progress'}
                  </span>
                  <span>{completedCount} of {plan.steps.length} done</span>
                </div>
                <div
                  className="progress-track"
                  role="progressbar"
                  aria-label="Plan progress"
                  aria-valuemin={0}
                  aria-valuemax={plan.steps.length}
                  aria-valuenow={completedCount}
                >
                  <span style={{ width: `${progress}%` }} />
                </div>
                <span className="time-remaining">
                  <Clock3 size={13} /> {remainingMinutes} estimated plan min left
                  <span className="available-time">· {availableMinutes} min available</span>
                </span>
              </div>

              <ol className="step-list">
                {plan.steps.map((step, index) => (
                  <li className={`step-card ${step.done ? 'is-done' : ''}`} key={step.id}>
                    <label className="step-check" aria-label={`${step.done ? 'Mark incomplete' : 'Mark complete'}: ${step.title}`}>
                      <input
                        checked={step.done}
                        onChange={() => toggleStep(step.id)}
                        type="checkbox"
                      />
                      <span><Check size={14} /></span>
                    </label>
                    <div className="step-content">
                      <div className="step-topline">
                        <span className="step-count">STEP {String(index + 1).padStart(2, '0')}</span>
                        <span className="duration"><Clock3 size={12} /> {step.minutes} min</span>
                      </div>
                      <h3>{step.title}</h3>
                      <p>{step.explanation}</p>
                      {step.adapted && <span className="adapted-tag"><Sparkles size={11} /> Made smaller</span>}

                      {!step.done && feedbackStepId === step.id ? (
                        <div className="feedback-box">
                          <p>Did this next step help?</p>
                          <div>
                            <button className="feedback-yes" onClick={() => respondToFeedback(true, step)} type="button">
                              <ThumbsUp size={13} /> Yes
                            </button>
                            <button className="feedback-no" onClick={() => respondToFeedback(false, step)} type="button">
                              Not yet
                            </button>
                          </div>
                        </div>
                      ) : !step.done ? (
                        <div className="step-actions">
                          <button className="tried-button" onClick={() => { setFeedbackStepId(step.id); setNotice('') }} type="button">
                            I tried this step
                          </button>
                          <button className="easier-button" onClick={() => adaptStep(step, plan.feedbackCount)} type="button">
                            Make this easier
                          </button>
                        </div>
                      ) : (
                        <span className="complete-label"><CheckCircle2 size={13} /> Done — that counts.</span>
                      )}
                    </div>
                  </li>
                ))}
              </ol>

              {notice && (
                <div className="notice" role="status">
                  <Sparkles size={15} /><span>{notice}</span>
                </div>
              )}

              {completedCount === plan.steps.length ? (
                <div className="all-done">
                  <span className="done-icon"><CheckCircle2 size={21} /></span>
                  <div><strong>Every step is checked off.</strong><p>You made progress, at your own pace.</p></div>
                </div>
              ) : (
                <div className="stuck-card">
                  <span className="stuck-icon"><Leaf size={17} /></span>
                  <div className="stuck-copy">
                    <strong>Feeling stuck?</strong>
                    <p>We can make your next step even smaller.</p>
                  </div>
                  <button
                    className="stuck-button"
                    onClick={() => nextStep && adaptStep(nextStep, plan.feedbackCount)}
                    type="button"
                  >
                    I’m stuck <ArrowRight size={14} />
                  </button>
                </div>
              )}

              <button className="try-another-button" onClick={startAnotherPlan} type="button">
                <RotateCcw size={14} /> Try another plan
              </button>
            </div>
          )}
        </section>
      </div>

      <footer className="footer">
        <span className="footer-leaf"><Leaf size={13} /></span>
        TinyWins <span className="footer-separator">·</span> Simple steps, planned in your browser.
      </footer>
    </main>
  )
}

export default App
